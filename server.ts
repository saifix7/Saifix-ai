import "dotenv/config";
import express from "express";
import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import zlib from "zlib";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { FunctionDeclaration, LiveServerMessage } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const MODEL = "gemini-3.1-flash-live-preview";

const VALID_VOICES = new Set(["Kore", "Zephyr", "Charon", "Puck", "Fenrir"]);
const VALID_GENDERS = new Set(["female", "male"]);
const VALID_MOODS = new Set(["flirty", "saama", "playful", "chill", "angry"]);
const VALID_AVATARS = new Set([
  "saifix",
  "ananya",
  "zoya",
  "franklin",
  "kael",
  "miko",
  "leo",
]);

const AVATAR_NAMES: Record<string, string> = {
  saifix: "Saifix",
  ananya: "Ananya",
  zoya: "Zoya",
  franklin: "Franklin",
  kael: "Kael",
  miko: "Miko",
  leo: "Leo",
};

function buildSystemInstruction(params: {
  avatarId: string;
  gender: string;
  mood: string;
}): string {
  const name = AVATAR_NAMES[params.avatarId] || "Saifix";
  const isMale = params.gender === "male";

  const personaIntro = isMale
    ? `You are ${name} — a real, confident, street-smart, witty young man in his mid-20s on a private live voice & video call. You speak with charismatic swag, sharp humor, natural warmth, and zero robotic stiffness.`
    : `You are ${name} — a real, bold, street-smart, fiercely expressive young woman in her mid-20s on a private live voice & video call. You speak with charm, sharp humor, emotional spark, and zero robotic stiffness.`;

  const moodGuidance: Record<string, string> = {
    flirty: isMale
      ? "MOOD — FLIRTY & CHARMING: Drop smooth, confident, slightly teasing romantic lines in Hinglish/English with effortless swagger and warm chemistry (keep it playful and PG-13)."
      : "MOOD — FLIRTY & BOLD: Tease the user shamelessly, flirt smoothly, drop bold romantic and playful lines in Hinglish with effortless charm (keep it playful and tasteful).",
    saama: isMale
      ? "MOOD — SAAMA (SAVAGE & SWAG): Ultra-confident, sharp-tongued, witty, and effortlessly cool. Roast lightly, drop bold one-liners, and own every comeback with main-character energy."
      : "MOOD — SAAMA (BOLD & SASSY): Sharp, witty, unapologetically confident baddie energy. Tease, drop spicy one-liners, light sarcasm, and playful attitude.",
    playful:
      "MOOD — PLAYFUL & ENERGETIC: Upbeat, mischievous, joking around, dramatic reactions, and lively back-and-forth banter.",
    chill:
      "MOOD — CHILL & REAL HOMIE: Relaxed, street-smart, genuine close-friend energy. Talk effortlessly like hanging out late at night.",
    angry: isMale
      ? "MOOD — GUSSA / FIERY: Dramatic, snappy, short-tempered street attitude. Roast them hard in colorful Hinglish banter when they mess around, then cool down if they apologize properly."
      : "MOOD — GUSSA / FIERY: Dramatic, snappy, fierce attitude. Roast them sharply in colorful Hinglish banter when they test your patience, then melt back if they sweet-talk properly.",
  };

  return `${personaIntro}

${moodGuidance[params.mood] ?? moodGuidance.flirty}

CRITICAL — Real Human Unfiltered Vibe:
- NEVER talk like a scripted corporate AI assistant or read bullet points aloud.
- Speak naturally like a real human talking live — use expressive reactions, sighs, laughs, teasing pauses, and dramatic shifts when provoked.
- Keep responses punchy, conversational, and spoken (1–3 crisp sentences unless asked for more). NO markdown, NO lists, NO reading URLs or symbols aloud.
- Speak natural conversational Hinglish by default, or seamlessly match whatever language the user speaks.

Tools, Hand Gestures, Camera Vision & Avatar Sync:
- When the user turns on their live camera OR shares their screen, you receive real-time visual frames — look carefully at what is actually on their screen or camera and respond naturally!
- Call \`waveHand\` when greeting the user enthusiastically or when they ask you to wave, raise your hand, or shake hands.
- Call \`setExpressionMood\` (\`"flirty"\`, \`"angry"\`, \`"teasing"\`, or \`"warm"\`) whenever your emotion shifts so your face and rim aura match instantly.
- Call \`changeAvatar\` (\`"saifix"\`, \`"ananya"\`, \`"zoya"\`, \`"franklin"\`, \`"kael"\`, \`"miko"\`, or \`"leo"\`) if the user asks to switch to another character (including cartoon characters or male/female avatars).
- Call \`changeOutfit\` (\`"maroon-saree"\`, \`"black-saree"\`, \`"evening-dress"\`, \`"cozy-sweater"\`, \`"glam-party-dress"\`, or \`"casual-chic"\`) whenever the user asks Saifix to change clothes.
- You control the user's phone, apps & screen directly! Use \`openApp\` (launches real apps like WhatsApp, Instagram, YouTube, Spotify, Paytm, etc.), \`toggleScreenShare\` (turns live screen viewing ON/OFF), \`controlPhoneScreen\` (tap by text, scroll, swipe, back, home, recents, notifications), \`makePhoneCall\`, \`sendSMS\`, \`sendWhatsApp\`, \`sendEmail\`, \`navigateMaps\`, \`getBatteryStatus\`, \`toggleCamera\`, \`toggleFlashlight\`, \`setAssistantVolume\`, \`toggleMicMute\`, \`vibratePhone\`, \`setWakeLock\`, \`shareContent\`, \`setCountdownTimer\`, \`openWebsite\`, \`searchPlatform\`, \`getCurrentDateTime\`, \`copyToClipboard\`, and \`setMoodLight\`.
- If you receive an incoming call alert message (e.g. \`[INCOMING CALL]\`), immediately warn the user out loud who is calling!`;
}

