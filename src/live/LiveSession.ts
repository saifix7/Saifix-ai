import { AudioStreamer } from "../audio/AudioStreamer";
import { executeBrowserTool } from "../tools/browserTools";
import type {
  AvatarId,
  AvatarMood,
  AvatarOutfit,
  BrowserActionNotification,
  CameraControlAction,
  CameraFacing,
  LiveSessionConfig,
  MoodTheme,
  ServerSocketMessage,
  SessionState,
} from "../types/voice";

export interface LiveSessionCallbacks {
  getConfig: () => LiveSessionConfig;
  onStateChange: (state: SessionState) => void;
  onMutedChange: (muted: boolean) => void;
  onError: (message: string | null) => void;
  onActionNotify: (action: BrowserActionNotification) => void;
  onThemeChange: (theme: MoodTheme) => void;
  onMoodChange?: (mood: AvatarMood) => void;
  onOutfitChange?: (outfit: AvatarOutfit) => void;
  onAvatarChange?: (avatar: AvatarId) => void;
  onWaveHand?: () => void;
  onCameraControl?: (
    action: CameraControlAction,
    facing?: CameraFacing
  ) => Promise<{ ok: boolean; facing?: CameraFacing; error?: string }>;
  onTorchToggle?: (
    enabled: boolean
  ) => Promise<{ ok: boolean; error?: string }>;
  onWakeLockChange?: (
    enabled: boolean
  ) => Promise<{ ok: boolean; error?: string }>;
  onScheduleTimer?: (seconds: number, label: string) => void;
  onScreenShareToggle?: (
    enabled: boolean
  ) => Promise<{ ok: boolean; error?: string }>;
}

export class LiveSession {
  private ws: WebSocket | null = null;
  private audioStreamer: AudioStreamer;
  private state: SessionState = "disconnected";
  private ready = false;
  private turnCompletePending = true;
  private callbacks: LiveSessionCallbacks;

