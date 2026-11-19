import { useCallback, useEffect, useRef, useState } from "react";
import {
  Hand,
  Mic,
  MicOff,
  Palette,
  PhoneOff,
  Shirt,
  SlidersHorizontal,
  Users,
  Video,
  VideoOff,
} from "lucide-react";
import { CameraStreamer } from "./camera/CameraStreamer";
import { ActionBanner } from "./components/ActionBanner";
import { CameraPreview } from "./components/CameraPreview";
import { RealisticAvatar } from "./components/RealisticAvatar";
import { AVATAR_CATALOG, SettingsModal } from "./components/SettingsModal";
import { VoiceOrb } from "./components/VoiceOrb";
import { LiveSession } from "./live/LiveSession";
import type {
  AvatarId,
  AvatarMood,
  AvatarOutfit,
  BrowserActionNotification,
  CameraControlAction,
  CameraFacing,
  LiveSessionConfig,
  MoodPreset,
  MoodTheme,
  PersonaGender,
  SessionState,
  VoiceOption,
} from "./types/voice";

const THEMES: Array<{ id: MoodTheme; label: string; backdrop: string }> = [
  {
    id: "rose-prism",
    label: "Rose Prism",
    backdrop:
      "radial-gradient(circle at 50% 28%, rgba(255, 46, 147, 0.28), transparent 55%), radial-gradient(circle at 20% 80%, rgba(168, 85, 247, 0.22), transparent 50%), radial-gradient(circle at 82% 75%, rgba(94, 252, 232, 0.12), transparent 45%)",
  },
  {
    id: "cyber-orchid",
    label: "Cyber Orchid",
    backdrop:
      "radial-gradient(circle at 50% 30%, rgba(232, 121, 249, 0.28), transparent 55%), radial-gradient(circle at 18% 78%, rgba(56, 189, 248, 0.16), transparent 48%), radial-gradient(circle at 84% 78%, rgba(244, 63, 94, 0.22), transparent 48%)",
  },
  {
    id: "aurora-pink",
    label: "Aurora Pink",
    backdrop:
      "radial-gradient(circle at 50% 26%, rgba(255, 71, 145, 0.28), transparent 55%), radial-gradient(circle at 16% 80%, rgba(52, 211, 153, 0.15), transparent 48%), radial-gradient(circle at 82% 74%, rgba(96, 165, 250, 0.18), transparent 50%)",
  },
  {
    id: "velvet-peach",
    label: "Velvet Peach",
    backdrop:
      "radial-gradient(circle at 50% 28%, rgba(251, 113, 133, 0.3), transparent 55%), radial-gradient(circle at 22% 80%, rgba(245, 158, 11, 0.15), transparent 48%), radial-gradient(circle at 82% 75%, rgba(236, 72, 153, 0.22), transparent 50%)",
  },
];

const OUTFITS: Array<{ id: AvatarOutfit; label: string }> = [
  { id: "maroon-saree", label: "Maroon Saree" },
  { id: "black-saree", label: "Black Saree" },
  { id: "cozy-sweater", label: "Cozy Sweater" },
  { id: "glam-party-dress", label: "Party Dress" },
  { id: "evening-dress", label: "Rose Dress" },
  { id: "casual-chic", label: "Blazer Look" },
];

function mapMoodPresetToVisual(preset: MoodPreset): AvatarMood {
  switch (preset) {
    case "angry":
      return "angry";
    case "saama":
    case "playful":
      return "teasing";
    case "chill":
      return "warm";
    case "flirty":
    default:
      return "flirty";
  }
}

function getStateCopy(
  state: SessionState,
  isMuted: boolean,
  avatarName: string
): string {
  switch (state) {
    case "disconnected":
      return `Tap mic to talk with ${avatarName}`;
    case "connecting":
      return `Connecting to ${avatarName}`;
    case "listening":
      return isMuted ? "Microphone muted" : "Listening to you";
    case "speaking":
      return `${avatarName} is speaking`;
  }
}

