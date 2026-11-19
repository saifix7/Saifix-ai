import { useEffect, useRef, useState } from "react";
import type { AudioStreamer } from "../audio/AudioStreamer";
import type {
  AvatarId,
  AvatarMood,
  AvatarOutfit,
  MoodTheme,
  SessionState,
} from "../types/voice";

export const OUTFIT_IMAGES: Record<AvatarOutfit, string> = {
  "maroon-saree":
    "/assets/aistudio/file_000000009a4082118e8a22d1409a520e_de64e46a.png",
  "black-saree": "/src/assets/images/saifix_black_saree_1794996769307.jpg",
  "cozy-sweater": "/src/assets/images/saifix_sweater_look_1794997195638.jpg",
  "glam-party-dress": "/src/assets/images/saifix_glam_dress_1794997199999.jpg",
  "evening-dress": "/src/assets/images/saifix_evening_dress_1794996769547.jpg",
  "casual-chic": "/src/assets/images/saifix_casual_chic_1794996770230.jpg",
};

export const AVATAR_IMAGES: Record<Exclude<AvatarId, "saifix">, string> = {
  ananya: "/src/assets/images/avatar_ananya_1794997195636.jpg",
  zoya: "/src/assets/images/avatar_zoya_1794997195555.jpg",
  franklin: "/src/assets/images/avatar_franklin_cartoon_1795004728263.jpg",
  kael: "/src/assets/images/avatar_kael_cartoon_1795004728106.jpg",
  miko: "/src/assets/images/avatar_miko_cartoon_1795004728420.jpg",
  leo: "/src/assets/images/avatar_leo_cartoon_1795004729341.jpg",
};

export const AVATAR_THUMBNAILS: Record<AvatarId, string> = {
  saifix: OUTFIT_IMAGES["maroon-saree"],
  ananya: AVATAR_IMAGES.ananya,
  zoya: AVATAR_IMAGES.zoya,
  franklin: AVATAR_IMAGES.franklin,
  kael: AVATAR_IMAGES.kael,
  miko: AVATAR_IMAGES.miko,
  leo: AVATAR_IMAGES.leo,
};

interface AvatarProfile {
  mouthCenter: [number, number];
  leftEye: [number, number];
  rightEye: [number, number];
  leftBrow: [number, number];
  rightBrow: [number, number];
  innerBrow: [number, number];
  neckPivot: [number, number];
  headCutoffY: number;
  faceTilt: number;
  handStrength: number;
  handCenter: [number, number];
  wristPivot: [number, number];
  forearmCenter: [number, number];
  eyeScale: number;
  basePoise: number;
}

const AVATAR_PROFILES: Record<AvatarId, AvatarProfile> = {
  saifix: {
    mouthCenter: [0.478, 0.39],
    leftEye: [0.389, 0.2745],
    rightEye: [0.508, 0.2325],
    leftBrow: [0.378, 0.228],
    rightBrow: [0.495, 0.1875],
    innerBrow: [0.432, 0.21],
    neckPivot: [0.5, 0.55],
    headCutoffY: 0.66,
    faceTilt: -0.31,
    handStrength: 1.0,
    handCenter: [0.86, 0.88],
    wristPivot: [0.95, 1.04],
    forearmCenter: [0.95, 1.1],
    eyeScale: 1.0,
    basePoise: 0.032,
  },
  ananya: {
    mouthCenter: [0.492, 0.642],
    leftEye: [0.425, 0.522],
    rightEye: [0.555, 0.5175],
    leftBrow: [0.422, 0.468],
    rightBrow: [0.556, 0.465],
    innerBrow: [0.492, 0.4725],
    neckPivot: [0.495, 0.78],
    headCutoffY: 0.9,
    faceTilt: 0.0,
    handStrength: 0.0,
    handCenter: [0.8, 1.1],
    wristPivot: [0.85, 1.25],
    forearmCenter: [0.88, 1.3],
    eyeScale: 1.0,
    basePoise: 0.014,
  },
  zoya: {
    mouthCenter: [0.415, 0.672],
    leftEye: [0.375, 0.513],
    rightEye: [0.49, 0.528],
    leftBrow: [0.372, 0.465],
    rightBrow: [0.488, 0.477],
    innerBrow: [0.42, 0.474],
    neckPivot: [0.46, 0.795],
    headCutoffY: 0.92,
    faceTilt: 0.12,
    handStrength: 0.0,
    handCenter: [0.8, 1.1],
    wristPivot: [0.85, 1.25],
    forearmCenter: [0.88, 1.3],
    eyeScale: 1.0,
    basePoise: -0.012,
  },
  franklin: {
    mouthCenter: [0.562, 0.489],
    leftEye: [0.515, 0.378],
    rightEye: [0.635, 0.396],
    leftBrow: [0.51, 0.338],
    rightBrow: [0.638, 0.354],
    innerBrow: [0.574, 0.346],
    neckPivot: [0.555, 0.585],
    headCutoffY: 0.7,
    faceTilt: 0.11,
    handStrength: 1.0,
    handCenter: [0.295, 0.638],
    wristPivot: [0.24, 0.81],
    forearmCenter: [0.165, 0.953],
    eyeScale: 1.05,
    basePoise: 0.015,
  },
  kael: {
    mouthCenter: [0.514, 0.566],
    leftEye: [0.452, 0.443],
    rightEye: [0.572, 0.447],
    leftBrow: [0.446, 0.405],
    rightBrow: [0.578, 0.408],
    innerBrow: [0.512, 0.41],
    neckPivot: [0.51, 0.65],
    headCutoffY: 0.77,
    faceTilt: 0.02,
    handStrength: 1.0,
    handCenter: [0.55, 0.862],
    wristPivot: [0.665, 0.982],
    forearmCenter: [0.775, 1.05],
    eyeScale: 1.1,
    basePoise: -0.01,
  },
  miko: {
    mouthCenter: [0.538, 0.558],
    leftEye: [0.45, 0.432],
    rightEye: [0.602, 0.414],
    leftBrow: [0.448, 0.375],
    rightBrow: [0.6, 0.362],
    innerBrow: [0.525, 0.368],
    neckPivot: [0.53, 0.62],
    headCutoffY: 0.74,
    faceTilt: -0.08,
    handStrength: 1.0,
    handCenter: [0.195, 0.63],
    wristPivot: [0.235, 0.78],
    forearmCenter: [0.22, 0.96],
    eyeScale: 1.45,
    basePoise: 0.02,
  },
  leo: {
    mouthCenter: [0.542, 0.531],
    leftEye: [0.47, 0.417],
    rightEye: [0.6, 0.414],
    leftBrow: [0.466, 0.365],
    rightBrow: [0.598, 0.364],
    innerBrow: [0.532, 0.366],
    neckPivot: [0.535, 0.605],
    headCutoffY: 0.72,
    faceTilt: 0.0,
    handStrength: 1.0,
    handCenter: [0.19, 0.63],
    wristPivot: [0.185, 0.81],
    forearmCenter: [0.155, 1.005],
    eyeScale: 1.25,
    basePoise: 0.01,
  },
};

