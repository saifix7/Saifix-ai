import { useEffect } from "react";
import { Check, Mic, Sparkles, User, Users, X } from "lucide-react";
import type {
  AvatarId,
  AvatarOutfit,
  MoodPreset,
  PersonaGender,
  VoiceOption,
} from "../types/voice";
import { AVATAR_THUMBNAILS } from "./RealisticAvatar";

export interface AvatarMeta {
  id: AvatarId;
  label: string;
  gender: PersonaGender;
  style: "Realistic" | "Cartoon";
  tagline: string;
}

export const AVATAR_CATALOG: AvatarMeta[] = [
  {
    id: "saifix",
    label: "Saifix",
    gender: "female",
    style: "Realistic",
    tagline: "Bold Indian baddie",
  },
  {
    id: "ananya",
    label: "Ananya",
    gender: "female",
    style: "Realistic",
    tagline: "Sweet & sharp",
  },
  {
    id: "zoya",
    label: "Zoya",
    gender: "female",
    style: "Realistic",
    tagline: "Chic & teasing",
  },
  {
    id: "franklin",
    label: "Franklin",
    gender: "male",
    style: "Cartoon",
    tagline: "Street hero swag",
  },
  {
    id: "kael",
    label: "Kael",
    gender: "male",
    style: "Cartoon",
    tagline: "Cyberpunk rebel",
  },
  {
    id: "miko",
    label: "Miko",
    gender: "female",
    style: "Cartoon",
    tagline: "3D gamer girl",
  },
  {
    id: "leo",
    label: "Leo",
    gender: "male",
    style: "Cartoon",
    tagline: "Charming buddy",
  },
];

const MOOD_PRESETS: Array<{ id: MoodPreset; label: string; hint: string }> = [
  { id: "saama", label: "Saama", hint: "Bold & savage wit" },
  { id: "flirty", label: "Flirty", hint: "Teasing & romantic" },
  { id: "playful", label: "Playful", hint: "Fun & mischievous" },
  { id: "chill", label: "Chill", hint: "Laid-back homie" },
  { id: "angry", label: "Angry", hint: "Fiery gussa roast" },
];

const VOICE_OPTIONS: Array<{
  id: VoiceOption;
  label: string;
  gender: PersonaGender;
  tone: string;
}> = [
  { id: "Kore", label: "Kore", gender: "female", tone: "Bold Female" },
  { id: "Zephyr", label: "Zephyr", gender: "female", tone: "Playful Female" },
  { id: "Charon", label: "Charon", gender: "male", tone: "Deep Male" },
  { id: "Puck", label: "Puck", gender: "male", tone: "Witty Male" },
  { id: "Fenrir", label: "Fenrir", gender: "male", tone: "Fierce Male" },
];

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  avatarId: AvatarId;
  outfit: AvatarOutfit;
  outfits: Array<{ id: AvatarOutfit; label: string }>;
  personaGender: PersonaGender;
  moodPreset: MoodPreset;
  voiceName: VoiceOption;
  onSelectAvatar: (id: AvatarId) => void;
  onSelectOutfit: (outfit: AvatarOutfit) => void;
  onSelectGender: (gender: PersonaGender) => void;
  onSelectMood: (mood: MoodPreset) => void;
  onSelectVoice: (voice: VoiceOption) => void;
}