export default function App() {
  const [sessionState, setSessionState] =
    useState<SessionState>("disconnected");
  const [isMuted, setIsMuted] = useState(false);
  const [theme, setTheme] = useState<MoodTheme>("rose-prism");
  const [avatarMood, setAvatarMood] = useState<AvatarMood>("flirty");
  const [moodPreset, setMoodPreset] = useState<MoodPreset>("flirty");
  const [personaGender, setPersonaGender] = useState<PersonaGender>("female");
  const [voiceName, setVoiceName] = useState<VoiceOption>("Kore");
  const [avatarId, setAvatarId] = useState<AvatarId>("saifix");
  const [outfit, setOutfit] = useState<AvatarOutfit>("maroon-saree");
  const [wavePulse, setWavePulse] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>("user");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionBanner, setActionBanner] =
    useState<BrowserActionNotification | null>(null);

  const sessionRef = useRef<LiveSession | null>(null);
  const cameraStreamerRef = useRef<CameraStreamer | null>(null);
  const bannerTimerRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const countdownTimersRef = useRef<number[]>([]);
  const configRef = useRef<LiveSessionConfig>({
    avatarId,
    personaGender,
    moodPreset,
    voiceName,
  });

  configRef.current = {
    avatarId,
    personaGender,
    moodPreset,
    voiceName,
  };

  const triggerWave = useCallback(() => {
    setWavePulse((p) => p + 1);
  }, []);

  const stopCameraInternal = useCallback(() => {
    cameraStreamerRef.current?.stop();
    setCameraStream(null);
    setCameraActive(false);
  }, []);

  const showActionBanner = useCallback(
    (action: BrowserActionNotification) => {
      setActionBanner(action);
      if (bannerTimerRef.current !== null) {
        window.clearTimeout(bannerTimerRef.current);
      }
      bannerTimerRef.current = window.setTimeout(() => {
        setActionBanner(null);
      }, 9000);
    },
    []
  );

  useEffect(() => {
    const cameraStreamer = new CameraStreamer((base64Jpeg) => {
      sessionRef.current?.sendVideoFrame(base64Jpeg);
    });
    cameraStreamerRef.current = cameraStreamer;

    const releaseWakeLock = async () => {
      const sentinel = wakeLockRef.current;
      wakeLockRef.current = null;
      if (sentinel) {
        try {
          await sentinel.release();
        } catch {
          // Ignore
        }
      }
    };

    const session = new LiveSession({
      getConfig: () => configRef.current,
      onStateChange: (next) => {
        setSessionState(next);
        if (next === "disconnected") {
          setAvatarMood(mapMoodPresetToVisual(configRef.current.moodPreset));
          stopCameraInternal();
          void releaseWakeLock();
        }
      },
      onMutedChange: setIsMuted,
      onError: setErrorMsg,
      onActionNotify: showActionBanner,
      onThemeChange: setTheme,
      onMoodChange: setAvatarMood,
      onAvatarChange: (nextAvatar) => {
        setAvatarId(nextAvatar);
        const meta = AVATAR_CATALOG.find((a) => a.id === nextAvatar);
        if (meta && meta.gender !== configRef.current.personaGender) {
          setPersonaGender(meta.gender);
          setVoiceName(meta.gender === "male" ? "Charon" : "Kore");
        }
      },
      onOutfitChange: (nextOutfit) => {
        setAvatarId("saifix");
        setPersonaGender("female");
        setOutfit(nextOutfit);
      },
      onWaveHand: triggerWave,
      onCameraControl: async (
        action: CameraControlAction,
        facing?: CameraFacing
      ) => {
        if (action === "close") {
          stopCameraInternal();
          return { ok: true };
        }
        try {
          const stream =
            action === "flip"
              ? await cameraStreamer.flip()
              : await cameraStreamer.start(facing ?? cameraStreamer.getFacing());
          const actualFacing = cameraStreamer.getFacing();
          setCameraFacing(actualFacing);
          setCameraStream(stream);
          setCameraActive(true);
          return { ok: true, facing: actualFacing };
        } catch {
          return { ok: false, error: "Could not access device camera." };
        }
      },
      onTorchToggle: async (enabled: boolean) => {
        if (enabled && (!cameraStreamer.getStream() || cameraStreamer.getFacing() !== "environment")) {
          try {
            const stream = await cameraStreamer.start("environment");
            setCameraFacing("environment");
            setCameraStream(stream);
            setCameraActive(true);
          } catch {
            return { ok: false, error: "Rear camera permission needed for flashlight." };
          }
        }
        return cameraStreamer.setTorch(enabled);
      },
      onWakeLockChange: async (enabled: boolean) => {
        if (!enabled) {
          await releaseWakeLock();
          return { ok: true };
        }
        if (!("wakeLock" in navigator) || !navigator.wakeLock) {
          return { ok: false, error: "Screen Wake Lock is not supported in this browser." };
        }
        try {
          await releaseWakeLock();
          wakeLockRef.current = await navigator.wakeLock.request("screen");
          return { ok: true };
        } catch {
          return { ok: false, error: "Could not acquire screen wake lock." };
        }
      },
      onScheduleTimer: (seconds: number, label: string) => {
        const timerId = window.setTimeout(() => {
          void session.getAudioStreamer().playChime();
          if (typeof navigator.vibrate === "function") {
            navigator.vibrate([200, 100, 200]);
          }
          showActionBanner({
            id: `${Date.now()}-timer`,
            title: `${label} Done`,
            subtitle: `${seconds}s timer finished`,
            kind: "timer",
          });
        }, seconds * 1000);
        countdownTimersRef.current.push(timerId);
      },
    });
    sessionRef.current = session;

    return () => {
      if (bannerTimerRef.current !== null) {
        window.clearTimeout(bannerTimerRef.current);
      }
      for (const tid of countdownTimersRef.current) {
        window.clearTimeout(tid);
      }
      countdownTimersRef.current = [];
      void releaseWakeLock();
      cameraStreamer.stop();
      void session.disconnect();
    };
  }, [showActionBanner, stopCameraInternal, triggerWave]);

  const reconnectLiveIfActive = useCallback(() => {
    window.setTimeout(() => {
      if (sessionRef.current && sessionRef.current.getState() !== "disconnected") {
        void sessionRef.current.reconnectWithConfig();
      }
    }, 60);
  }, []);

  const handleSelectAvatar = useCallback(
    (nextAvatar: AvatarId) => {
      const meta = AVATAR_CATALOG.find((a) => a.id === nextAvatar);
      setAvatarId(nextAvatar);
      triggerWave();

      if (meta && meta.gender !== personaGender) {
        setPersonaGender(meta.gender);
        const nextVoice: VoiceOption =
          meta.gender === "male" ? "Charon" : "Kore";
        setVoiceName(nextVoice);
        configRef.current = {
          ...configRef.current,
          avatarId: nextAvatar,
          personaGender: meta.gender,
          voiceName: nextVoice,
        };
        reconnectLiveIfActive();
      }
    },
    [personaGender, reconnectLiveIfActive, triggerWave]
  );

  const handleSelectGender = useCallback(
    (nextGender: PersonaGender) => {
      setPersonaGender(nextGender);
      const nextVoice: VoiceOption =
        nextGender === "male" ? "Charon" : "Kore";
      setVoiceName(nextVoice);

      const currentMeta = AVATAR_CATALOG.find((a) => a.id === avatarId);
      let nextAvatar = avatarId;
      if (currentMeta && currentMeta.gender !== nextGender) {
        nextAvatar = nextGender === "male" ? "franklin" : "saifix";
        setAvatarId(nextAvatar);
        triggerWave();
      }

      configRef.current = {
        ...configRef.current,
        avatarId: nextAvatar,
        personaGender: nextGender,
        voiceName: nextVoice,
      };
      reconnectLiveIfActive();
    },
    [avatarId, reconnectLiveIfActive, triggerWave]
  );

  const handleSelectMood = useCallback(
    (nextMood: MoodPreset) => {
      setMoodPreset(nextMood);
      setAvatarMood(mapMoodPresetToVisual(nextMood));
      configRef.current = {
        ...configRef.current,
        moodPreset: nextMood,
      };
      reconnectLiveIfActive();
    },
    [reconnectLiveIfActive]
  );

  const handleSelectVoice = useCallback(
    (nextVoice: VoiceOption) => {
      setVoiceName(nextVoice);
      configRef.current = {
        ...configRef.current,
        voiceName: nextVoice,
      };
      reconnectLiveIfActive();
    },
    [reconnectLiveIfActive]
  );

  const handleOrbPress = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;

    if (sessionState === "disconnected") {
      void session.connect();
    } else if (sessionState === "listening" || sessionState === "speaking") {
      session.toggleMute();
    }
  }, [sessionState]);

  const handleDisconnect = useCallback(() => {
    stopCameraInternal();
    void sessionRef.current?.disconnect();
  }, [stopCameraInternal]);

  const handleToggleCamera = useCallback(async () => {
    const camera = cameraStreamerRef.current;
    if (!camera) return;

    if (cameraActive) {
      stopCameraInternal();
      return;
    }

    setErrorMsg(null);
    try {
      const stream = await camera.start(cameraFacing);
      setCameraStream(stream);
      setCameraActive(true);
      if (sessionState === "disconnected") {
        void sessionRef.current?.connect();
      }
    } catch (err: unknown) {
      stopCameraInternal();
      const raw = err instanceof Error ? err.message : "";
      const friendly =
        raw.toLowerCase().includes("permission") ||
        raw.toLowerCase().includes("notallowed")
          ? "Camera permission denied. Allow camera access so they can see you."
          : "Could not open camera on this device.";
      setErrorMsg(friendly);
    }
  }, [cameraActive, cameraFacing, sessionState, stopCameraInternal]);

  const handleFlipCamera = useCallback(async () => {
    const camera = cameraStreamerRef.current;
    if (!camera) return;

    try {
      const stream = await camera.flip();
      setCameraFacing(camera.getFacing());
      setCameraStream(stream);
      setCameraActive(true);
    } catch {
      setErrorMsg("Could not switch camera.");
    }
  }, []);

  const handleCycleTheme = useCallback(() => {
    setTheme((prev) => {
      const idx = THEMES.findIndex((t) => t.id === prev);
      return THEMES[(idx + 1) % THEMES.length].id;
    });
  }, []);

  const handleCycleAvatar = useCallback(() => {
    const idx = AVATAR_CATALOG.findIndex((a) => a.id === avatarId);
    const next = AVATAR_CATALOG[(idx + 1) % AVATAR_CATALOG.length];
    handleSelectAvatar(next.id);
  }, [avatarId, handleSelectAvatar]);

  const handleCycleOutfit = useCallback(() => {
    setAvatarId("saifix");
    setOutfit((prev) => {
      const idx = OUTFITS.findIndex((o) => o.id === prev);
      return OUTFITS[(idx + 1) % OUTFITS.length].id;
    });
  }, []);

  const activeTheme = THEMES.find((t) => t.id === theme) ?? THEMES[0];
  const activeAvatar =
    AVATAR_CATALOG.find((a) => a.id === avatarId) ?? AVATAR_CATALOG[0];
  const activeOutfit = OUTFITS.find((o) => o.id === outfit) ?? OUTFITS[0];
  const isActive = sessionState !== "disconnected";
  const audioStreamer = sessionRef.current?.getAudioStreamer() ?? null;

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col justify-between overflow-hidden bg-[#0d040c] text-rose-50">
      {/* Fullscreen Futuristic Pink RGB Ambient Canvas */}
      <div
        className="fixed inset-0 pointer-events-none transition-all duration-700"
        style={{ backgroundImage: activeTheme.backdrop }}
        aria-hidden="true"
      />

      {/* Subtle Futuristic Radial Grid Overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255, 133, 208, 0.25) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage:
            "radial-gradient(circle at 50% 42%, black 22%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(circle at 50% 42%, black 22%, transparent 80%)",
        }}
        aria-hidden="true"
      />

      {/* Compact Top Bar */}
      <header className="relative z-10 w-full max-w-6xl mx-auto flex items-center justify-between gap-2 px-4 sm:px-8 pt-[max(0.75rem,env(safe-area-inset-top))] pb-1">
        <span
          className="text-xl sm:text-2xl font-semibold tracking-tight text-rose-50 whitespace-nowrap shrink-0"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {activeAvatar.label}
        </span>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCycleAvatar}
            aria-label={`Switch character (${activeAvatar.label})`}
            className="min-h-[44px] px-2.5 sm:px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-pink-300/15 text-xs sm:text-sm font-medium text-pink-100/90 flex items-center gap-1.5 transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
          >
            <Users className="w-4 h-4 text-pink-300" />
            <span>{activeAvatar.label}</span>
          </button>

          {avatarId === "saifix" && (
            <button
              type="button"
              onClick={handleCycleOutfit}
              aria-label={`Switch outfit (${activeOutfit.label})`}
              className="min-h-[44px] px-2.5 sm:px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-pink-300/15 text-xs sm:text-sm font-medium text-pink-100/90 flex items-center gap-1.5 transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
            >
              <Shirt className="w-4 h-4 text-pink-300" />
              <span className="hidden sm:inline">{activeOutfit.label}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCycleTheme}
            aria-label={`Switch lighting vibe (${activeTheme.label})`}
            className="min-h-[44px] px-2.5 sm:px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-pink-300/15 text-xs sm:text-sm font-medium text-pink-100/90 flex items-center gap-1.5 transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
          >
            <Palette className="w-4 h-4 text-pink-300" />
            <span className="hidden md:inline">{activeTheme.label}</span>
          </button>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open mood, voice, and avatar settings"
            className="min-h-[44px] px-2.5 sm:px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-pink-300/20 text-xs sm:text-sm font-medium text-pink-100 flex items-center gap-1.5 transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
          >
            <SlidersHorizontal className="w-4 h-4 text-pink-300" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </header>

      {/* Main Centered Avatar + Voice Stage */}
      <main className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center w-full max-w-5xl mx-auto px-4 py-2">
        <RealisticAvatar
          sessionState={sessionState}
          isMuted={isMuted}
          theme={theme}
          mood={avatarMood}
          avatarId={avatarId}
          outfit={outfit}
          wavePulse={wavePulse}
          audioStreamer={audioStreamer}
        />

        {/* Real-time Visual State Indicator */}
        <div className="mt-3 text-center">
          <h1
            className="text-base sm:text-xl font-medium tracking-wide text-rose-50/95"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {getStateCopy(sessionState, isMuted, activeAvatar.label)}
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-pink-200/65">
            {sessionState === "disconnected"
              ? `${moodPreset[0].toUpperCase()}${moodPreset.slice(1)} · ${voiceName} voice`
              : sessionState === "speaking"
                ? "Speak anytime to interrupt"
                : sessionState === "listening"
                  ? isMuted
                    ? "Tap mic or unmute to continue"
                    : cameraActive
                      ? "Camera live — just talk naturally"
                      : "Just talk naturally"
                  : "Opening real-time audio channel"}
          </p>
        </div>

        {/* Floating PiP Live Camera Preview */}
        {cameraActive && cameraStream && (
          <div className="fixed right-4 bottom-[122px] sm:right-8 sm:bottom-28 z-30">
            <CameraPreview
              stream={cameraStream}
              facing={cameraFacing}
              onFlip={() => void handleFlipCamera()}
              onClose={stopCameraInternal}
            />
          </div>
        )}

        {/* Floating Non-Chat Notification / Error Overlay */}
        {(errorMsg || actionBanner) && (
          <div className="fixed bottom-[128px] sm:bottom-[142px] inset-x-0 z-30 px-4 pointer-events-none">
            <div className="pointer-events-auto">
              {errorMsg ? (
                <div
                  role="alert"
                  className="w-full max-w-md mx-auto rounded-2xl bg-rose-950/85 backdrop-blur-xl border border-rose-400/35 px-4 py-3 flex items-center justify-between gap-3 shadow-2xl"
                >
                  <p className="text-xs sm:text-sm text-rose-100">
                    {errorMsg}
                  </p>
                  <button
                    type="button"
                    onClick={() => setErrorMsg(null)}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-rose-500/25 hover:bg-rose-500/35 text-xs font-medium text-rose-50 whitespace-nowrap cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              ) : (
                <ActionBanner
                  action={actionBanner}
                  onDismiss={() => setActionBanner(null)}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Thumb-Zone RGB Mic & Call Controls */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-3 sm:px-8 pb-[max(0.9rem,env(safe-area-inset-bottom))] pt-1">
        <div className="flex items-center justify-center gap-2 sm:gap-4">
          {isActive && (
            <button
              type="button"
              onClick={() => sessionRef.current?.toggleMute()}
              disabled={sessionState === "connecting"}
              aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
              className={`min-h-[48px] min-w-[48px] px-3 sm:px-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 ${
                isMuted
                  ? "bg-pink-500/25 border-pink-400/50 text-pink-50"
                  : "bg-white/[0.05] hover:bg-white/[0.09] border-pink-300/20 text-pink-100"
              }`}
            >
              {isMuted ? (
                <MicOff className="w-4 h-4 text-pink-200" />
              ) : (
                <Mic className="w-4 h-4 text-pink-300" />
              )}
              <span className="hidden sm:inline">
                {isMuted ? "Unmute" : "Mute"}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={triggerWave}
            aria-label="Wave and shake hand"
            className="min-h-[48px] min-w-[48px] px-3 sm:px-4 py-2.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] border border-pink-300/20 text-xs sm:text-sm font-medium text-pink-100 flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
          >
            <Hand className="w-4 h-4 text-pink-300" />
            <span className="hidden sm:inline">Wave</span>
          </button>

          <VoiceOrb
            sessionState={sessionState}
            isMuted={isMuted}
            theme={theme}
            audioStreamer={audioStreamer}
            onOrbPress={handleOrbPress}
          />

          <button
            type="button"
            onClick={() => void handleToggleCamera()}
            aria-label={cameraActive ? "Turn off camera" : "Open live camera"}
            className={`min-h-[48px] min-w-[48px] px-3 sm:px-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 ${
              cameraActive
                ? "bg-pink-500/25 border-pink-400/50 text-pink-50"
                : "bg-white/[0.05] hover:bg-white/[0.09] border-pink-300/20 text-pink-100"
            }`}
          >
            {cameraActive ? (
              <Video className="w-4 h-4 text-pink-200" />
            ) : (
              <VideoOff className="w-4 h-4 text-pink-300" />
            )}
            <span className="hidden sm:inline">
              {cameraActive ? "Cam On" : "Camera"}
            </span>
          </button>

          {isActive && (
            <button
              type="button"
              onClick={handleDisconnect}
              aria-label="End voice session"
              className="min-h-[48px] min-w-[48px] px-3 sm:px-4 py-2.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/35 text-xs sm:text-sm font-medium text-rose-100 flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              <PhoneOff className="w-4 h-4 text-rose-300" />
              <span className="hidden sm:inline">End</span>
            </button>
          )}
        </div>
      </footer>

      {/* Voice, Mood, Persona & Avatar Settings Modal */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        avatarId={avatarId}
        outfit={outfit}
        outfits={OUTFITS}
        personaGender={personaGender}
        moodPreset={moodPreset}
        voiceName={voiceName}
        onSelectAvatar={handleSelectAvatar}
        onSelectOutfit={(nextOutfit) => {
          setAvatarId("saifix");
          setOutfit(nextOutfit);
        }}
        onSelectGender={handleSelectGender}
        onSelectMood={handleSelectMood}
        onSelectVoice={handleSelectVoice}
      />
    </div>
  );
}