export function getAvatarTextureUrl(
  avatarId: AvatarId,
  outfit: AvatarOutfit
): string {
  if (avatarId === "saifix") {
    return OUTFIT_IMAGES[outfit];
  }
  return AVATAR_IMAGES[avatarId];
}

interface RealisticAvatarProps {
  sessionState: SessionState;
  isMuted: boolean;
  theme: MoodTheme;
  mood: AvatarMood;
  avatarId: AvatarId;
  outfit: AvatarOutfit;
  wavePulse: number;
  audioStreamer: AudioStreamer | null;
}

const THEME_GLOWS: Record<
  MoodTheme,
  {
    conic: string;
    rimColor: [number, number, number];
    glowShadow: string;
    waveColors: [string, string, string];
  }
> = {
  "rose-prism": {
    conic:
      "conic-gradient(from 0deg, #ff2e93, #ff79c6, #5efce8, #a855f7, #ff4ecd, #ff2e93)",
    rimColor: [1.0, 0.25, 0.62],
    glowShadow: "rgba(255, 46, 147, 0.42)",
    waveColors: ["#ff2e93", "#ff85d0", "#5efce8"],
  },
  "cyber-orchid": {
    conic:
      "conic-gradient(from 0deg, #e879f9, #38bdf8, #f43f5e, #c084fc, #fb7185, #e879f9)",
    rimColor: [0.91, 0.47, 0.98],
    glowShadow: "rgba(217, 70, 239, 0.42)",
    waveColors: ["#f43f5e", "#e879f9", "#38bdf8"],
  },
  "aurora-pink": {
    conic:
      "conic-gradient(from 0deg, #ff4791, #34d399, #ff99c8, #60a5fa, #ec4899, #ff4791)",
    rimColor: [1.0, 0.35, 0.65],
    glowShadow: "rgba(236, 72, 153, 0.42)",
    waveColors: ["#ff4791", "#ff99c8", "#34d399"],
  },
  "velvet-peach": {
    conic:
      "conic-gradient(from 0deg, #fb7185, #fda4af, #f59e0b, #ec4899, #f472b6, #fb7185)",
    rimColor: [0.98, 0.45, 0.55],
    glowShadow: "rgba(251, 113, 133, 0.42)",
    waveColors: ["#fb7185", "#f472b6", "#fbbf24"],
  },
};

