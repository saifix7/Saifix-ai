import {
  ArrowUpRight,
  Bell,
  Check,
  Clock,
  Phone,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";
import type { BrowserActionNotification } from "../types/voice";

interface ActionBannerProps {
  action: BrowserActionNotification | null;
  onDismiss: () => void;
}

export function ActionBanner({ action, onDismiss }: ActionBannerProps) {
  if (!action) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full max-w-md mx-auto px-4 animate-[fadeIn_180ms_ease-out]"
    >
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#1d091b]/80 backdrop-blur-xl border border-pink-400/25 px-4 py-3 shadow-[0_12px_32px_rgba(255,46,147,0.16)]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-pink-500/20 text-pink-200 shrink-0">
            {action.kind === "link" && <ArrowUpRight className="w-4 h-4" />}
            {action.kind === "clipboard" && <Check className="w-4 h-4" />}
            {action.kind === "time" && <Clock className="w-4 h-4" />}
            {action.kind === "theme" && <Sparkles className="w-4 h-4" />}
            {action.kind === "phone" && <Phone className="w-4 h-4" />}
            {action.kind === "device" && <Smartphone className="w-4 h-4" />}
            {action.kind === "timer" && <Bell className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-rose-50 truncate">
              {action.title}
            </p>
            <p className="text-xs text-pink-200/75 truncate">
              {action.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {action.url && (
            <a
              href={action.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-pink-500/25 hover:bg-pink-500/35 text-xs font-medium text-pink-100 transition-colors flex items-center gap-1 whitespace-nowrap"
            >
              <span>Open</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss notification"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-pink-200/70 hover:text-rose-50 hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