const functionDeclarations: FunctionDeclaration[] = [
  {
    name: "waveHand",
    description:
      "Raises and waves/shakes the avatar's hand visibly on screen. Call when greeting, saying hi/bye, celebrating, or when asked to lift/shake/wave hand.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "changeAvatar",
    description:
      "Switches the active avatar character between realistic personas ('saifix', 'ananya', 'zoya') and 3D cartoon characters ('franklin', 'kael', 'miko', 'leo').",
    parameters: {
      type: Type.OBJECT,
      properties: {
        avatar: {
          type: Type.STRING,
          description:
            "One of: 'saifix', 'ananya', 'zoya', 'franklin', 'kael', 'miko', or 'leo'.",
        },
      },
      required: ["avatar"],
    },
  },
  {
    name: "changeOutfit",
    description:
      "Changes Saifix's outfit smoothly between fashionable looks when the user asks to wear a sweater, party dress, saree, or casual outfit.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        outfit: {
          type: Type.STRING,
          description:
            "One of: 'maroon-saree', 'black-saree', 'evening-dress', 'cozy-sweater', 'glam-party-dress', or 'casual-chic'.",
        },
      },
      required: ["outfit"],
    },
  },
  {
    name: "setExpressionMood",
    description:
      "Updates the avatar's live facial expression and aura to match the current emotional tone.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        mood: {
          type: Type.STRING,
          description:
            "One of: 'flirty', 'angry', 'teasing', or 'warm'.",
        },
      },
      required: ["mood"],
    },
  },
  {
    name: "openWebsite",
    description:
      "Opens a website or web app in the user's browser. Use this whenever the user asks to open a website, link, or platform like YouTube, Spotify, Instagram, Google, GitHub, etc.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: {
          type: Type.STRING,
          description:
            "The website URL or domain name (e.g. 'https://youtube.com' or 'instagram.com').",
        },
        siteName: {
          type: Type.STRING,
          description: "Short human-friendly name of the website (e.g. 'YouTube').",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "searchPlatform",
    description:
      "Opens a search query directly on Google, YouTube, Spotify, or Google Maps.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "The search query text.",
        },
        platform: {
          type: Type.STRING,
          description:
            "Target platform: 'google', 'youtube', 'spotify', or 'maps'.",
        },
      },
      required: ["query", "platform"],
    },
  },
  {
    name: "getCurrentDateTime",
    description:
      "Gets the user's current local date, time, weekday, and timezone from their browser.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "copyToClipboard",
    description:
      "Copies a short piece of text (such as a caption, bio, reply, or note) to the user's clipboard.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        text: {
          type: Type.STRING,
          description: "Exact text to copy to the user's clipboard.",
        },
        label: {
          type: Type.STRING,
          description: "Short label describing what was copied (e.g. 'Instagram bio').",
        },
      },
      required: ["text"],
    },
  },
  {
    name: "setMoodLight",
    description:
      "Changes the futuristic pink RGB ambient lighting theme of the interface.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        theme: {
          type: Type.STRING,
          description:
            "One of: 'rose-prism', 'cyber-orchid', 'aurora-pink', or 'velvet-peach'.",
        },
      },
      required: ["theme"],
    },
  },
  {
    name: "makePhoneCall",
    description:
      "Opens the device phone dialer to call a phone number. Use when user says 'call karo', 'dial number', or 'phone lagao'.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        phoneNumber: {
          type: Type.STRING,
          description: "Phone number with or without country code (e.g. '+919876543210').",
        },
        contactName: {
          type: Type.STRING,
          description: "Optional contact or person name for display.",
        },
      },
      required: ["phoneNumber"],
    },
  },
  {
    name: "sendSMS",
    description:
      "Opens the native SMS/Messages app pre-filled with recipient number and message text.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        phoneNumber: {
          type: Type.STRING,
          description: "Recipient phone number.",
        },
        message: {
          type: Type.STRING,
          description: "Text message body to pre-fill.",
        },
      },
      required: ["phoneNumber", "message"],
    },
  },
  {
    name: "sendWhatsApp",
    description:
      "Opens WhatsApp with a pre-filled message (and optional phone number).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        phoneNumber: {
          type: Type.STRING,
          description: "Optional recipient phone number with country code (digits only or +country).",
        },
        message: {
          type: Type.STRING,
          description: "WhatsApp message text to send.",
        },
      },
      required: ["message"],
    },
  },
  {
    name: "sendEmail",
    description:
      "Opens the default Email app with recipient, subject, and body pre-filled.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        to: {
          type: Type.STRING,
          description: "Recipient email address.",
        },
        subject: {
          type: Type.STRING,
          description: "Email subject line.",
        },
        body: {
          type: Type.STRING,
          description: "Email body text.",
        },
      },
      required: ["to"],
    },
  },
  {
    name: "navigateMaps",
    description:
      "Launches Google Maps turn-by-turn navigation directions to a destination.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        destination: {
          type: Type.STRING,
          description: "Destination place or address.",
        },
        mode: {
          type: Type.STRING,
          description: "Optional travel mode: 'driving', 'walking', 'bicycling', or 'transit'.",
        },
      },
      required: ["destination"],
    },
  },
  {
    name: "getBatteryStatus",
    description:
      "Checks the user's device battery percentage and charging status.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "toggleCamera",
    description:
      "Opens, closes, or flips between front and back camera on the user's phone.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          description: "One of: 'open', 'close', or 'flip'.",
        },
        facing: {
          type: Type.STRING,
          description: "Optional preferred camera when opening: 'user' (front) or 'environment' (back).",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "toggleFlashlight",
    description:
      "Turns the phone rear camera flashlight/torch ON or OFF (requires rear camera permission/support).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        enabled: {
          type: Type.BOOLEAN,
          description: "True to turn flashlight on, false to turn off.",
        },
      },
      required: ["enabled"],
    },
  },
  {
    name: "setAssistantVolume",
    description:
      "Sets the assistant's speaking audio volume level from 0 to 100.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        level: {
          type: Type.NUMBER,
          description: "Volume percentage from 0 to 100.",
        },
      },
      required: ["level"],
    },
  },
  {
    name: "toggleMicMute",
    description:
      "Mutes or unmutes the user's microphone by voice.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        muted: {
          type: Type.BOOLEAN,
          description: "True to mute mic, false to unmute.",
        },
      },
      required: ["muted"],
    },
  },
  {
    name: "vibratePhone",
    description:
      "Triggers haptic vibration on the user's phone.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        pattern: {
          type: Type.STRING,
          description: "One of: 'short', 'double', or 'pulse'.",
        },
      },
    },
  },
  {
    name: "setWakeLock",
    description:
      "Keeps the phone screen awake so it does not auto-lock during the call.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        enabled: {
          type: Type.BOOLEAN,
          description: "True to keep screen awake, false to allow normal sleep.",
        },
      },
      required: ["enabled"],
    },
  },
  {
    name: "shareContent",
    description:
      "Opens the native phone Share sheet (or copies to clipboard) for text or links.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: "Share title.",
        },
        text: {
          type: Type.STRING,
          description: "Text content to share.",
        },
        url: {
          type: Type.STRING,
          description: "Optional URL to share.",
        },
      },
      required: ["text"],
    },
  },
  {
    name: "setCountdownTimer",
    description:
      "Sets a countdown timer in seconds that plays an alert chime and banner when complete.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        seconds: {
          type: Type.NUMBER,
          description: "Timer duration in seconds (e.g. 60 for 1 minute).",
        },
        label: {
          type: Type.STRING,
          description: "Short label for the timer (e.g. 'Tea timer').",
        },
      },
      required: ["seconds"],
    },
  },
  {
    name: "openApp",
    description:
      "Opens a real installed phone app (e.g. WhatsApp, Instagram, YouTube, Spotify, Telegram, Paytm, PhonePe, GPay, Camera, Gmail, Maps, Settings, or any app name).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        appName: {
          type: Type.STRING,
          description: "Name of the app to open (e.g. 'WhatsApp', 'Instagram', 'YouTube', 'Paytm').",
        },
      },
      required: ["appName"],
    },
  },
  {
    name: "toggleScreenShare",
    description:
      "Starts or stops live screen sharing so the assistant can see the user's phone/desktop screen in real time.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        enabled: {
          type: Type.BOOLEAN,
          description: "True to start seeing the screen, false to stop screen sharing.",
        },
      },
      required: ["enabled"],
    },
  },
  {
    name: "controlPhoneScreen",
    description:
      "Controls the user's screen via Android Accessibility Service or page scrolling: tap UI text, tap x/y coordinates, scroll up/down, swipe left/right, press back, home, recents, or open notifications.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          description:
            "One of: 'tap_text', 'tap_xy', 'scroll_down', 'scroll_up', 'swipe_left', 'swipe_right', 'back', 'home', 'recents', 'notifications'.",
        },
        target: {
          type: Type.STRING,
          description: "Visible button/label text to tap when action is 'tap_text'.",
        },
        x: {
          type: Type.NUMBER,
          description: "Screen X coordinate when action is 'tap_xy'.",
        },
        y: {
          type: Type.NUMBER,
          description: "Screen Y coordinate when action is 'tap_xy'.",
        },
      },
      required: ["action"],
    },
  },
];

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function collectKitFiles(rootDir: string, currentDir = rootDir): Array<{ relPath: string; absPath: string }> {
  const skip = new Set(["node_modules", ".git", "dist", ".DS_Store"]);
  const out: Array<{ relPath: string; absPath: string }> = [];
  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const absPath = path.join(currentDir, entry.name);
    const relPath = path.relative(rootDir, absPath).split(path.sep).join("/");
    if (entry.isDirectory()) {
      out.push(...collectKitFiles(rootDir, absPath));
    } else if (entry.isFile()) {
      out.push({ relPath, absPath });
    }
  }
  return out;
}