const VERTEX_SHADER_SRC = `#version 300 es
precision highp float;

in vec2 a_position;

uniform float u_aspect;
uniform float u_time;
uniform float u_breath;
uniform float u_bodySway;
uniform float u_bodyLean;
uniform float u_headRoll;
uniform float u_headNod;
uniform float u_headSway;
uniform float u_pointerX;
uniform float u_pointerY;
uniform float u_blink;
uniform float u_browLift;
uniform float u_browFurrow;
uniform float u_teasingBrow;
uniform float u_smile;
uniform float u_jawOpen;
uniform float u_lipWidth;
uniform float u_handLift;
uniform float u_handSway;
uniform float u_handTwist;
uniform float u_armSway;
uniform float u_clothWave;
uniform float u_earLag;
uniform float u_speaking;

uniform vec2 u_mouthCenter;
uniform vec2 u_leftEye;
uniform vec2 u_rightEye;
uniform vec2 u_leftBrow;
uniform vec2 u_rightBrow;
uniform vec2 u_innerBrow;
uniform vec2 u_neckPivot;
uniform float u_headCutoffY;
uniform float u_faceTilt;
uniform float u_handStrength;
uniform vec2 u_handCenter;
uniform vec2 u_wristPivot;
uniform vec2 u_forearmCenter;
uniform float u_eyeScale;

out vec2 v_texCoord;
out vec2 v_mouthSq;
out vec2 v_leftEyeSq;
out vec2 v_rightEyeSq;
out float v_edgeGlow;

vec2 rotate2D(vec2 v, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec2(v.x * c - v.y * s, v.x * s + v.y * c);
}

vec2 toSquare(vec2 uv) {
  return vec2(uv.x, uv.y / u_aspect);
}

vec2 toUv(vec2 sq) {
  return vec2(sq.x, sq.y * u_aspect);
}

float gaussSq(vec2 p, vec2 center, vec2 radius) {
  vec2 d = (p - center) / radius;
  return exp(-dot(d, d));
}

void main() {
  vec2 uv = a_position;
  vec2 sq = toSquare(uv);
  vec2 def = sq;

  // --- 1. Full Upper-Body Sway, Lean & Breathing ---
  float upperBodyMask = smoothstep(1.48, 0.48, sq.y);
  vec2 hipPivot = vec2(0.50, 1.46);
  def = hipPivot + rotate2D(def - hipPivot, u_bodySway * 0.028 * upperBodyMask);
  def += (def - vec2(0.50, 0.72)) * (u_bodyLean * 0.024 * upperBodyMask);

  float chestW = gaussSq(sq, vec2(0.50, max(0.80, u_neckPivot.y + 0.25)), vec2(0.42, 0.40));
  def.y -= u_breath * 0.009 * chestW;
  def.x += (sq.x - 0.50) * u_breath * 0.0075 * chestW;

  // --- 2. Expressive Hand Raise, Hand Shake & Wave Rig ---
  if (u_handStrength > 0.01) {
    float handW = gaussSq(sq, u_handCenter, vec2(0.16, 0.20));
    float forearmW = gaussSq(sq, u_forearmCenter, vec2(0.16, 0.25));
    float handCombined = clamp(handW + forearmW * 0.62, 0.0, 1.0) * u_handStrength;

    // Rotate palm/fingers around wrist pivot for crisp waving & shaking
    def = u_wristPivot + rotate2D(def - u_wristPivot, u_handTwist * 0.165 * handCombined);
    // Lift hand distinctly upward + shake horizontally
    def.y -= u_handLift * 0.088 * handCombined;
    def.x += u_handSway * 0.042 * handCombined;

    // Subtle secondary shoulder/arm counterweight on opposite side
    vec2 oppPivot = vec2(0.14, 0.72);
    float oppArmW = gaussSq(sq, vec2(0.16, 1.14), vec2(0.18, 0.30));
    def = oppPivot + rotate2D(def - oppPivot, u_armSway * 0.045 * oppArmW * u_handStrength);
  }

  // --- 3. Flowing Cloth & Garment Ripples ---
  float garmentY = mix(1.06, 1.16, 1.0 - u_handStrength);
  float palluBandW = gaussSq(sq, vec2(0.58, garmentY), vec2(0.32, 0.30));
  float lowerSareeW = gaussSq(sq, vec2(0.52, 1.28), vec2(0.40, 0.28));
  float clothMask = clamp(palluBandW + lowerSareeW * 0.85, 0.0, 1.0);

  float fabricWave1 = sin(u_time * 2.5 + sq.x * 13.0 - sq.y * 10.0);
  float fabricWave2 = cos(u_time * 1.8 - sq.x * 9.0 + sq.y * 14.0);
  def.y -= (u_handLift * 0.018 * u_handStrength + fabricWave1 * 0.0044 * u_clothWave) * clothMask;
  def.x += (u_handSway * 0.012 * u_handStrength + fabricWave2 * 0.0038 * u_clothWave) * clothMask;

  // --- 4. Poised Head & Neck Articulation ---
  float headMask =
    smoothstep(u_headCutoffY, u_headCutoffY - 0.27, sq.y) *
    smoothstep(0.06, 0.22, sq.x) *
    smoothstep(0.94, 0.72, sq.x);
  float neckMask = gaussSq(sq, u_neckPivot - vec2(0.01, 0.05), vec2(0.22, 0.16));
  float headWeight = clamp(headMask + neckMask * 0.45, 0.0, 1.0);

  float totalRoll = u_headRoll + u_pointerX * 0.022;
  def = u_neckPivot + rotate2D(def - u_neckPivot, totalRoll * headWeight);
  def.x += (u_headSway + u_pointerX * 0.014) * headWeight;
  def.y += (u_headNod + u_pointerY * 0.014) * headWeight;

  // --- 5. Hair Secondary Physics ---
  float hairCascadeW = gaussSq(sq, vec2(0.34, u_neckPivot.y + 0.12), vec2(0.20, 0.30));
  def.x += (u_earLag * 0.014 + sin(u_time * 1.7 + sq.y * 6.0) * 0.0028) * hairCascadeW;
  def.y += cos(u_time * 1.3 + sq.x * 8.0) * 0.0016 * hairCascadeW;

  // --- 6. Parameterized Facial Landmarks ---
  float leftBrowW = gaussSq(sq, u_leftBrow, vec2(0.046 * u_eyeScale, 0.028 * u_eyeScale));
  float rightBrowW = gaussSq(sq, u_rightBrow, vec2(0.048 * u_eyeScale, 0.028 * u_eyeScale));
  float innerBrowW = gaussSq(sq, u_innerBrow, vec2(0.036 * u_eyeScale, 0.028 * u_eyeScale));

  vec2 faceUpAxis = rotate2D(vec2(0.0, -1.0), u_faceTilt);
  def += faceUpAxis * (u_browLift * 0.009 * (leftBrowW + rightBrowW));
  def += faceUpAxis * (u_teasingBrow * 0.0085 * rightBrowW);
  def -= faceUpAxis * (u_browFurrow * 0.0095 * innerBrowW);
  def.x += (u_innerBrow.x - sq.x) * u_browFurrow * 0.15 * innerBrowW;

  vec2 lEyeRel = rotate2D(sq - u_leftEye, -u_faceTilt);
  vec2 rEyeRel = rotate2D(sq - u_rightEye, -u_faceTilt);

  float eyeRadX = 0.033 * u_eyeScale;
  float eyeRadY = 0.014 * u_eyeScale;
  float lEyeX = exp(-pow(lEyeRel.x / eyeRadX, 2.0));
  float rEyeX = exp(-pow(rEyeRel.x / eyeRadX, 2.0));

  float lUpperLid = lEyeX * exp(-pow((lEyeRel.y + 0.013 * u_eyeScale) / eyeRadY, 2.0));
  float lLowerLid = lEyeX * exp(-pow((lEyeRel.y - 0.011 * u_eyeScale) / (0.010 * u_eyeScale), 2.0));
  float rUpperLid = rEyeX * exp(-pow((rEyeRel.y + 0.013 * u_eyeScale) / eyeRadY, 2.0));
  float rLowerLid = rEyeX * exp(-pow((rEyeRel.y - 0.011 * u_eyeScale) / (0.010 * u_eyeScale), 2.0));

  float blinkTravel = (lUpperLid * (0.014 * u_eyeScale) - lLowerLid * (0.0035 * u_eyeScale) + rUpperLid * (0.014 * u_eyeScale) - rLowerLid * (0.0035 * u_eyeScale)) * u_blink;
  vec2 faceDownAxis = -faceUpAxis;
  def += faceDownAxis * blinkTravel;

  float pupilW =
    lEyeX * exp(-pow(lEyeRel.y / (0.013 * u_eyeScale), 2.0)) +
    rEyeX * exp(-pow(rEyeRel.y / (0.013 * u_eyeScale), 2.0));
  def.x += u_pointerX * 0.0025 * pupilW * (1.0 - u_blink);
  def.y += u_pointerY * 0.002 * pupilW * (1.0 - u_blink);

  // --- 7. Natural Lip Sync ---
  vec2 mRel = rotate2D(sq - u_mouthCenter, -u_faceTilt);
  vec2 mouthRightAxis = rotate2D(vec2(1.0, 0.0), u_faceTilt);
  vec2 mouthDownAxis = faceDownAxis;

  float lipXMask = exp(-pow(mRel.x / 0.052, 2.0));
  float jawXMask = exp(-pow(mRel.x / 0.082, 2.0));

  float upperAnchorLift = lipXMask * exp(-pow((mRel.y + 0.011) / 0.010, 2.0));
  float lowerPlateau =
    smoothstep(-0.001, 0.0055, mRel.y) *
    exp(-pow(max(0.0, mRel.y - 0.018) / 0.048, 2.0));

  def -= mouthDownAxis * (u_jawOpen * 0.0018 * upperAnchorLift);
  def += mouthDownAxis * (u_jawOpen * 0.0125 * lowerPlateau * jawXMask);

  float cornerW =
    exp(-pow(mRel.y / 0.022, 2.0)) *
    exp(-pow((abs(mRel.x) - 0.042) / 0.024, 2.0));
  def += mouthRightAxis * (sign(mRel.x) * u_lipWidth * 0.0038 * cornerW);

  float cheekW =
    exp(-pow((abs(mRel.x) - 0.058) / 0.034, 2.0)) *
    exp(-pow((mRel.y + 0.004) / 0.032, 2.0));
  def -= mouthDownAxis * (u_smile * 0.0042 * (cornerW + cheekW * 0.7));

  v_mouthSq = mRel;
  v_leftEyeSq = lEyeRel / u_eyeScale;
  v_rightEyeSq = rEyeRel / u_eyeScale;

  vec2 deformedUv = toUv(def);
  float edgePin =
    smoothstep(0.0, 0.035, uv.x) *
    smoothstep(1.0, 0.965, uv.x) *
    smoothstep(0.0, 0.035, uv.y) *
    smoothstep(1.0, 0.965, uv.y);
  deformedUv = uv + (deformedUv - uv) * edgePin;

  vec2 clipPos = vec2(deformedUv.x * 2.0 - 1.0, 1.0 - deformedUv.y * 2.0);
  gl_Position = vec4(clipPos, 0.0, 1.0);
  v_texCoord = uv;

  float borderDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  v_edgeGlow = smoothstep(0.20, 0.0, borderDist);
}
`;

