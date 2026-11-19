export interface SaifixNativeBridgeAPI {
  isNativeApk?: () => boolean;
  openApp?: (appNameOrPackage: string) => string;
  controlScreen?: (actionJson: string) => string;
  setBackgroundService?: (enabled: boolean, title?: string) => string;
  requestAccessibilitySettings?: () => void;
  getBridgeCapabilities?: () => string;
}

export interface NativeBridgeEvent {
  type: "incoming_call" | "accessibility_status" | "screen_action";
  callerName?: string;
  callerNumber?: string;
  state?: string;
  detail?: string;
}

declare global {
  interface Window {
    SaifixNative?: SaifixNativeBridgeAPI;
    dispatchSaifixNativeEvent?: (event: NativeBridgeEvent) => void;
  }
}

export function isRunningInsideNativeApk(): boolean {
  return Boolean(
    typeof window !== "undefined" &&
      window.SaifixNative &&
      (typeof window.SaifixNative.isNativeApk !== "function" ||
        window.SaifixNative.isNativeApk())
  );
}

const APP_INTENT_MAP: Record<
  string,
  { androidPkg?: string; schemeUrl: string; webFallback: string; label: string }
> = {
  whatsapp: {
    androidPkg: "com.whatsapp",
    schemeUrl: "whatsapp://send",
    webFallback: "https://wa.me/",
    label: "WhatsApp",
  },
  instagram: {
    androidPkg: "com.instagram.android",
    schemeUrl: "instagram://app",
    webFallback: "https://www.instagram.com/",
    label: "Instagram",
  },
  youtube: {
    androidPkg: "com.google.android.youtube",
    schemeUrl: "vnd.youtube://",
    webFallback: "https://www.youtube.com/",
    label: "YouTube",
  },
  spotify: {
    androidPkg: "com.spotify.music",
    schemeUrl: "spotify://",
    webFallback: "https://open.spotify.com/",
    label: "Spotify",
  },
  telegram: {
    androidPkg: "org.telegram.messenger",
    schemeUrl: "tg://",
    webFallback: "https://web.telegram.org/",
    label: "Telegram",
  },
  snapchat: {
    androidPkg: "com.snapchat.android",
    schemeUrl: "snapchat://",
    webFallback: "https://www.snapchat.com/",
    label: "Snapchat",
  },
  facebook: {
    androidPkg: "com.facebook.katana",
    schemeUrl: "fb://",
    webFallback: "https://www.facebook.com/",
    label: "Facebook",
  },
  twitter: {
    androidPkg: "com.twitter.android",
    schemeUrl: "twitter://",
    webFallback: "https://x.com/",
    label: "X",
  },
  x: {
    androidPkg: "com.twitter.android",
    schemeUrl: "twitter://",
    webFallback: "https://x.com/",
    label: "X",
  },
  gmail: {
    androidPkg: "com.google.android.gm",
    schemeUrl: "mailto:",
    webFallback: "https://mail.google.com/",
    label: "Gmail",
  },
  maps: {
    androidPkg: "com.google.android.apps.maps",
    schemeUrl: "geo:0,0",
    webFallback: "https://maps.google.com/",
    label: "Google Maps",
  },
  netflix: {
    androidPkg: "com.netflix.mediaclient",
    schemeUrl: "nflx://",
    webFallback: "https://www.netflix.com/",
    label: "Netflix",
  },
  amazon: {
    androidPkg: "in.amazon.mShop.android.shopping",
    schemeUrl: "com.amazon.mobile.shopping://",
    webFallback: "https://www.amazon.in/",
    label: "Amazon",
  },
  flipkart: {
    androidPkg: "com.flipkart.android",
    schemeUrl: "flipkart://",
    webFallback: "https://www.flipkart.com/",
    label: "Flipkart",
  },
  paytm: {
    androidPkg: "net.one97.paytm",
    schemeUrl: "paytmmp://",
    webFallback: "https://paytm.com/",
    label: "Paytm",
  },
  phonepe: {
    androidPkg: "com.phonepe.app",
    schemeUrl: "phonepe://",
    webFallback: "https://www.phonepe.com/",
    label: "PhonePe",
  },
  gpay: {
    androidPkg: "com.google.android.apps.nbu.paisa.user",
    schemeUrl: "tez://upi/",
    webFallback: "https://pay.google.com/",
    label: "Google Pay",
  },
  phone: {
    androidPkg: "com.google.android.dialer",
    schemeUrl: "tel:",
    webFallback: "tel:",
    label: "Phone Dialer",
  },
  dialer: {
    androidPkg: "com.google.android.dialer",
    schemeUrl: "tel:",
    webFallback: "tel:",
    label: "Phone Dialer",
  },
  messages: {
    androidPkg: "com.google.android.apps.messaging",
    schemeUrl: "sms:",
    webFallback: "sms:",
    label: "Messages",
  },
  playstore: {
    androidPkg: "com.android.vending",
    schemeUrl: "market://details?id=com.whatsapp",
    webFallback: "https://play.google.com/store",
    label: "Play Store",
  },
};