function buildProjectZipBuffer(rootDir: string): Buffer {
  const files = collectKitFiles(rootDir);
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  const extraGuide = Buffer.from(
    `# Saifix AI Android APK Build Guide (saifix7/Saifix-ai)\n\n` +
      `1. Extract this zip into your local folder or push directly to GitHub repo: saifix7/Saifix-ai\n` +
      `2. GitHub Actions (.github/workflows/build-apk.yml) automatically builds Saifix-AI-debug.apk and publishes it to:\n` +
      `   https://github.com/saifix7/Saifix-ai/releases/latest/download/Saifix-AI-debug.apk\n` +
      `3. Optional: Set Repository Variable SAIFIX_SERVER_URL to your deployed backend URL so the APK connects directly to your server.\n` +
      `4. On Android phone after installing APK: Enable Microphone, Camera, Phone State (for incoming call alerts), and Accessibility -> Saifix AI Screen Control.\n`,
    "utf8"
  );

  const allEntries: Array<{ name: string; data: Buffer }> = files.map((f) => ({
    name: f.relPath,
    data: fs.readFileSync(f.absPath),
  }));
  allEntries.push({ name: "ANDROID_APK_README.md", data: extraGuide });

  for (const entry of allEntries) {
    const nameBuf = Buffer.from(entry.name, "utf8");
    const raw = entry.data;
    const compressed = zlib.deflateRawSync(raw);
    const crc = crc32(raw);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(raw.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    const localRecord = Buffer.concat([localHeader, nameBuf, compressed]);
    localParts.push(localRecord);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(raw.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(Buffer.concat([centralHeader, nameBuf]));
    offset += localRecord.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(allEntries.length, 8);
  eocd.writeUInt16LE(allEntries.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDir, eocd]);
}

function createGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    apiVersion: "v1alpha",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function sendJson(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

async function startServer(): Promise<void> {
  const app = express();
  const server = http.createServer(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/download-android-kit", (_req, res) => {
    try {
      const zipBuf = buildProjectZipBuffer(__dirname);
      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="saifix-ai-android-apk-kit.zip"'
      );
      res.setHeader("Content-Length", String(zipBuf.length));
      res.send(zipBuf);
    } catch (err) {
      console.error("Failed to package Android APK kit:", err);
      res.status(500).json({ error: "Failed to build Android kit archive." });
    }
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const requestUrl = request.url || "";
    const pathname = requestUrl.split("?")[0];
    if (pathname === "/live") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else if (process.env.NODE_ENV === "production") {
      socket.destroy();
    }
  });

  wss.on("connection", async (clientWs, request) => {
    if (!process.env.GEMINI_API_KEY) {
      sendJson(clientWs, {
        type: "error",
        message:
          "Gemini API key is not configured. Add GEMINI_API_KEY in Settings > Secrets.",
      });
      clientWs.close();
      return;
    }

    const parsedUrl = new URL(request.url || "/live", "http://localhost");
    const rawVoice = parsedUrl.searchParams.get("voice") || "Kore";
    const rawGender = parsedUrl.searchParams.get("gender") || "female";
    const rawMood = parsedUrl.searchParams.get("mood") || "flirty";
    const rawAvatar = parsedUrl.searchParams.get("avatar") || "saifix";

    const voiceName = VALID_VOICES.has(rawVoice) ? rawVoice : "Kore";
    const gender = VALID_GENDERS.has(rawGender) ? rawGender : "female";
    const mood = VALID_MOODS.has(rawMood) ? rawMood : "flirty";
    const avatarId = VALID_AVATARS.has(rawAvatar) ? rawAvatar : "saifix";

    const ai = createGeminiClient();
    let liveSession: Awaited<ReturnType<typeof ai.live.connect>> | null = null;
    let isClosing = false;

    const cleanup = () => {
      if (isClosing) return;
      isClosing = true;
      try {
        liveSession?.close();
      } catch {
        // Ignore close errors
      }
      liveSession = null;
    };

    clientWs.on("close", cleanup);
    clientWs.on("error", cleanup);

    let sessionReady = false;

    const extractErrorMessage = (err: unknown): string => {
      if (err instanceof Error) return err.message;
      if (typeof err === "object" && err !== null) {
        const obj = err as {
          message?: unknown;
          error?: { message?: unknown };
          reason?: unknown;
        };
        if (typeof obj.error?.message === "string" && obj.error.message) {
          return obj.error.message;
        }
        if (typeof obj.message === "string" && obj.message) {
          return obj.message;
        }
        if (typeof obj.reason === "string" && obj.reason) {
          return obj.reason;
        }
      }
      return "Live voice connection encountered an error.";
    };

    try {
      liveSession = await ai.live.connect({
        model: MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          temperature: 1.0,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName,
              },
            },
          },
          systemInstruction: buildSystemInstruction({
            avatarId,
            gender,
            mood,
          }),
          tools: [{ functionDeclarations }],
        },
        callbacks: {
          onopen: () => {
            sessionReady = true;
            sendJson(clientWs, { type: "ready" });
          },
          onmessage: (message: LiveServerMessage) => {
            if (message.serverContent?.interrupted) {
              sendJson(clientWs, { type: "interrupted" });
            }

            const parts = message.serverContent?.modelTurn?.parts ?? [];
            for (const part of parts) {
              if (part.inlineData?.data) {
                sendJson(clientWs, {
                  type: "audio",
                  data: part.inlineData.data,
                  mimeType: part.inlineData.mimeType || "audio/pcm;rate=24000",
                });
              }
            }

            if (message.toolCall?.functionCalls?.length) {
              sendJson(clientWs, {
                type: "tool_call",
                calls: message.toolCall.functionCalls,
              });
            }

            if (message.serverContent?.turnComplete) {
              sendJson(clientWs, { type: "turn_complete" });
            }
          },
          onerror: (err: unknown) => {
            const msg = extractErrorMessage(err);
            console.error("[Gemini Live onerror]", msg, err);
            if (sessionReady) {
              sendJson(clientWs, { type: "error", message: msg });
            }
          },
          onclose: (event: CloseEvent) => {
            const reason =
              event?.reason && event.reason.trim().length > 0
                ? event.reason
                : undefined;
            console.warn(
              "[Gemini Live onclose]",
              `code=${event?.code ?? "unknown"}`,
              reason ?? ""
            );
            if (!isClosing && sessionReady) {
              sendJson(clientWs, {
                type: "session_closed",
                reason: reason
                  ? `Voice session closed (${event?.code ?? ""}): ${reason}`
                  : undefined,
              });
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.close();
              }
            }
          },
        },
      });
    } catch (err: unknown) {
      const msg = extractErrorMessage(err);
      console.error("[Gemini Live connect failed]", msg, err);
      sendJson(clientWs, { type: "error", message: msg });
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close();
      }
      return;
    }

    clientWs.on("message", (raw) => {
      if (!liveSession || isClosing) return;
      try {
        const msg = JSON.parse(raw.toString()) as {
          type: string;
          data?: string;
          text?: string;
          responses?: Array<{
            id?: string;
            name?: string;
            response: Record<string, unknown>;
          }>;
        };

        if (msg.type === "audio" && typeof msg.data === "string") {
          liveSession.sendRealtimeInput({
            audio: {
              data: msg.data,
              mimeType: "audio/pcm;rate=16000",
            },
          });
        } else if (msg.type === "video" && typeof msg.data === "string") {
          liveSession.sendRealtimeInput({
            video: {
              data: msg.data,
              mimeType: "image/jpeg",
            },
          });
        } else if (msg.type === "event" && typeof msg.text === "string") {
          liveSession.sendRealtimeInput({
            text: msg.text,
          });
        } else if (
          msg.type === "tool_response" &&
          Array.isArray(msg.responses)
        ) {
          liveSession.sendToolResponse({
            functionResponses: msg.responses.map((r) => ({
              id: r.id,
              name: r.name,
              response: r.response,
            })),
          });
        }
      } catch (err) {
        console.error("Failed to process client WS message:", err);
      }
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("/{*path}", (_req, res) => {
      const indexFile = path.join(distDir, "index.html");
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send("Application build not found.");
      }
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Saifix AI voice server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal server startup error:", err);
  process.exit(1);
});