const FRAGMENT_SHADER_SRC = `#version 300 es
precision highp float;

in vec2 v_texCoord;
in vec2 v_mouthSq;
in vec2 v_leftEyeSq;
in vec2 v_rightEyeSq;
in float v_edgeGlow;

uniform sampler2D u_textureA;
uniform sampler2D u_textureB;
uniform float u_mix;
uniform float u_jawOpen;
uniform float u_blink;
uniform float u_speaking;
uniform float u_listening;
uniform float u_angry;
uniform vec3 u_rimColor;

out vec4 outColor;

void main() {
  vec4 texA = texture(u_textureA, v_texCoord);
  vec4 texB = texture(u_textureB, v_texCoord);
  vec4 tex = mix(texA, texB, u_mix);
  vec3 color = tex.rgb;

  // --- 1. Soft Natural Lip-Parting Shadow ---
  if (u_jawOpen > 0.05) {
    float openH = 0.0016 + u_jawOpen * 0.0018;
    float openW = 0.034 - u_jawOpen * 0.003;
    vec2 cavityCenter = vec2(0.0, 0.0010);
    vec2 d = (v_mouthSq - cavityCenter) / vec2(openW, openH);
    float distSq = dot(d, d);
    float cavityMask = smoothstep(1.0, 0.20, distSq) * smoothstep(0.05, 0.22, u_jawOpen);

    vec3 naturalOralShadow = vec3(0.17, 0.045, 0.058);
    color = mix(color, naturalOralShadow, cavityMask * 0.72);
  }

  // --- 2. Natural Eyelid Crease Shading during Blink ---
  if (u_blink > 0.08) {
    float lCrease = exp(-pow(v_leftEyeSq.x / 0.032, 2.0)) * exp(-pow((v_leftEyeSq.y + 0.001) / 0.011, 2.0));
    float rCrease = exp(-pow(v_rightEyeSq.x / 0.032, 2.0)) * exp(-pow((v_rightEyeSq.y + 0.001) / 0.011, 2.0));
    float lidMask = clamp(lCrease + rCrease, 0.0, 1.0) * u_blink;
    vec3 warmLidTone = vec3(0.46, 0.30, 0.26);
    color = mix(color, warmLidTone, lidMask * 0.45);
  }

  // --- 3. Mood & Audio-Reactive Rim Lighting ---
  vec3 angryRim = vec3(1.0, 0.14, 0.22);
  vec3 activeRim = mix(u_rimColor, angryRim, u_angry);
  float rimStrength = v_edgeGlow * (0.09 + u_speaking * 0.18 + u_listening * 0.08 + u_angry * 0.12);
  color += activeRim * rimStrength;

  outColor = vec4(color, tex.a);
}
`;

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Avatar shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createGridMesh(cols: number, rows: number) {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let y = 0; y <= rows; y++) {
    for (let x = 0; x <= cols; x++) {
      positions.push(x / cols, y / rows);
    }
  }
  const stride = cols + 1;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i0 = y * stride + x;
      const i1 = i0 + 1;
      const i2 = i0 + stride;
      const i3 = i2 + 1;
      indices.push(i0, i2, i1, i1, i2, i3);
    }
  }
  return {
    positions: new Float32Array(positions),
    indices: new Uint16Array(indices),
  };
}

