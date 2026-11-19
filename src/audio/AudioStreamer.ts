const TARGET_INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

const WORKLET_PROCESSOR_CODE = `
class PcmInputProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0] && input[0].length > 0) {
      this.port.postMessage(new Float32Array(input[0]));
    }
    return true;
  }
}
registerProcessor("pcm-input-processor", PcmInputProcessor);
`;

function downsampleLinear(
  buffer: Float32Array,
  fromRate: number,
  toRate: number
): Float32Array {
  if (fromRate === toRate || fromRate <= 0) {
    return buffer;
  }
  const ratio = fromRate / toRate;
  const outputLength = Math.max(1, Math.round(buffer.length / ratio));
  const result = new Float32Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    const position = i * ratio;
    const index = Math.floor(position);
    const frac = position - index;
    const nextIndex = Math.min(index + 1, buffer.length - 1);
    result[i] = buffer[index] * (1 - frac) + buffer[nextIndex] * frac;
  }
  return result;
}

function float32ToPcm16Base64(float32: Float32Array): string {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

function base64Pcm16ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const sampleCount = Math.floor(bytes.byteLength / 2);
  const float32 = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    float32[i] = view.getInt16(i * 2, true) / 32768;
  }
  return float32;
}

export interface AudioStreamerCallbacks {
  onAudioChunk: (base64Pcm16: string) => void;
  onPlaybackDrain?: () => void;
  onError?: (error: Error) => void;
}

export class AudioStreamer {
  private inputCtx: AudioContext | null = null;
  private outputCtx: AudioContext | null = null;
  private inputAnalyser: AnalyserNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  private outputGainNode: GainNode | null = null;
  private keepAliveOsc: OscillatorNode | null = null;
  private keepAliveGain: GainNode | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private scriptProcessorNode: ScriptProcessorNode | null = null;
  private silentGainNode: GainNode | null = null;
  private activeSources = new Set<AudioBufferSourceNode>();
  private nextStartTime = 0;
  private outputVolume = 1;
  private muted = false;
  private capturing = false;
  private pendingBuffer: Float32Array[] = [];
  private pendingSampleCount = 0;
  private callbacks: AudioStreamerCallbacks;

  constructor(callbacks: AudioStreamerCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Unlocks/initializes AudioContexts synchronously within a user gesture
   * so mobile Safari and Chrome allow immediate 24kHz audio playback.
   */
  public async preparePlayback(): Promise<void> {
    if (!this.outputCtx || this.outputCtx.state === "closed") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.outputCtx = new AudioCtx({ sampleRate: OUTPUT_SAMPLE_RATE });
      this.outputAnalyser = this.outputCtx.createAnalyser();
      this.outputAnalyser.fftSize = 128;
      this.outputAnalyser.smoothingTimeConstant = 0.78;
      this.outputGainNode = this.outputCtx.createGain();
      this.outputGainNode.gain.value = this.outputVolume;
      this.outputAnalyser.connect(this.outputGainNode);
      this.outputGainNode.connect(this.outputCtx.destination);
      this.startBackgroundKeepAlive();
    }
    if (this.outputCtx.state === "suspended") {
      await this.outputCtx.resume();
    }
  }

  private startBackgroundKeepAlive(): void {
    if (!this.outputCtx || this.keepAliveOsc) return;
    try {
      const osc = this.outputCtx.createOscillator();
      const gain = this.outputCtx.createGain();
      osc.frequency.value = 1;
      gain.gain.value = 0.00001;
      osc.connect(gain);
      gain.connect(this.outputCtx.destination);
      osc.start();
      this.keepAliveOsc = osc;
      this.keepAliveGain = gain;
    } catch {
      // Ignore if AudioContext cannot start background oscillator
    }
  }