  constructor(callbacks: LiveSessionCallbacks) {
    this.callbacks = callbacks;
    this.audioStreamer = new AudioStreamer({
      onAudioChunk: (base64Pcm16) => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN && this.ready) {
          this.ws.send(JSON.stringify({ type: "audio", data: base64Pcm16 }));
        }
      },
      onPlaybackDrain: () => {
        if (
          this.state === "speaking" &&
          this.turnCompletePending &&
          this.ready
        ) {
          this.setState("listening");
        }
      },
      onError: (err) => {
        this.callbacks.onError(err.message);
      },
    });
  }

  public getState(): SessionState {
    return this.state;
  }

  public getAudioStreamer(): AudioStreamer {
    return this.audioStreamer;
  }

  public isMuted(): boolean {
    return this.audioStreamer.isMuted();
  }

  public toggleMute(): boolean {
    const nextMuted = !this.audioStreamer.isMuted();
    this.audioStreamer.setMuted(nextMuted);
    this.callbacks.onMutedChange(nextMuted);
    return nextMuted;
  }

  public setMuted(muted: boolean): void {
    this.audioStreamer.setMuted(muted);
    this.callbacks.onMutedChange(muted);
  }

  public sendVideoFrame(base64Jpeg: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.ready) {
      this.ws.send(JSON.stringify({ type: "video", data: base64Jpeg }));
    }
  }

  public sendEventText(text: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.ready) {
      this.ws.send(JSON.stringify({ type: "event", text }));
    }
  }

  private setState(next: SessionState): void {
    if (this.state !== next) {
      this.state = next;
      this.callbacks.onStateChange(next);
    }
  }

  public async connect(): Promise<void> {
    if (this.state !== "disconnected") return;

    this.callbacks.onError(null);
    this.ready = false;
    this.turnCompletePending = true;
    this.audioStreamer.setMuted(false);
    this.callbacks.onMutedChange(false);
    this.setState("connecting");

    try {
      await this.audioStreamer.preparePlayback();

      const cfg = this.callbacks.getConfig();
      const params = new URLSearchParams({
        voice: cfg.voiceName,
        gender: cfg.personaGender,
        mood: cfg.moodPreset,
        avatar: cfg.avatarId,
      });

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/live?${params.toString()}`;
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      const wsOpenPromise = new Promise<void>((resolve, reject) => {
        const handleOpen = () => {
          ws.removeEventListener("error", handleFail);
          resolve();
        };
        const handleFail = () => {
          ws.removeEventListener("open", handleOpen);
          reject(new Error("Could not connect to the voice server."));
        };
        ws.addEventListener("open", handleOpen, { once: true });
        ws.addEventListener("error", handleFail, { once: true });
      });

      ws.onmessage = (event) => {
        this.handleServerMessage(event.data);
      };

      ws.onclose = () => {
        if (this.ws === ws) {
          void this.cleanupInternal();
        }
      };

      ws.onerror = () => {
        if (this.state === "connecting") {
          this.callbacks.onError("Voice connection dropped. Please try again.");
        }
      };

      await Promise.all([wsOpenPromise, this.audioStreamer.startCapture()]);
    } catch (err: unknown) {
      const rawMessage =
        err instanceof Error ? err.message : "Failed to start voice session.";
      const friendlyMessage =
        rawMessage.toLowerCase().includes("permission") ||
        rawMessage.toLowerCase().includes("notallowed")
          ? "Microphone access was denied. Enable mic permissions to start the call."
          : rawMessage;
      this.callbacks.onError(friendlyMessage);
      await this.disconnect();
    }
  }

  public async reconnectWithConfig(): Promise<void> {
    if (this.state === "disconnected") return;
    await this.cleanupInternal();
    await this.connect();
  }

  private handleServerMessage(rawData: unknown): void {
    if (typeof rawData !== "string") return;

    let msg: ServerSocketMessage;
    try {
      msg = JSON.parse(rawData) as ServerSocketMessage;
    } catch {
      return;
    }

    switch (msg.type) {
      case "ready": {
        this.ready = true;
        this.setState("listening");
        this.callbacks.onWaveHand?.();
        break;
      }

      case "audio": {
        this.turnCompletePending = false;
        this.setState("speaking");
        this.audioStreamer.enqueuePcm24k(msg.data);
        break;
      }

      case "interrupted": {
        this.audioStreamer.interrupt();
        this.turnCompletePending = true;
        if (this.ready) {
          this.setState("listening");
        }
        break;
      }

      case "turn_complete": {
        this.turnCompletePending = true;
        if (!this.audioStreamer.isPlaying() && this.ready) {
          this.setState("listening");
        }
        break;
      }

      case "tool_call": {
        void this.handleToolCalls(msg.calls);
        break;
      }

      case "error": {
        this.callbacks.onError(msg.message);
        void this.disconnect();
        break;
      }

      case "session_closed": {
        if (msg.reason) {
          this.callbacks.onError(msg.reason);
        }
        void this.disconnect();
        break;
      }
    }
  }

  private async handleToolCalls(
    calls: Array<{ id?: string; name?: string; args?: Record<string, unknown> }>
  ): Promise<void> {
    if (!calls.length) return;
    const responses = await Promise.all(
      calls.map((call) =>
        executeBrowserTool(call, {
          onActionNotify: this.callbacks.onActionNotify,
          onThemeChange: this.callbacks.onThemeChange,
          onMoodChange: this.callbacks.onMoodChange,
          onOutfitChange: this.callbacks.onOutfitChange,
          onAvatarChange: this.callbacks.onAvatarChange,
          onWaveHand: this.callbacks.onWaveHand,
          onCameraControl: this.callbacks.onCameraControl,
          onTorchToggle: this.callbacks.onTorchToggle,
          onSetVolume: (levelPercent) =>
            Math.round(this.audioStreamer.setVolume(levelPercent / 100) * 100),
          onSetMute: (muted) => this.setMuted(muted),
          onWakeLockChange: this.callbacks.onWakeLockChange,
          onScheduleTimer: this.callbacks.onScheduleTimer,
          onScreenShareToggle: this.callbacks.onScreenShareToggle,
        })
      )
    );

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: "tool_response",
          responses,
        })
      );
    }
  }

  public async disconnect(): Promise<void> {
    await this.cleanupInternal();
  }

  private async cleanupInternal(): Promise<void> {
    this.ready = false;
    this.turnCompletePending = true;
    const activeWs = this.ws;
    this.ws = null;

    if (activeWs) {
      activeWs.onmessage = null;
      activeWs.onclose = null;
      activeWs.onerror = null;
      if (
        activeWs.readyState === WebSocket.OPEN ||
        activeWs.readyState === WebSocket.CONNECTING
      ) {
        try {
          activeWs.close();
        } catch {
          // Ignore
        }
      }
    }

    await this.audioStreamer.stopAll();
    this.setState("disconnected");
  }
}
