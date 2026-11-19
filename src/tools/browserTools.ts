import {
  executeNativeScreenControl,
  launchRealApp,
} from "../native/androidBridge";
import type {
  AvatarId,
  AvatarMood,
  AvatarOutfit,
  BrowserActionNotification,
  CameraControlAction,
  CameraFacing,
  LiveFunctionCall,
  LiveFunctionResponse,
  MoodTheme,
} from "../types/voice";

const SITE_SHORTCUTS: Record<string, string> = {
  youtube: "https://www.youtube.com",
  yt: "https://www.youtube.com",
  google: "https://www.google.com",
  spotify: "https://open.spotify.com",
  instagram: "https://www.instagram.com",
  insta: "https://www.instagram.com",
  github: "https://github.com",
  x: "https://x.com",
  twitter: "https://x.com",
  reddit: "https://www.reddit.com",
  netflix: "https://www.netflix.com",
  gmail: "https://mail.google.com",
  maps: "https://maps.google.com",
  linkedin: "https://www.linkedin.com",
  pinterest: "https://www.pinterest.com",
  wikipedia: "https://www.wikipedia.org",
};

function normalizeWebsiteUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  const lower = trimmed.toLowerCase().replace(/^www\./, "");
  if (SITE_SHORTCUTS[lower]) {
    return SITE_SHORTCUTS[lower];
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.includes(".")) {
    return `https://${trimmed}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}

function triggerLinkNavigation(url: string): void {
  const anchor = document.createElement("a");
  anchor.href = url;
  const isNativeScheme = /^(tel|sms|mailto):/i.test(url);
  if (!isNativeScheme) {
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
  }
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

function friendlyHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function sanitizePhone(raw: string): string {
  return raw.replace(/[^\d+]/g, "");
}

function makeNotificationId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export interface ToolExecutionContext {
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
  onSetVolume?: (levelPercent: number) => number;
  onSetMute?: (muted: boolean) => void;
  onWakeLockChange?: (
    enabled: boolean
  ) => Promise<{ ok: boolean; error?: string }>;
  onScheduleTimer?: (seconds: number, label: string) => void;
  onScreenShareToggle?: (
    enabled: boolean
  ) => Promise<{ ok: boolean; error?: string }>;
}

export async function executeBrowserTool(
  call: LiveFunctionCall,
  context: ToolExecutionContext
): Promise<LiveFunctionResponse> {
  const name = call.name ?? "";
  const args = call.args ?? {};

  switch (name) {
    case "waveHand": {
      context.onWaveHand?.();
      return {
        id: call.id,
        name,
        response: { ok: true, waved: true },
      };
    }

    case "changeAvatar": {
      const rawAvatar = String(args.avatar ?? "saifix").toLowerCase();
      const validAvatars: AvatarId[] = [
        "saifix",
        "ananya",
        "zoya",
        "franklin",
        "kael",
        "miko",
        "leo",
      ];
      const avatar: AvatarId = validAvatars.includes(rawAvatar as AvatarId)
        ? (rawAvatar as AvatarId)
        : "saifix";
      const avatarLabels: Record<AvatarId, string> = {
        saifix: "Saifix",
        ananya: "Ananya",
        zoya: "Zoya",
        franklin: "Franklin",
        kael: "Kael",
        miko: "Miko",
        leo: "Leo",
      };
      context.onAvatarChange?.(avatar);
      context.onWaveHand?.();
      context.onActionNotify({
        id: makeNotificationId(),
        title: `Avatar · ${avatarLabels[avatar]}`,
        subtitle: "Switched character",
        kind: "theme",
      });
      return {
        id: call.id,
        name,
        response: { ok: true, avatar, label: avatarLabels[avatar] },
      };
    }

    case "changeOutfit": {
      const rawOutfit = String(args.outfit ?? "maroon-saree").toLowerCase();
      const validOutfits: AvatarOutfit[] = [
        "maroon-saree",
        "black-saree",
        "evening-dress",
        "cozy-sweater",
        "glam-party-dress",
        "casual-chic",
      ];
      const outfit: AvatarOutfit = validOutfits.includes(
        rawOutfit as AvatarOutfit
      )
        ? (rawOutfit as AvatarOutfit)
        : "maroon-saree";

      const outfitLabels: Record<AvatarOutfit, string> = {
        "maroon-saree": "Maroon Saree",
        "black-saree": "Black Silk Saree",
        "evening-dress": "Rose Satin Dress",
        "cozy-sweater": "Off-Shoulder Sweater",
        "glam-party-dress": "Velvet Party Dress",
        "casual-chic": "Ivory Blazer Look",
      };

      context.onAvatarChange?.("saifix");
      context.onOutfitChange?.(outfit);
      context.onActionNotify({
        id: makeNotificationId(),
        title: `Outfit · ${outfitLabels[outfit]}`,
        subtitle: "Switched look",
        kind: "theme",
      });

      return {
        id: call.id,
        name,
        response: { ok: true, outfit, label: outfitLabels[outfit] },
      };
    }

    case "setExpressionMood": {
      const rawMood = String(args.mood ?? "flirty").toLowerCase();
      const validMoods: AvatarMood[] = ["flirty", "angry", "teasing", "warm"];
      const mood: AvatarMood = validMoods.includes(rawMood as AvatarMood)
        ? (rawMood as AvatarMood)
        : "flirty";
      context.onMoodChange?.(mood);
      return {
        id: call.id,
        name,
        response: { ok: true, mood },
      };
    }

    case "makePhoneCall": {
      const cleaned = sanitizePhone(String(args.phoneNumber ?? ""));
      if (!cleaned) {
        return {
          id: call.id,
          name,
          response: { ok: false, error: "Please provide a valid phone number." },
        };
      }
      const contact =
        typeof args.contactName === "string" && args.contactName.trim()
          ? args.contactName.trim()
          : cleaned;
      const telUrl = `tel:${cleaned}`;
      triggerLinkNavigation(telUrl);

      context.onActionNotify({
        id: makeNotificationId(),
        title: `Calling ${contact}`,
        subtitle: cleaned,
        url: telUrl,
        kind: "phone",
      });
      return {
        id: call.id,
        name,
        response: { ok: true, phoneNumber: cleaned, contactName: contact },
      };
    }

    case "sendSMS": {
      const cleaned = sanitizePhone(String(args.phoneNumber ?? ""));
      const message = String(args.message ?? "").trim();
      if (!cleaned) {
        return {
          id: call.id,
          name,
          response: { ok: false, error: "Phone number is required for SMS." },
        };
      }
      const smsUrl = `sms:${cleaned}?body=${encodeURIComponent(message)}`;
      triggerLinkNavigation(smsUrl);

      context.onActionNotify({
        id: makeNotificationId(),
        title: `SMS · ${cleaned}`,
        subtitle: message || "Ready in Messages app",
        url: smsUrl,
        kind: "phone",
      });
      return {
        id: call.id,
        name,
        response: { ok: true, phoneNumber: cleaned, message },
      };
    }

    case "sendWhatsApp": {
      const rawNum = String(args.phoneNumber ?? "");
      const digits = rawNum.replace(/\D/g, "");
      const message = String(args.message ?? "").trim();
      const waUrl = digits
        ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;
      triggerLinkNavigation(waUrl);

      context.onActionNotify({
        id: makeNotificationId(),
        title: digits ? `WhatsApp · +${digits}` : "WhatsApp Message",
        subtitle: message || "Opening WhatsApp",
        url: waUrl,
        kind: "phone",
      });
      return {
        id: call.id,
        name,
        response: { ok: true, url: waUrl },
      };
    }

    case "sendEmail": {
      const to = String(args.to ?? "").trim();
      if (!to) {
        return {
          id: call.id,
          name,
          response: { ok: false, error: "Recipient email address required." },
        };
      }
      const subject = String(args.subject ?? "").trim();
      const body = String(args.body ?? "").trim();
      const query = new URLSearchParams();
      if (subject) query.set("subject", subject);
      if (body) query.set("body", body);
      const mailUrl = `mailto:${encodeURIComponent(to)}${
        query.toString() ? `?${query.toString()}` : ""
      }`;
      triggerLinkNavigation(mailUrl);

      context.onActionNotify({
        id: makeNotificationId(),
        title: `Email · ${to}`,
        subtitle: subject || "Opening Mail app",
        url: mailUrl,
        kind: "phone",
      });
      return {
        id: call.id,
        name,
        response: { ok: true, to, subject },
      };
    }

    case "navigateMaps": {
      const destination = String(args.destination ?? "").trim();
      if (!destination) {
        return {
          id: call.id,
          name,
          response: { ok: false, error: "Destination required." },
        };
      }
      const mode = String(args.mode ?? "driving").toLowerCase();
      const validModes = ["driving", "walking", "bicycling", "transit"];
      const safeMode = validModes.includes(mode) ? mode : "driving";
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        destination
      )}&travelmode=${safeMode}`;
      triggerLinkNavigation(mapsUrl);

      context.onActionNotify({
        id: makeNotificationId(),
        title: `Directions · ${destination}`,
        subtitle: `${safeMode} route`,
        url: mapsUrl,
        kind: "link",
      });
      return {
        id: call.id,
        name,
        response: { ok: true, destination, mode: safeMode, url: mapsUrl },
      };
    }

    case "getBatteryStatus": {
      const nav = navigator as Navigator & {
        getBattery?: () => Promise<{
          level: number;
          charging: boolean;
          chargingTime: number;
          dischargingTime: number;
        }>;
      };
      if (typeof nav.getBattery !== "function") {
        return {
          id: call.id,
          name,
          response: {
            ok: false,
            error: "Battery Status API is not exposed by this browser.",
          },
        };
      }
      try {
        const battery = await nav.getBattery();
        const percent = Math.round(battery.level * 100);
        const statusText = battery.charging ? "Charging" : "On battery";
        context.onActionNotify({
          id: makeNotificationId(),
          title: `Battery · ${percent}%`,
          subtitle: statusText,
          kind: "device",
        });
        return {
          id: call.id,
          name,
          response: {
            ok: true,
            batteryPercent: percent,
            charging: battery.charging,
          },
        };
      } catch {
        return {
          id: call.id,
          name,
          response: { ok: false, error: "Unable to read battery level." },
        };
      }
    }

    case "toggleCamera": {
      const rawAction = String(args.action ?? "open").toLowerCase();
      const action: CameraControlAction =
        rawAction === "close" || rawAction === "flip" ? rawAction : "open";
      const facingArg =
        args.facing === "environment" || args.facing === "user"
          ? (args.facing as CameraFacing)
          : undefined;

      if (!context.onCameraControl) {
        return {
          id: call.id,
          name,
          response: { ok: false, error: "Camera controller unavailable." },
        };
      }
      const res = await context.onCameraControl(action, facingArg);
      if (res.ok) {
        context.onActionNotify({
          id: makeNotificationId(),
          title:
            action === "close"
              ? "Camera Off"
              : `Camera · ${res.facing === "environment" ? "Back" : "Front"}`,
          subtitle: action === "flip" ? "Flipped lens" : "Live camera updated",
          kind: "device",
        });
      }
      return { id: call.id, name, response: res };
    }

    case "toggleFlashlight": {
      const enabled = Boolean(args.enabled);
      if (!context.onTorchToggle) {
        return {
          id: call.id,
          name,
          response: { ok: false, error: "Flashlight controller unavailable." },
        };
      }
      const res = await context.onTorchToggle(enabled);
      if (res.ok) {
        context.onActionNotify({
          id: makeNotificationId(),
          title: enabled ? "Flashlight ON" : "Flashlight OFF",
          subtitle: "Rear camera torch updated",
          kind: "device",
        });
      }
      return { id: call.id, name, response: res };
    }

    case "setAssistantVolume": {
      const rawLevel = Number(args.level ?? 80);
      const bounded = Number.isFinite(rawLevel)
        ? Math.max(0, Math.min(100, Math.round(rawLevel)))
        : 80;
      const actual = context.onSetVolume ? context.onSetVolume(bounded) : bounded;
      context.onActionNotify({
        id: makeNotificationId(),
        title: `Volume · ${actual}%`,
        subtitle: "Voice playback level updated",
        kind: "device",
      });
      return {
        id: call.id,
        name,
        response: { ok: true, volumePercent: actual },
      };
    }

    case "toggleMicMute": {
      const muted = Boolean(args.muted);
      context.onSetMute?.(muted);
      context.onActionNotify({
        id: makeNotificationId(),
        title: muted ? "Microphone Muted" : "Microphone Live",
        subtitle: "Audio input updated",
        kind: "device",
      });
      return {
        id: call.id,
        name,
        response: { ok: true, muted },
      };
    }

    case "vibratePhone": {
      const patternName = String(args.pattern ?? "short").toLowerCase();
      const pattern =
        patternName === "double"
          ? [160, 90, 160]
          : patternName === "pulse"
            ? [120, 70, 120, 70, 220]
            : [200];
      const supported = typeof navigator.vibrate === "function";
      const triggered = supported ? navigator.vibrate(pattern) : false;
      context.onActionNotify({
        id: makeNotificationId(),
        title: triggered ? "Phone Vibrated" : "Haptic Unavailable",
        subtitle: triggered
          ? `Pattern: ${patternName}`
          : "Browser blocked or unsupported",
        kind: "device",
      });
      return {
        id: call.id,
        name,
        response: { ok: Boolean(triggered), supported, pattern: patternName },
      };
    }

    case "setWakeLock": {
      const enabled = Boolean(args.enabled);
      if (!context.onWakeLockChange) {
        return {
          id: call.id,
          name,
          response: { ok: false, error: "Wake lock unavailable." },
        };
      }
      const res = await context.onWakeLockChange(enabled);
      if (res.ok) {
        context.onActionNotify({
          id: makeNotificationId(),
          title: enabled ? "Screen Kept Awake" : "Auto-Lock Restored",
          subtitle: "Wake Lock updated",
          kind: "device",
        });
      }
      return { id: call.id, name, response: res };
    }

    case "shareContent": {
      const title = String(args.title ?? "Shared via Saifix").trim();
      const text = String(args.text ?? "").trim();
      const url = typeof args.url === "string" ? args.url.trim() : undefined;

      if (typeof navigator.share === "function") {
        try {
          await navigator.share({ title, text, ...(url ? { url } : {}) });
          context.onActionNotify({
            id: makeNotificationId(),
            title: "Share Sheet Opened",
            subtitle: text.slice(0, 48) || title,
            kind: "device",
          });
          return { id: call.id, name, response: { ok: true, shared: true } };
        } catch {
          // User canceled or share rejected; fall back to clipboard copy
        }
      }

      const combined = url ? `${text}\n${url}`.trim() : text;
      try {
        await navigator.clipboard?.writeText(combined);
      } catch {
        // Ignore
      }
      context.onActionNotify({
        id: makeNotificationId(),
        title: "Copied to Share",
        subtitle: combined.slice(0, 48),
        kind: "clipboard",
      });
      return {
        id: call.id,
        name,
        response: { ok: true, copiedFallback: true },
      };
    }

    case "setCountdownTimer": {
      const rawSeconds = Number(args.seconds ?? 60);
      const seconds = Number.isFinite(rawSeconds)
        ? Math.max(1, Math.min(86400, Math.round(rawSeconds)))
        : 60;
      const label =
        typeof args.label === "string" && args.label.trim()
          ? args.label.trim()
          : "Timer";

      context.onScheduleTimer?.(seconds, label);
      context.onActionNotify({
        id: makeNotificationId(),
        title: `${label} · ${seconds}s`,
        subtitle: "Countdown started",
        kind: "timer",
      });
      return {
        id: call.id,
        name,
        response: { ok: true, seconds, label },
      };
    }

    case "openApp": {
      const appName = String(args.appName ?? "").trim();
      if (!appName) {
        return {
          id: call.id,
          name,
          response: { ok: false, error: "Please tell me which app to open." },
        };
      }
      const res = launchRealApp(appName);
      context.onActionNotify({
        id: makeNotificationId(),
        title: `Open ${res.label}`,
        subtitle:
          res.mode === "native-apk"
            ? "Launched native app"
            : res.mode === "android-intent"
              ? "Opening Android app"
              : "Opening app link",
        url: res.url,
        kind: "phone",
      });
      return {
        id: call.id,
        name,
        response: res,
      };
    }

    case "toggleScreenShare": {
      const enabled = Boolean(args.enabled);
      if (!context.onScreenShareToggle) {
        return {
          id: call.id,
          name,
          response: { ok: false, error: "Screen share unavailable." },
        };
      }
      const res = await context.onScreenShareToggle(enabled);
      if (res.ok) {
        context.onActionNotify({
          id: makeNotificationId(),
          title: enabled ? "Screen Vision ON" : "Screen Vision OFF",
          subtitle: enabled
            ? "Watching live screen at 1 FPS"
            : "Screen sharing stopped",
          kind: "device",
        });
      }
      return { id: call.id, name, response: res };
    }

    case "controlPhoneScreen": {
      const action = String(args.action ?? "").trim();
      const target =
        typeof args.target === "string" ? args.target.trim() : undefined;
      const x = typeof args.x === "number" ? args.x : undefined;
      const y = typeof args.y === "number" ? args.y : undefined;
      const res = executeNativeScreenControl({ action, target, x, y });
      context.onActionNotify({
        id: makeNotificationId(),
        title: `Screen · ${action}`,
        subtitle: res.ok
          ? target || "Action executed"
          : res.error || "Requires Android APK Accessibility",
        kind: "device",
      });
      return { id: call.id, name, response: res };
    }

    case "openWebsite": {
      const rawUrl = String(args.url ?? "").trim();
      if (!rawUrl) {
        return {
          id: call.id,
          name,
          response: { ok: false, error: "No URL provided." },
        };
      }
      const safeUrl = normalizeWebsiteUrl(rawUrl);
      const label =
        typeof args.siteName === "string" && args.siteName.trim()
          ? args.siteName.trim()
          : friendlyHost(safeUrl);

      triggerLinkNavigation(safeUrl);

      context.onActionNotify({
        id: makeNotificationId(),
        title: `Open ${label}`,
        subtitle: friendlyHost(safeUrl),
        url: safeUrl,
        kind: "link",
      });

      return {
        id: call.id,
        name,
        response: {
          ok: true,
          openedUrl: safeUrl,
          siteName: label,
        },
      };
    }

    case "searchPlatform": {
      const query = String(args.query ?? "").trim();
      const platform = String(args.platform ?? "google").toLowerCase();
      let targetUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      let title = "Google Search";

      if (platform === "youtube") {
        targetUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        title = "YouTube Search";
      } else if (platform === "spotify") {
        targetUrl = `https://open.spotify.com/search/${encodeURIComponent(query)}`;
        title = "Spotify Search";
      } else if (platform === "maps") {
        targetUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
        title = "Google Maps";
      }

      triggerLinkNavigation(targetUrl);

      context.onActionNotify({
        id: makeNotificationId(),
        title,
        subtitle: query,
        url: targetUrl,
        kind: "link",
      });

      return {
        id: call.id,
        name,
        response: {
          ok: true,
          platform,
          query,
          url: targetUrl,
        },
      };
    }

    case "getCurrentDateTime": {
      const now = new Date();
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const formattedTime = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const formattedDate = now.toLocaleDateString([], {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      context.onActionNotify({
        id: makeNotificationId(),
        title: formattedTime,
        subtitle: `${formattedDate} · ${timeZone}`,
        kind: "time",
      });

      return {
        id: call.id,
        name,
        response: {
          ok: true,
          localTime: formattedTime,
          localDate: formattedDate,
          timeZone,
          iso: now.toISOString(),
        },
      };
    }

    case "copyToClipboard": {
      const text = String(args.text ?? "");
      const label =
        typeof args.label === "string" && args.label.trim()
          ? args.label.trim()
          : "Copied snippet";

      let copied = false;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          copied = true;
        }
      } catch {
        copied = false;
      }

      context.onActionNotify({
        id: makeNotificationId(),
        title: copied ? `Copied ${label}` : `Ready: ${label}`,
        subtitle: text.length > 52 ? `${text.slice(0, 52)}...` : text,
        kind: "clipboard",
      });

      return {
        id: call.id,
        name,
        response: {
          ok: true,
          copied,
          label,
        },
      };
    }

    case "setMoodLight": {
      const rawTheme = String(args.theme ?? "rose-prism");
      const validThemes: MoodTheme[] = [
        "rose-prism",
        "cyber-orchid",
        "aurora-pink",
        "velvet-peach",
      ];
      const theme: MoodTheme = validThemes.includes(rawTheme as MoodTheme)
        ? (rawTheme as MoodTheme)
        : "rose-prism";

      context.onThemeChange(theme);

      const themeLabels: Record<MoodTheme, string> = {
        "rose-prism": "Rose Prism",
        "cyber-orchid": "Cyber Orchid",
        "aurora-pink": "Aurora Pink",
        "velvet-peach": "Velvet Peach",
      };

      context.onActionNotify({
        id: makeNotificationId(),
        title: `Lighting · ${themeLabels[theme]}`,
        subtitle: "RGB atmosphere updated",
        kind: "theme",
      });

      return {
        id: call.id,
        name,
        response: {
          ok: true,
          activeTheme: theme,
        },
      };
    }

    default:
      return {
        id: call.id,
        name,
        response: {
          ok: false,
          error: `Unknown tool: ${name}`,
        },
      };
  }
}