  public setMediaSessionMeta(
    title: string,
    artist: string,
    onStop?: () => void
  ): void {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist,
        album: "Saifix AI Live",
        artwork: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
        ],
      });
      navigator.mediaSession.playbackState = "playing";
      navigator.mediaSession.setActionHandler("play", () => {
        void this.preparePlayback();
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        this.interrupt();
      });
      if (onStop) {
        navigator.mediaSession.setActionHandler("stop", onStop);
      }
    } catch {
      // Ignore browsers without full MediaSession support
    }
  }

  public async startCapture(): Promise<void> {
    if (this.capturing) return;
    await this.preparePlayback();

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });

    this.inputCtx = new AudioCtx({ sampleRate: TARGET_INPUT_SAMPLE_RATE });
    if (this.inputCtx.state === "suspended") {
      await this.inputCtx.resume();
    }

    this.sourceNode = this.inputCtx.createMediaStreamSource(this.mediaStream);
    this.inputAnalyser = this.inputCtx.createAnalyser();
    this.inputAnalyser.fftSize = 128;
    this.inputAnalyser.smoothingTimeConstant = 0.78;

    this.silentGainNode = this.inputCtx.createGain();
    this.silentGainNode.gain.value = 0;

    this.sourceNode.connect(this.inputAnalyser);

    const handleRawFloatFrame = (rawSamples: Float32Array) => {
      if (!this.capturing || this.muted || !this.inputCtx) return;

      const resampled = downsampleLinear(
        rawSamples,
        this.inputCtx.sampleRate,
        TARGET_INPUT_SAMPLE_RATE
      );

      this.pendingBuffer.push(resampled);
      this.pendingSampleCount += resampled.length;

      // Flush roughly every ~80ms (1280 samples @ 16kHz) for snappy low-latency streaming
      if (this.pendingSampleCount >= 1280) {
        const merged = new Float32Array(this.pendingSampleCount);
        let offset = 0;
        for (const chunk of this.pendingBuffer) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }
        this.pendingBuffer = [];
        this.pendingSampleCount = 0;
        const base64 = float32ToPcm16Base64(merged);
        this.callbacks.onAudioChunk(base64);
      }
    };

    this.capturing = true;

    if (typeof this.inputCtx.audioWorklet !== "undefined") {
      try {
        const blob = new Blob([WORKLET_PROCESSOR_CODE], {
          type: "application/javascript",
        });
        const workletUrl = URL.createObjectURL(blob);
        try {
          await this.inputCtx.audioWorklet.addModule(workletUrl);
        } finally {
          URL.revokeObjectURL(workletUrl);
        }

        if (!this.capturing || !this.inputCtx || !this.sourceNode) return;

        this.workletNode = new AudioWorkletNode(
          this.inputCtx,
          "pcm-input-processor"
        );
        this.workletNode.port.onmessage = (event: MessageEvent<Float32Array>) => {
          handleRawFloatFrame(event.data);
        };
        this.sourceNode.connect(this.workletNode);
        this.workletNode.connect(this.silentGainNode);
        this.silentGainNode.connect(this.inputCtx.destination);
        return;
      } catch {
        // Fall through cleanly to ScriptProcessorNode if AudioWorklet fails
      }
    }

    const processor = this.inputCtx.createScriptProcessor(2048, 1, 1);
    processor.onaudioprocess = (event) => {
      handleRawFloatFrame(new Float32Array(event.inputBuffer.getChannelData(0)));
    };
    this.scriptProcessorNode = processor;
    this.sourceNode.connect(processor);
    processor.connect(this.silentGainNode);
    this.silentGainNode.connect(this.inputCtx.destination);
  }

  public enqueuePcm24k(base64Pcm16: string): void {
    if (!this.outputCtx || !this.outputAnalyser) return;
    if (this.outputCtx.state === "suspended") {
      void this.outputCtx.resume();
    }

    const float32 = base64Pcm16ToFloat32(base64Pcm16);
    if (float32.length === 0) return;

    const buffer = this.outputCtx.createBuffer(
      1,
      float32.length,
      OUTPUT_SAMPLE_RATE
    );
    buffer.getChannelData(0).set(float32);

    const source = this.outputCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.outputAnalyser);

    const now = this.outputCtx.currentTime;
    if (this.nextStartTime < now) {
      this.nextStartTime = now + 0.02;
    }

    const startAt = this.nextStartTime;
    this.nextStartTime = startAt + buffer.duration;

    this.activeSources.add(source);
    source.onended = () => {
      this.activeSources.delete(source);
      if (this.activeSources.size === 0) {
        this.nextStartTime = 0;
        this.callbacks.onPlaybackDrain?.();
      }
    };

    source.start(startAt);
  }

  public interrupt(): void {
    for (const source of this.activeSources) {
      try {
        source.onended = null;
        source.stop();
        source.disconnect();
      } catch {
        // Ignore already stopped nodes
      }
    }
    this.activeSources.clear();
    this.nextStartTime = 0;
  }

  public isPlaying(): boolean {
    return this.activeSources.size > 0;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.mediaStream) {
      for (const track of this.mediaStream.getAudioTracks()) {
        track.enabled = !muted;
      }
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setVolume(level01: number): number {
    const clamped = Math.max(0, Math.min(1, level01));
    this.outputVolume = clamped;
    if (this.outputGainNode && this.outputCtx) {
      this.outputGainNode.gain.setTargetAtTime(
        clamped,
        this.outputCtx.currentTime,
        0.04
      );
    }
    return clamped;
  }

  public getVolume(): number {
    return this.outputVolume;
  }

  public async playChime(): Promise<void> {
    await this.preparePlayback();
    if (!this.outputCtx || !this.outputGainNode) return;
    const now = this.outputCtx.currentTime;
    const freqs = [587.33, 880];
    freqs.forEach((freq, idx) => {
      if (!this.outputCtx || !this.outputGainNode) return;
      const osc = this.outputCtx.createOscillator();
      const gain = this.outputCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + idx * 0.14;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.connect(gain);
      gain.connect(this.outputGainNode);
      osc.start(start);
      osc.stop(start + 0.38);
    });
  }

  /**
   * Samples live frequency spectrum into `bins` and returns normalized energy [0..1].
   */
  public sampleSpectrum(
    bins: Uint8Array<ArrayBuffer>,
    mode: "input" | "output"
  ): number {
    const analyser =
      mode === "output" ? this.outputAnalyser : this.inputAnalyser;
    if (!analyser || (mode === "input" && this.muted)) {
      bins.fill(0);
      return 0;
    }

    analyser.getByteFrequencyData(bins);
    let sum = 0;
    const count = Math.min(bins.length, 32);
    for (let i = 0; i < count; i++) {
      sum += bins[i];
    }
    return Math.min(1, sum / (count * 180));
  }

  /**
   * Extracts instantaneous RMS speech envelope + low/mid/high formant bands
   * from 24kHz output audio so lip sync snaps cleanly on syllables and closes during pauses.
   */
  public sampleLipSyncParams(
    freqBins: Uint8Array<ArrayBuffer>,
    timeBins?: Uint8Array<ArrayBuffer>
  ): {
    total: number;
    jaw: number;
    width: number;
    high: number;
  } {
    if (!this.outputAnalyser) {
      return { total: 0, jaw: 0, width: 0, high: 0 };
    }
    this.outputAnalyser.getByteFrequencyData(freqBins);

    // Instantaneous time-domain RMS for crisp syllable attack & closure
    let rms = 0;
    if (timeBins) {
      this.outputAnalyser.getByteTimeDomainData(timeBins);
      let sumSq = 0;
      for (let i = 0; i < timeBins.length; i++) {
        const centered = (timeBins[i] - 128) / 128;
        sumSq += centered * centered;
      }
      rms = Math.sqrt(sumSq / timeBins.length);
    }

    // At 24kHz & fftSize 128, each bin is ~187.5 Hz
    const low = (freqBins[1] + freqBins[2] + freqBins[3]) / (3 * 255);
    const mid =
      (freqBins[4] +
        freqBins[5] +
        freqBins[6] +
        freqBins[7] +
        freqBins[8] +
        freqBins[9]) /
      (6 * 255);
    const high =
      (freqBins[10] +
        freqBins[11] +
        freqBins[12] +
        freqBins[13] +
        freqBins[14] +
        freqBins[15]) /
      (6 * 255);

    const rawLevel = timeBins ? Math.max(rms * 2.6, low * 0.5 + mid * 0.45) : low * 0.55 + mid * 0.45;
    // Noise gate so mouth closes cleanly during pauses
    const gated = rawLevel < 0.045 ? 0 : Math.min(1, (rawLevel - 0.045) / 0.55);

    const jaw = Math.min(1, Math.pow(gated, 0.78));
    const width = gated === 0 ? 0 : Math.max(-0.5, Math.min(1, (mid - low * 0.55) * 1.4));
    const highBand = Math.min(1, high * 1.4);

    return { total: gated, jaw, width, high: highBand };
  }

  public async stopAll(): Promise<void> {
    this.capturing = false;
    this.pendingBuffer = [];
    this.pendingSampleCount = 0;
    this.interrupt();

    try {
      this.workletNode?.port.close();
      this.workletNode?.disconnect();
    } catch {
      // Ignore
    }
    this.workletNode = null;

    try {
      this.scriptProcessorNode?.disconnect();
    } catch {
      // Ignore
    }
    this.scriptProcessorNode = null;

    try {
      this.sourceNode?.disconnect();
      this.inputAnalyser?.disconnect();
      this.silentGainNode?.disconnect();
    } catch {
      // Ignore
    }
    this.sourceNode = null;
    this.inputAnalyser = null;
    this.silentGainNode = null;

    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) {
        track.stop();
      }
      this.mediaStream = null;
    }

    if (this.inputCtx) {
      try {
        await this.inputCtx.close();
      } catch {
        // Ignore
      }
      this.inputCtx = null;
    }

    if (this.keepAliveOsc) {
      try {
        this.keepAliveOsc.stop();
        this.keepAliveOsc.disconnect();
        this.keepAliveGain?.disconnect();
      } catch {
        // Ignore
      }
      this.keepAliveOsc = null;
      this.keepAliveGain = null;
    }

    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      try {
        navigator.mediaSession.playbackState = "none";
      } catch {
        // Ignore
      }
    }

    if (this.outputCtx) {
      try {
        this.outputGainNode?.disconnect();
        await this.outputCtx.close();
      } catch {
        // Ignore
      }
      this.outputCtx = null;
      this.outputAnalyser = null;
      this.outputGainNode = null;
    }
  }
}