export function RealisticAvatar({
  sessionState,
  isMuted,
  theme,
  mood,
  avatarId,
  outfit,
  wavePulse,
  audioStreamer,
}: RealisticAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [webglReady, setWebglReady] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);

  const stateRef = useRef(sessionState);
  const mutedRef = useRef(isMuted);
  const themeRef = useRef(theme);
  const moodRef = useRef(mood);
  const avatarIdRef = useRef(avatarId);
  const outfitRef = useRef(outfit);
  const streamerRef = useRef(audioStreamer);
  const pointerRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const waveUntilRef = useRef(0);

  stateRef.current = sessionState;
  mutedRef.current = isMuted;
  themeRef.current = theme;
  moodRef.current = mood;
  avatarIdRef.current = avatarId;
  outfitRef.current = outfit;
  streamerRef.current = audioStreamer;

  useEffect(() => {
    if (wavePulse > 0) {
      waveUntilRef.current = performance.now() + 2400;
    }
  }, [wavePulse]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });

    if (!gl) {
      setFallbackMode(true);
      return;
    }

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
    if (!vs || !fs) {
      setFallbackMode(true);
      return;
    }

    const program = gl.createProgram();
    if (!program) {
      setFallbackMode(true);
      return;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Avatar program link error:", gl.getProgramInfoLog(program));
      setFallbackMode(true);
      return;
    }

    const mesh = createGridMesh(72, 108);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const idxBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

    let disposed = false;
    const textureCache = new Map<string, WebGLTexture>();
    const loadingUrls = new Set<string>();
    const initialUrl = getAvatarTextureUrl(
      avatarIdRef.current,
      outfitRef.current
    );
    let activeUrlA = initialUrl;
    let activeUrlB = initialUrl;
    let activeProfileAvatar: AvatarId = avatarIdRef.current;
    let mixValue = 0;

    const loadTextureUrl = (url: string) => {
      if (textureCache.has(url) || loadingUrls.has(url)) return;
      loadingUrls.add(url);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = url;
      img.onload = () => {
        loadingUrls.delete(url);
        if (disposed) return;
        const tex = gl.createTexture();
        if (!tex) return;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          img
        );
        textureCache.set(url, tex);
        if (textureCache.size === 1) {
          activeUrlA = url;
          activeUrlB = url;
          setWebglReady(true);
        }
      };
      img.onerror = () => {
        loadingUrls.delete(url);
        if (url === OUTFIT_IMAGES["maroon-saree"] && !disposed) {
          setFallbackMode(true);
        }
      };
    };

    loadTextureUrl(initialUrl);
    const preloadTimer = window.setTimeout(() => {
      Object.values(OUTFIT_IMAGES).forEach((url) => loadTextureUrl(url));
      Object.values(AVATAR_IMAGES).forEach((url) => loadTextureUrl(url));
    }, 600);

    const uniforms = {
      textureA: gl.getUniformLocation(program, "u_textureA"),
      textureB: gl.getUniformLocation(program, "u_textureB"),
      mix: gl.getUniformLocation(program, "u_mix"),
      aspect: gl.getUniformLocation(program, "u_aspect"),
      time: gl.getUniformLocation(program, "u_time"),
      breath: gl.getUniformLocation(program, "u_breath"),
      bodySway: gl.getUniformLocation(program, "u_bodySway"),
      bodyLean: gl.getUniformLocation(program, "u_bodyLean"),
      headRoll: gl.getUniformLocation(program, "u_headRoll"),
      headNod: gl.getUniformLocation(program, "u_headNod"),
      headSway: gl.getUniformLocation(program, "u_headSway"),
      pointerX: gl.getUniformLocation(program, "u_pointerX"),
      pointerY: gl.getUniformLocation(program, "u_pointerY"),
      blink: gl.getUniformLocation(program, "u_blink"),
      browLift: gl.getUniformLocation(program, "u_browLift"),
      browFurrow: gl.getUniformLocation(program, "u_browFurrow"),
      teasingBrow: gl.getUniformLocation(program, "u_teasingBrow"),
      smile: gl.getUniformLocation(program, "u_smile"),
      jawOpen: gl.getUniformLocation(program, "u_jawOpen"),
      lipWidth: gl.getUniformLocation(program, "u_lipWidth"),
      handLift: gl.getUniformLocation(program, "u_handLift"),
      handSway: gl.getUniformLocation(program, "u_handSway"),
      handTwist: gl.getUniformLocation(program, "u_handTwist"),
      armSway: gl.getUniformLocation(program, "u_armSway"),
      clothWave: gl.getUniformLocation(program, "u_clothWave"),
      earLag: gl.getUniformLocation(program, "u_earLag"),
      speaking: gl.getUniformLocation(program, "u_speaking"),
      listening: gl.getUniformLocation(program, "u_listening"),
      angry: gl.getUniformLocation(program, "u_angry"),
      rimColor: gl.getUniformLocation(program, "u_rimColor"),
      mouthCenter: gl.getUniformLocation(program, "u_mouthCenter"),
      leftEye: gl.getUniformLocation(program, "u_leftEye"),
      rightEye: gl.getUniformLocation(program, "u_rightEye"),
      leftBrow: gl.getUniformLocation(program, "u_leftBrow"),
      rightBrow: gl.getUniformLocation(program, "u_rightBrow"),
      innerBrow: gl.getUniformLocation(program, "u_innerBrow"),
      neckPivot: gl.getUniformLocation(program, "u_neckPivot"),
      headCutoffY: gl.getUniformLocation(program, "u_headCutoffY"),
      faceTilt: gl.getUniformLocation(program, "u_faceTilt"),
      handStrength: gl.getUniformLocation(program, "u_handStrength"),
      handCenter: gl.getUniformLocation(program, "u_handCenter"),
      wristPivot: gl.getUniformLocation(program, "u_wristPivot"),
      forearmCenter: gl.getUniformLocation(program, "u_forearmCenter"),
      eyeScale: gl.getUniformLocation(program, "u_eyeScale"),
    };

    const freqBins = new Uint8Array(64);
    const timeBins = new Uint8Array(128);
    const startTime = performance.now();
    let prevTime = startTime;

    let jawSmooth = 0;
    let widthSmooth = 0;
    let browSmooth = 0;
    let furrowSmooth = 0;
    let teasingBrowSmooth = 0;
    let smileSmooth = 0.25;
    let angrySmooth = 0;
    let speakingSmooth = 0;
    let listeningSmooth = 0;
    let inputSmooth = 0;
    let bodySwaySmooth = 0;
    let bodyLeanSmooth = 0;
    let handLiftSmooth = 0;
    let handSwaySmooth = 0;
    let handTwistSmooth = 0;
    let armSwaySmooth = 0;
    let clothWaveSmooth = 0.4;
    let waveBurstSmooth = 0;
    let earVel = 0;
    let earAngle = 0;
    let prevHeadRoll = 0;

    let nextBlinkAt = startTime + 1600;
    let blinkProgress = 0;
    let isBlinking = false;
    let doubleBlinkQueued = false;

    let rafId = 0;

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - prevTime) / 1000);
      prevTime = now;
      const t = (now - startTime) / 1000;

      const desiredAvatar = avatarIdRef.current;
      const desiredUrl = getAvatarTextureUrl(desiredAvatar, outfitRef.current);

      if (!textureCache.has(desiredUrl)) {
        loadTextureUrl(desiredUrl);
      } else if (desiredUrl !== activeUrlB) {
        activeUrlA = activeUrlB;
        activeUrlB = desiredUrl;
        activeProfileAvatar = desiredAvatar;
        mixValue = 0;
      }

      if (activeUrlA !== activeUrlB) {
        mixValue = Math.min(1, mixValue + dt * 2.6);
        if (mixValue >= 1) {
          activeUrlA = activeUrlB;
          mixValue = 0;
        }
      }

      const profile = AVATAR_PROFILES[activeProfileAvatar];
      const currentState = stateRef.current;
      const currentMuted = mutedRef.current;
      const currentMood = moodRef.current;
      const streamer = streamerRef.current;
      const glowTheme = THEME_GLOWS[themeRef.current];

      let lipTarget = { total: 0, jaw: 0, width: 0, high: 0 };
      let micLevel = 0;

      if (streamer) {
        if (currentState === "speaking") {
          lipTarget = streamer.sampleLipSyncParams(freqBins, timeBins);
        } else if (currentState === "listening" && !currentMuted) {
          micLevel = streamer.sampleSpectrum(freqBins, "input");
        } else {
          freqBins.fill(0);
        }
      } else {
        freqBins.fill(0);
      }

      const isSpeakState = currentState === "speaking" ? 1 : 0;
      const isListenState = currentState === "listening" ? 1 : 0;
      const isAngryMood = currentMood === "angry" ? 1 : 0;
      const isFlirtyMood =
        currentMood === "flirty" || currentMood === "teasing" ? 1 : 0;
      const isTeasingMood = currentMood === "teasing" ? 1 : 0;

      speakingSmooth += (isSpeakState - speakingSmooth) * 0.16;
      listeningSmooth += (isListenState - listeningSmooth) * 0.12;
      angrySmooth += (isAngryMood - angrySmooth) * 0.08;
      inputSmooth += (micLevel - inputSmooth) * 0.2;

      const jawRate = lipTarget.jaw > jawSmooth ? 0.58 : 0.42;
      jawSmooth += (lipTarget.jaw - jawSmooth) * jawRate;
      widthSmooth += (lipTarget.width - widthSmooth) * 0.36;

      if (!isBlinking && now >= nextBlinkAt) {
        isBlinking = true;
        blinkProgress = 0;
        if (!doubleBlinkQueued && Math.random() < 0.24) {
          doubleBlinkQueued = true;
        }
      }

      let blinkValue = 0;
      if (isBlinking) {
        blinkProgress += dt * 6.5;
        if (blinkProgress >= 1) {
          isBlinking = false;
          blinkValue = 0;
          if (doubleBlinkQueued) {
            doubleBlinkQueued = false;
            nextBlinkAt = now + 135;
          } else {
            nextBlinkAt = now + 2400 + Math.random() * 3100;
          }
        } else {
          blinkValue = Math.sin(blinkProgress * Math.PI);
        }
      }

      pointerRef.current.x +=
        (pointerRef.current.targetX - pointerRef.current.x) * 0.08;
      pointerRef.current.y +=
        (pointerRef.current.targetY - pointerRef.current.y) * 0.08;

      const breath =
        Math.sin(t * (1.5 + angrySmooth * 0.6)) * 0.72 +
        Math.sin(t * 0.75) * 0.28 +
        speakingSmooth * 0.25;

      const targetBodySway =
        Math.sin(t * 0.72) * 0.45 +
        speakingSmooth * Math.sin(t * 1.45) * (0.45 + lipTarget.total * 0.4);
      const targetBodyLean =
        isFlirtyMood * 0.35 +
        angrySmooth * 0.55 +
        speakingSmooth * (0.25 + lipTarget.total * 0.45);
      bodySwaySmooth += (targetBodySway - bodySwaySmooth) * 0.06;
      bodyLeanSmooth += (targetBodyLean - bodyLeanSmooth) * 0.07;

      const targetSmile =
        (1 - angrySmooth) *
        (0.26 +
          isFlirtyMood * 0.24 +
          speakingSmooth * (0.22 + lipTarget.high * 0.22) +
          listeningSmooth * (0.18 + inputSmooth * 0.32));
      smileSmooth += (targetSmile - smileSmooth) * 0.08;

      const targetFurrow =
        angrySmooth * (0.85 + speakingSmooth * lipTarget.total * 0.35);
      furrowSmooth += (targetFurrow - furrowSmooth) * 0.1;

      const targetTeasingBrow =
        isTeasingMood * 0.8 + isFlirtyMood * Math.max(0, Math.sin(t * 1.1)) * 0.45;
      teasingBrowSmooth += (targetTeasingBrow - teasingBrowSmooth) * 0.1;

      const targetBrow =
        (1 - angrySmooth * 0.7) *
        (speakingSmooth * (0.38 + lipTarget.total * 0.72) +
          listeningSmooth * (0.18 + inputSmooth * 0.5) +
          Math.max(0, Math.sin(t * 0.95)) * 0.14);
      browSmooth += (targetBrow - browSmooth) * 0.14;

      const headRoll =
        profile.basePoise +
        Math.sin(t * 0.65) * 0.011 +
        speakingSmooth * Math.sin(t * 2.1) * (0.012 + lipTarget.total * 0.016) +
        listeningSmooth * Math.sin(t * 0.9) * 0.012;

      const headNod =
        Math.sin(t * 1.1) * 0.003 +
        listeningSmooth * Math.sin(t * 2.5) * (0.003 + inputSmooth * 0.006) +
        speakingSmooth *
          Math.sin(t * 3.0) *
          (0.003 + lipTarget.jaw * 0.006 + angrySmooth * 0.004);
      const headSway =
        Math.sin(t * 0.8) * 0.004 +
        speakingSmooth * Math.sin(t * 1.55) * 0.0045;

      const headVel = (headRoll - prevHeadRoll) / Math.max(dt, 0.008);
      prevHeadRoll = headRoll;
      const springForce =
        -18 * earAngle -
        3.5 * earVel -
        (headVel * 0.8 + bodySwaySmooth * 0.25);
      earVel += springForce * dt;
      earAngle += earVel * dt;
      earAngle = Math.max(-0.55, Math.min(0.55, earAngle));

      const waveActive = now < waveUntilRef.current ? 1 : 0;
      waveBurstSmooth += (waveActive - waveBurstSmooth) * 0.14;

      const gestureSpeed = 1 + angrySmooth * 0.55;
      const targetHandLift =
        0.25 +
        0.22 * Math.sin(t * 1.3 * gestureSpeed) +
        speakingSmooth *
          (0.45 +
            Math.sin(t * 2.5 * gestureSpeed) * 0.42 +
            lipTarget.total * 0.55) +
        listeningSmooth * (0.14 + inputSmooth * 0.3) +
        waveBurstSmooth * (0.85 + Math.sin(t * 6.0) * 0.2);

      const targetHandSway =
        Math.sin(t * 1.05 * gestureSpeed) * 0.28 +
        speakingSmooth *
          Math.sin(t * 2.2 * gestureSpeed) *
          (0.45 + Math.abs(lipTarget.width) * 0.4) +
        waveBurstSmooth * Math.sin(t * 9.5) * 0.95;

      const targetHandTwist =
        Math.sin(t * 1.45 * gestureSpeed) * 0.32 +
        speakingSmooth * Math.cos(t * 2.4 * gestureSpeed) * 0.55 +
        waveBurstSmooth * Math.sin(t * 9.5) * 1.25;

      const targetArmSway =
        Math.sin(t * 0.78 + 1.0) * 0.38 +
        speakingSmooth * Math.sin(t * 1.6 * gestureSpeed) * 0.52;
      const targetClothWave =
        0.55 +
        speakingSmooth * (0.65 + lipTarget.total * 0.55) +
        listeningSmooth * 0.25;

      handLiftSmooth += (targetHandLift - handLiftSmooth) * 0.14;
      handSwaySmooth += (targetHandSway - handSwaySmooth) * 0.16;
      handTwistSmooth += (targetHandTwist - handTwistSmooth) * 0.16;
      armSwaySmooth += (targetArmSway - armSwaySmooth) * 0.09;
      clothWaveSmooth += (targetClothWave - clothWaveSmooth) * 0.08;

      const texA = textureCache.get(activeUrlA);
      const texB = textureCache.get(activeUrlB) ?? texA;

      if (texA && texB) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = canvas.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const targetW = Math.round(rect.width * dpr);
          const targetH = Math.round(rect.height * dpr);
          if (canvas.width !== targetW || canvas.height !== targetH) {
            canvas.width = targetW;
            canvas.height = targetH;
          }

          gl.viewport(0, 0, canvas.width, canvas.height);
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);

          gl.useProgram(program);
          gl.bindVertexArray(vao);

          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, texA);
          gl.uniform1i(uniforms.textureA, 0);

          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(gl.TEXTURE_2D, texB);
          gl.uniform1i(uniforms.textureB, 1);

          gl.uniform1f(uniforms.mix, mixValue);
          gl.uniform1f(uniforms.aspect, 1024 / 1536);
          gl.uniform1f(uniforms.time, t);
          gl.uniform1f(uniforms.breath, breath);
          gl.uniform1f(uniforms.bodySway, bodySwaySmooth);
          gl.uniform1f(uniforms.bodyLean, bodyLeanSmooth);
          gl.uniform1f(uniforms.headRoll, headRoll);
          gl.uniform1f(uniforms.headNod, headNod);
          gl.uniform1f(uniforms.headSway, headSway);
          gl.uniform1f(uniforms.pointerX, pointerRef.current.x);
          gl.uniform1f(uniforms.pointerY, pointerRef.current.y);
          gl.uniform1f(uniforms.blink, blinkValue);
          gl.uniform1f(uniforms.browLift, browSmooth);
          gl.uniform1f(uniforms.browFurrow, furrowSmooth);
          gl.uniform1f(uniforms.teasingBrow, teasingBrowSmooth);
          gl.uniform1f(uniforms.smile, smileSmooth);
          gl.uniform1f(uniforms.jawOpen, jawSmooth);
          gl.uniform1f(uniforms.lipWidth, widthSmooth);
          gl.uniform1f(uniforms.handLift, handLiftSmooth);
          gl.uniform1f(uniforms.handSway, handSwaySmooth);
          gl.uniform1f(uniforms.handTwist, handTwistSmooth);
          gl.uniform1f(uniforms.armSway, armSwaySmooth);
          gl.uniform1f(uniforms.clothWave, clothWaveSmooth);
          gl.uniform1f(uniforms.earLag, earAngle);
          gl.uniform1f(uniforms.speaking, speakingSmooth);
          gl.uniform1f(uniforms.listening, listeningSmooth);
          gl.uniform1f(uniforms.angry, angrySmooth);
          gl.uniform3fv(uniforms.rimColor, glowTheme.rimColor);

          gl.uniform2fv(uniforms.mouthCenter, profile.mouthCenter);
          gl.uniform2fv(uniforms.leftEye, profile.leftEye);
          gl.uniform2fv(uniforms.rightEye, profile.rightEye);
          gl.uniform2fv(uniforms.leftBrow, profile.leftBrow);
          gl.uniform2fv(uniforms.rightBrow, profile.rightBrow);
          gl.uniform2fv(uniforms.innerBrow, profile.innerBrow);
          gl.uniform2fv(uniforms.neckPivot, profile.neckPivot);
          gl.uniform1f(uniforms.headCutoffY, profile.headCutoffY);
          gl.uniform1f(uniforms.faceTilt, profile.faceTilt);
          gl.uniform1f(uniforms.handStrength, profile.handStrength);
          gl.uniform2fv(uniforms.handCenter, profile.handCenter);
          gl.uniform2fv(uniforms.wristPivot, profile.wristPivot);
          gl.uniform2fv(uniforms.forearmCenter, profile.forearmCenter);
          gl.uniform1f(uniforms.eyeScale, profile.eyeScale);

          gl.drawElements(
            gl.TRIANGLES,
            mesh.indices.length,
            gl.UNSIGNED_SHORT,
            0
          );
        }
      }

      const waveCanvas = waveformCanvasRef.current;
      if (waveCanvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = waveCanvas.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const targetW = Math.round(rect.width * dpr);
          const targetH = Math.round(rect.height * dpr);
          if (waveCanvas.width !== targetW || waveCanvas.height !== targetH) {
            waveCanvas.width = targetW;
            waveCanvas.height = targetH;
          }

          const ctx = waveCanvas.getContext("2d");
          if (ctx) {
            ctx.save();
            ctx.scale(dpr, dpr);
            ctx.clearRect(0, 0, rect.width, rect.height);

            const w = rect.width;
            const h = rect.height;
            const midY = h / 2;

            const grad = ctx.createLinearGradient(0, 0, w, 0);
            grad.addColorStop(0, "transparent");
            grad.addColorStop(0.2, glowTheme.waveColors[0]);
            grad.addColorStop(0.5, glowTheme.waveColors[1]);
            grad.addColorStop(0.8, glowTheme.waveColors[2]);
            grad.addColorStop(1, "transparent");

            const activeAmp =
              currentState === "speaking"
                ? 4 + jawSmooth * 18
                : currentState === "listening" && !currentMuted
                  ? 3 + inputSmooth * 14
                  : currentState === "connecting"
                    ? 6
                    : 1.5;

            for (let layer = 0; layer < 2; layer++) {
              ctx.beginPath();
              ctx.strokeStyle = grad;
              ctx.lineWidth = layer === 0 ? 2 : 1.2;
              ctx.globalAlpha = layer === 0 ? 0.92 : 0.45;
              const freq = 0.022 + layer * 0.01;
              const phase = t * (3.2 + layer * 1.4);

              for (let x = 0; x <= w; x += 3) {
                const normX = x / w;
                const envelope = Math.sin(normX * Math.PI);
                const binIdx = Math.min(
                  24,
                  Math.floor(Math.abs(normX - 0.5) * 2 * 20)
                );
                const binBoost = 0.5 + (freqBins[binIdx] / 255) * 1.1;
                const y =
                  midY +
                  Math.sin(x * freq + phase) *
                    activeAmp *
                    envelope *
                    binBoost *
                    (layer === 0 ? 1 : -0.75);
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }
              ctx.stroke();
            }
            ctx.restore();
          }
        }
      }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      window.clearTimeout(preloadTimer);
      cancelAnimationFrame(rafId);
      textureCache.forEach((tex) => gl.deleteTexture(tex));
      textureCache.clear();
      gl.deleteBuffer(posBuffer);
      gl.deleteBuffer(idxBuffer);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    pointerRef.current.targetX = Math.max(-1, Math.min(1, nx));
    pointerRef.current.targetY = Math.max(-1, Math.min(1, ny));
  };

  const handlePointerLeave = () => {
    pointerRef.current.targetX = 0;
    pointerRef.current.targetY = 0;
  };

  const glowTheme = THEME_GLOWS[theme];
  const isSpeaking = sessionState === "speaking";
  const isListening = sessionState === "listening";
  const isConnecting = sessionState === "connecting";
  const fallbackSrc = getAvatarTextureUrl(avatarId, outfit);

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative flex flex-col items-center justify-center w-full"
    >
      <div className="relative w-[min(74vw,268px)] sm:w-[min(42dvh,320px)] lg:w-[min(48dvh,360px)] aspect-[2/3]">
        <div
          className={`absolute -inset-3 rounded-[34px] blur-2xl transition-opacity duration-500 pointer-events-none ${
            isSpeaking || isConnecting
              ? "opacity-80"
              : isListening
                ? "opacity-60"
                : "opacity-35"
          }`}
          style={{
            background:
              mood === "angry"
                ? "conic-gradient(from 0deg, #ff1e42, #ff2e93, #f97316, #ef4444, #ff1e42)"
                : glowTheme.conic,
          }}
        />

        <div
          className="relative w-full h-full rounded-[28px] p-[2.5px] overflow-hidden shadow-2xl"
          style={{
            boxShadow: `0 20px 60px -12px ${glowTheme.glowShadow}`,
          }}
        >
          <div
            className={`absolute -inset-[50%] pointer-events-none ${
              isSpeaking || isConnecting
                ? "animate-rgb-spin-fast"
                : "animate-rgb-spin"
            }`}
            style={{
              background:
                mood === "angry"
                  ? "conic-gradient(from 0deg, #ff1e42, #ff2e93, #f97316, #ef4444, #ff1e42)"
                  : glowTheme.conic,
            }}
          />

          <div className="relative w-full h-full rounded-[25.5px] overflow-hidden bg-[#140513]">
            <img
              src={fallbackSrc}
              alt={`${avatarId} AI avatar`}
              referrerPolicy="no-referrer"
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                webglReady && !fallbackMode ? "opacity-0" : "opacity-100"
              } ${fallbackMode && isSpeaking ? "scale-[1.015]" : ""}`}
            />

            {!fallbackMode && (
              <canvas
                ref={canvasRef}
                className="relative z-10 w-full h-full block"
              />
            )}

            <div
              className="absolute inset-x-0 bottom-0 h-20 z-20 pointer-events-none bg-gradient-to-t from-[#110310]/85 via-[#110310]/30 to-transparent"
              aria-hidden="true"
            />

            <div className="absolute inset-x-3 bottom-2 z-30 pointer-events-none">
              <canvas
                ref={waveformCanvasRef}
                className="w-full h-10"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
