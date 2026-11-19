import type { CameraFacing } from "../types/voice";

export class CameraStreamer {
  private stream: MediaStream | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private intervalId: number | null = null;
  private facing: CameraFacing = "user";
  private onFrame: (base64Jpeg: string) => void;

  constructor(onFrame: (base64Jpeg: string) => void) {
    this.onFrame = onFrame;
  }

  public getFacing(): CameraFacing {
    return this.facing;
  }

  public getStream(): MediaStream | null {
    return this.stream;
  }

  public async start(facing: CameraFacing = this.facing): Promise<MediaStream> {
    this.stop();
    this.facing = facing;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: facing },
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
      audio: false,
    });

    this.stream = stream;

    const video = document.createElement("video");
    video.playsInline = true;
    video.muted = true;
    video.srcObject = stream;
    await video.play().catch(() => {
      // Video element will also attach in preview component
    });
    this.videoEl = video;

    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
    }

    // Stream at 1 FPS per Gemini Live API guidelines
    this.intervalId = window.setInterval(() => {
      this.captureAndEmitFrame();
    }, 1000);

    return stream;
  }

  private captureAndEmitFrame(): void {
    const video = this.videoEl;
    const canvas = this.canvas;
    if (!video || !canvas || video.readyState < 2) return;

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    const maxDim = 480;
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

  public async flip(): Promise<MediaStream> {
    const nextFacing: CameraFacing =
      this.facing === "user" ? "environment" : "user";
    return this.start(nextFacing);
  }

  public async setTorch(
    enabled: boolean
  ): Promise<{ ok: boolean; error?: string }> {
    const track = this.stream?.getVideoTracks()[0];
    if (!track) {
      return {
        ok: false,
        error: "Rear camera must be open first to use the flashlight.",
      };
    }

    const caps =
      typeof track.getCapabilities === "function"
        ? (track.getCapabilities() as MediaTrackCapabilities & {
            torch?: boolean;
          })
        : null;

    if (caps && caps.torch === false) {
      return {
        ok: false,
        error: "This camera lens or browser does not support flashlight control.",
      };
    }

    try {
      await track.applyConstraints({
        advanced: [{ torch: enabled } as MediaTrackConstraintSet],
      });
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: "Flashlight torch is not supported on this device or browser.",
      };
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
        track.stop();
      }
      this.stream = null;
    }
  }
}
