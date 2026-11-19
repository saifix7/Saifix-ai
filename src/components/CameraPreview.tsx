import { useEffect, useRef } from "react";
import { SwitchCamera, X } from "lucide-react";
import type { CameraFacing } from "../types/voice";

interface CameraPreviewProps {
  stream: MediaStream | null;
  facing: CameraFacing;
  onFlip: () => void;
  onClose: () => void;
}

export function CameraPreview({
  stream,
  facing,
  onFlip,
  onClose,
}: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.srcObject = stream;
    if (stream) {
      void video.play().catch(() => {
        // Ignore autoplay race; muted inline playback starts automatically
      });
    }

    return () => {
      video.srcObject = null;
    };
  }, [stream]);

  return (
    <div
      className="relative w-28 sm:w-36 aspect-[3/4] rounded-2xl border border-pink-400/35 bg-black/60 backdrop-blur-md shadow-2xl overflow-hidden"
      aria-label={`Live ${facing === "user" ? "front" : "back"} camera preview`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${
          facing === "user" ? "-scale-x-100" : ""
        }`}
      />

      <div
        className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/70 to-transparent pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/75 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      <div className="absolute top-1.5 inset-x-1.5 flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={onFlip}
          aria-label="Flip between front and back camera"
          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-black/45 hover:bg-black/65 border border-white/15 text-rose-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
        >
          <SwitchCamera className="w-4 h-4 text-pink-200" />
        </button>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close camera"
          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-black/45 hover:bg-rose-500/45 border border-white/15 text-rose-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
        >
          <X className="w-4 h-4 text-rose-200" />
        </button>
      </div>

      <div className="absolute bottom-1.5 inset-x-2 flex items-center justify-between pointer-events-none">
        <span className="text-[11px] font-medium tracking-wide text-pink-100/90 drop-shadow">
          {facing === "user" ? "Front" : "Back"}
        </span>
      </div>
    </div>
  );
}