export function SettingsModal({
  open,
  onClose,
  avatarId,
  outfit,
  outfits,
  personaGender,
  moodPreset,
  voiceName,
  onSelectAvatar,
  onSelectOutfit,
  onSelectGender,
  onSelectMood,
  onSelectVoice,
}: SettingsModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Companion Settings"
    >
      <div
        className="w-full sm:max-w-lg max-h-[86dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#160615]/95 border border-pink-400/25 shadow-2xl p-5 sm:p-6 text-rose-50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-pink-300/10">
          <div>
            <h2
              className="text-lg sm:text-xl font-semibold text-rose-50"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Voice & Avatar Studio
            </h2>
            <p className="text-xs text-pink-200/65 mt-0.5">
              Customize persona, mood, voice & character
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-pink-300/15 text-pink-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5 pt-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {/* Persona Gender */}
          <section>
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-pink-200/75 mb-2.5">
              <User className="w-3.5 h-3.5 text-pink-300" />
              <span>Persona</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {(["female", "male"] as PersonaGender[]).map((g) => {
                const active = personaGender === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => onSelectGender(g)}
                    className={`min-h-[44px] px-3 py-2 rounded-xl border text-sm font-medium flex items-center justify-between transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? "bg-pink-500/25 border-pink-400/60 text-rose-50"
                        : "bg-white/[0.04] hover:bg-white/[0.08] border-pink-300/15 text-pink-100/80"
                    }`}
                  >
                    <span>{g === "female" ? "Female Vibe" : "Male Vibe"}</span>
                    {active && <Check className="w-4 h-4 text-pink-300" />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Mood */}
          <section>
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-pink-200/75 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-pink-300" />
              <span>Mood</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MOOD_PRESETS.map((m) => {
                const active = moodPreset === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSelectMood(m.id)}
                    className={`min-h-[44px] px-3 py-2 rounded-xl border text-left transition-colors cursor-pointer ${
                      active
                        ? "bg-pink-500/25 border-pink-400/60 text-rose-50"
                        : "bg-white/[0.04] hover:bg-white/[0.08] border-pink-300/15 text-pink-100/85"
                    }`}
                  >
                    <div className="text-sm font-medium leading-tight">
                      {m.label}
                    </div>
                    <div className="text-[11px] text-pink-200/65 mt-0.5 truncate">
                      {m.hint}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Voice */}
          <section>
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-pink-200/75 mb-2.5">
              <Mic className="w-3.5 h-3.5 text-pink-300" />
              <span>Voice</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {VOICE_OPTIONS.map((v) => {
                const active = voiceName === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onSelectVoice(v.id)}
                    className={`min-h-[44px] px-3 py-2 rounded-xl border text-left transition-colors cursor-pointer ${
                      active
                        ? "bg-pink-500/25 border-pink-400/60 text-rose-50"
                        : "bg-white/[0.04] hover:bg-white/[0.08] border-pink-300/15 text-pink-100/85"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-medium">{v.label}</span>
                      {active && <Check className="w-3.5 h-3.5 text-pink-300" />}
                    </div>
                    <div className="text-[11px] text-pink-200/65 mt-0.5">
                      {v.tone}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Avatar Gallery (Realistic + Cartoon Characters) */}
          <section>
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-pink-200/75 mb-2.5">
              <Users className="w-3.5 h-3.5 text-pink-300" />
              <span>Characters & Cartoon Avatars</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {AVATAR_CATALOG.map((av) => {
                const active = avatarId === av.id;
                return (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => onSelectAvatar(av.id)}
                    className={`group relative rounded-2xl overflow-hidden border text-left transition-all cursor-pointer ${
                      active
                        ? "border-pink-400 ring-2 ring-pink-400/40"
                        : "border-pink-300/15 hover:border-pink-300/40"
                    }`}
                  >
                    <div className="aspect-[2/3] w-full bg-[#110310] overflow-hidden">
                      <img
                        src={AVATAR_THUMBNAILS[av.id]}
                        alt={av.label}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/65 to-transparent p-2 pt-5">
                      <div className="text-xs font-semibold text-rose-50 truncate">
                        {av.label}
                      </div>
                      <div className="text-[10px] text-pink-200/75 truncate">
                        {av.style} · {av.gender === "male" ? "M" : "F"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Outfit selector when Saifix is active */}
          {avatarId === "saifix" && (
            <section>
              <div className="text-xs font-medium uppercase tracking-wider text-pink-200/75 mb-2.5">
                Saifix Outfit
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {outfits.map((o) => {
                  const active = outfit === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => onSelectOutfit(o.id)}
                      className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? "bg-pink-500/25 border-pink-400/60 text-rose-50"
                          : "bg-white/[0.04] hover:bg-white/[0.08] border-pink-300/15 text-pink-100/85"
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
