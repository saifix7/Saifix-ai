export type SessionState =
  | "disconnected"
  | "connecting"
  | "listening"
  | "speaking";

export type MoodTheme =
  | "rose-prism"
  | "cyber-orchid"
  | "aurora-pink"
  | "velvet-peach";

export type AvatarMood = "flirty" | "angry" | "teasing" | "warm";

export type PersonaGender = "female" | "male";

export type MoodPreset = "flirty" | "saama" | "playful" | "chill" | "angry";

export type VoiceOption = "Kore" | "Zephyr" | "Charon" | "Puck" | "Fenrir";

export type AvatarId =
  | "saifix"
  | "ananya"
  | "zoya"
  | "franklin"
  | "kael"
  | "miko"
  | "leo";

export type AvatarOutfit =
  | "maroon-saree"
  | "black-saree"
  | "evening-dress"
  | "cozy-sweater"
  | "glam-party-dress"
  | "casual-chic";

export type CameraFacing = "user" | "environment";

export type CameraControlAction = "open" | "close" | "flip";

export interface LiveSessionConfig {
  avatarId: AvatarId;
  personaGender: PersonaGender;
  moodPreset: MoodPreset;
  voiceName: VoiceOption;
}

export interface LiveFunctionCall {
  id?: string;
  name?: string;
  args?: Record<string, unknown>;
}

export interface LiveFunctionResponse {
  id?: string;
  name?: string;
  response: Record<string, unknown>;
}

export interface BrowserActionNotification {
  id: string;
  title: string;
  subtitle: string;
  url?: string;
  kind: "link" | "clipboard" | "theme" | "time" | "phone" | "device" | "timer";
}

export type ServerSocketMessage =
  | { type: "ready" }
  | { type: "audio"; data: string; mimeType?: string }
  | { type: "interrupted" }
  | { type: "turn_complete" }
  | { type: "tool_call"; calls: LiveFunctionCall[] }
  | { type: "session_closed"; reason?: string }
  | { type: "error"; message: string };
