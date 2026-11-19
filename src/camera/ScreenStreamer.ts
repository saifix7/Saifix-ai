export class ScreenStreamer {
  private stream: MediaStream | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private intervalId: number | null = null;
  private onFrame: (base64Jpeg: string) => void;
  private onEnded?: () => void;

  constructor(
    onFrame: (base64Jpeg: string) => void,
    onEnded?: () => void
  ) {
    this.onFrame = onFrame;
    this.onEnded = onEnded;
  }

  public getStream(): MediaStream | null {
    return this.stream;
  }

  public isActive(): boolean {
    return this.stream !== null;
  }

  public async start(): Promise<MediaStream> {
    this.stop();

    if (
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getDisplayMedia !== "function"
    ) {
      throw new Error(
        "Screen sharing is not supported in this browser. Use the Android APK or desktop/Android Chrome."
      );
    }

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        frameRate: { ideal: 2, max: 5 },
      },
      audio: false,
    });

    this.stream = stream;

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.onended = () => {
        this.stop();
        this.onEnded?.();
      };
    }

    const video = document.createElement("video");
    video.playsInline = true;
    video.muted = true;
    video.srcObject = stream;
    await video.play().catch(() => {
      // Ignore autoplay promise rejection; track renders when ready
    });
    this.videoEl = video;

    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
    }

    // Stream screen frames at 1 FPS per Gemini Live API guidelines
    this.intervalId = window.setInterval(() => {
      this.captureAndEmitFrame();
    }, 1000);

    return stream;
  }

  private captureAndEmitFrame(): void {
    const video = this.videoEl;
    const canvas = this.canvas;
    if (!video || !canvas || video.readyState < 2) return;

    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    const maxDim = 768;
    const scale = Math.min(1, maxDim / Math.max(vw, vh));

    canvas.width = Math.max(1, Math.round(vw * scale));
    canvas.height = Math.max(1, Math.round(vh * scale));

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
    const commaIdx = dataUrl.indexOf(",");
    if (commaIdx !== -1) {
      this.onFrame(dataUrl.slice(commaIdx + 1));
    }
  }

  public stop(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.videoEl) {
      this.videoEl.pause();
      this.videoEl.srcObject = null;
      this.videoEl = null;
    }
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.onended = null;
        track.stop();
      }
      this.stream = null;
    }
  }
}