function navigateLink(href: string, newTab: boolean): void {
  const a = document.createElement("a");
  a.href = href;
  if (newTab) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function launchRealApp(appName: string): {
  ok: boolean;
  mode: "native-apk" | "android-intent" | "web-fallback";
  label: string;
  url?: string;
  error?: string;
} {
  const trimmed = appName.trim();
  const key = trimmed.toLowerCase().replace(/\s+/g, "");

  // 1. Inside native Android APK -> launches ANY installed app on the phone!
  if (isRunningInsideNativeApk() && window.SaifixNative?.openApp) {
    try {
      const raw = window.SaifixNative.openApp(trimmed);
      const parsed = JSON.parse(raw) as {
        ok: boolean;
        label?: string;
        error?: string;
      };
      return {
        ok: parsed.ok,
        mode: "native-apk",
        label: parsed.label || trimmed,
        error: parsed.error,
      };
    } catch {
      // Fall back to intent
    }
  }

  const entry = APP_INTENT_MAP[key];
  const isAndroidBrowser =
    typeof navigator !== "undefined" &&
    /android/i.test(navigator.userAgent || "");

  if (entry) {
    if (isAndroidBrowser && entry.androidPkg) {
      const intentUrl = `intent://#Intent;package=${entry.androidPkg};S.browser_fallback_url=${encodeURIComponent(
        entry.webFallback
      )};end`;
      navigateLink(intentUrl, false);
      return {
        ok: true,
        mode: "android-intent",
        label: entry.label,
        url: entry.webFallback,
      };
    }

    const isNativeScheme = /^(tel|sms|mailto):/i.test(entry.webFallback);
    navigateLink(entry.webFallback, !isNativeScheme);
    return {
      ok: true,
      mode: "web-fallback",
      label: entry.label,
      url: entry.webFallback,
    };
  }

  // Fallback: Play Store / Web search for unknown app name
  const searchUrl = isAndroidBrowser
    ? `https://play.google.com/store/search?q=${encodeURIComponent(trimmed)}&c=apps`
    : `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
  navigateLink(searchUrl, true);
  return {
    ok: true,
    mode: "web-fallback",
    label: trimmed,
    url: searchUrl,
  };
}

export function executeNativeScreenControl(payload: {
  action: string;
  target?: string;
  x?: number;
  y?: number;
}): {
  ok: boolean;
  executed: string;
  requiresApk?: boolean;
  error?: string;
} {
  if (isRunningInsideNativeApk() && window.SaifixNative?.controlScreen) {
    try {
      const raw = window.SaifixNative.controlScreen(JSON.stringify(payload));
      return JSON.parse(raw) as {
        ok: boolean;
        executed: string;
        error?: string;
      };
    } catch (err: unknown) {
      return {
        ok: false,
        executed: payload.action,
        error:
          err instanceof Error ? err.message : "Native screen command failed.",
      };
    }
  }

  // Browser-scope safe control actions
  const act = payload.action.toLowerCase();
  if (act === "scroll_down") {
    window.scrollBy({ top: 360, behavior: "smooth" });
    return { ok: true, executed: "scroll_down" };
  }
  if (act === "scroll_up") {
    window.scrollBy({ top: -360, behavior: "smooth" });
    return { ok: true, executed: "scroll_up" };
  }
  if (act === "back") {
    window.history.back();
    return { ok: true, executed: "back" };
  }

  return {
    ok: false,
    executed: act,
    requiresApk: true,
    error:
      "Cross-app screen tapping/control requires installing the Android APK with Accessibility permission enabled.",
  };
}
