import { useEffect, useRef } from "react";
import { Loader2, Mic, MicOff, Volume2 } from "lucide-react";
import type { AudioStreamer } from "../audio/AudioStreamer";
import type { MoodTheme, SessionState } from "../types/voice";

interface VoiceOrbProps {
  sessionState: SessionState;
  isMuted: boolean;
  theme: MoodTheme;
  audioStreamer: AudioStreamer | null;
  onOrbPress: () => void;
}

const THEME_PALETTES: Record<
  MoodTheme,
  {
    conic: string;
    glow: string;
    coreGradient: string;
  }
> = {
  "rose-prism": {
    conic:
      "conic-gradient(from 0deg, #ff2e93, #ff79c6, #5efce8, #a855f7, #ff4ecd, #ff2e93)",
    glow: "rgba(255, 46, 147, 0.45)",
    coreGradient: "from-pink-500 via-rose-500 to-fuchsia-600",
  },
  "cyber-orchid": {
    conic:
      "conic-gradient(from 0deg, #e879f9, #38bdf8, #f43f5e, #c084fc, #fb7185, #e879f9)",
    glow: "rgba(217, 70, 239, 0.45)",
    coreGradient: "from-fuchsia-500 via-pink-500 to-purple-600",
  },
  "aurora-pink": {
    conic:
      "conic-gradient(from 0deg, #ff4791, #34d399, #ff99c8, #60a5fa, #ec4899, #ff4791)",
    glow: "rgba(236, 72, 153, 0.45)",
    coreGradient: "from-rose-500 via-pink-500 to-indigo-500",
  },
  "velvet-peach": {
    conic:
      "conic-gradient(from 0deg, #fb7185, #fda4af, #f59e0b, #ec4899, #f472b6, #fb7185)",
    glow: "rgba(251, 113, 133, 0.45)",
    coreGradient: "from-rose-400 via-pink-500 to-amber-500",
  },
};

export function VoiceOrb({
  sessionState,
  isMuted,
  theme,
  audioStreamer,
  onOrbPress,
}: VoiceOrbProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef(sessionState);
  const mutedRef = useRef(isMuted);
  const streamerRef = useRef(audioStreamer);

  stateRef.current = sessionState;
  mutedRef.current = isMuted;
  streamerRef.current = audioStreamer;

  useEffect(() => {
    let rafId = 0;
    const bins = new Uint8Array(64);
    let smoothed = 0;

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      const currentState = stateRef.current;
      const streamer = streamerRef.current;

      let energy = 0;
      if (streamer) {
        if (currentState === "speaking") {
          energy = streamer.sampleSpectrum(bins, "output");
        } else if (currentState === "listening" && !mutedRef.current) {
          energy = streamer.sampleSpectrum(bins, "input");
        }
      }

      smoothed += (energy - smoothed) * 0.25;
      if (shellRef.current) {
        const scale = 1 + smoothed * 0.14;
        shellRef.current.style.transform = `scale(${scale.toFixed(4)})`;
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const palette = THEME_PALETTES[theme];
  const isConnecting = sessionState === "connecting";
  const isListening = sessionState === "listening";
  const isSpeaking = sessionState === "speaking";
  const isIdle = sessionState === "disconnected";

  const buttonLabel = isIdle
    ? "Start voice session with Saifix"
    : isConnecting
      ? "Connecting to Saifix"
      : isMuted
        ? "Unmute microphone"
        : "Mute microphone";

  return (
    <div className="relative flex items-center justify-center w-[96px] h-[96px] sm:w-[106px] sm:h-[106px] select-none shrink-0">
      {/* Pulse rings while active */}
      {(isListening || isSpeaking || isConnecting) && (
        <>
          <div
            className="absolute inset-1 rounded-full border border-pink-400/40 animate-pulse-ring pointer-events-none"
            style={{ animationDelay: "0s" }}
          />
          <div
            className="absolute inset-1 rounded-full border border-fuchsia-300/25 animate-pulse-ring pointer-events-none"
            style={{ animationDelay: "1.2s" }}
          />
        </>
      )}

      {/* Reactive RGB Shell */}
      <div
        ref={shellRef}
        className="relative flex items-center justify-center w-[76px] h-[76px] sm:w-[84px] sm:h-[84px] transition-transform duration-75 ease-out will-change-transform"
      >
        <div
          className={`absolute inset-0 rounded-full p-[2.5px] ${
            isConnecting || isSpeaking
              ? "animate-rgb-spin-fast"
              : "animate-rgb-spin"
          }`}
          style={{
            background: palette.conic,
            boxShadow: `0 0 28px ${palette.glow}`,
          }}
        >
          <div className="w-full h-full rounded-full bg-[#130512]/95" />
        </div>

        <button
          type="button"
          onClick={onOrbPress}
          disabled={isConnecting}
          aria-label={buttonLabel}
          className={`relative z-10 flex items-center justify-center w-[62px] h-[62px] sm:w-[68px] sm:h-[68px] rounded-full bg-gradient-to-br ${palette.coreGradient} text-white shadow-[inset_0_2px_10px_rgba(255,255,255,0.4),0_8px_24px_rgba(255,46,147,0.45)] hover:brightness-110 active:scale-95 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#120511] cursor-pointer disabled:cursor-wait`}
        >
          {isConnecting ? (
            <Loader2 className="w-6 h-6 sm:w-7 sm:h-7 animate-spin" />
          ) : isSpeaking ? (
            <Volume2 className="w-6 h-6 sm:w-7 sm:h-7" />
          ) : isListening && isMuted ? (
            <MicOff className="w-6 h-6 sm:w-7 sm:h-7" />
          ) : (
            <Mic className="w-6 h-6 sm:w-7 sm:h-7" />
          )}
        </button>
      </div>
    </div>
  );
}
