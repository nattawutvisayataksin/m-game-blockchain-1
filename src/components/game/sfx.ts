// ============================================================
// SFX — เสียงอารมณ์เกมสังเคราะห์ด้วย WebAudio (ไม่ใช้ไฟล์เสียง)
// ใช้เบา ๆ เป็นพื้นหลัง: ตี/สกิล/กัน/เจ็บ/ชนะ/แพ้/เลเวลอัป
// ============================================================

let ac: AudioContext | null = null;
let muted = false;

export function setMuted(v: boolean): void {
  muted = v;
  try {
    localStorage.setItem("mg_muted", v ? "1" : "0");
  } catch {
    /* private mode */
  }
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("mg_muted") === "1";
  } catch {
    return false;
  }
}

function ctx(): AudioContext | null {
  if (muted) return null;
  if (typeof window === "undefined") return null;
  if (!ac) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      ac = new AC();
    } catch {
      return null;
    }
  }
  if (ac.state === "suspended") void ac.resume();
  return ac;
}

function tone(
  at: number,
  freq: number,
  dur: number,
  type: OscillatorType,
  vol: number,
  slideTo?: number,
): void {
  const c = ctx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  const t0 = c.currentTime + at;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo !== undefined) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(at: number, dur: number, vol: number): void {
  const c = ctx();
  if (!c) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  const g = c.createGain();
  g.gain.value = vol;
  src.buffer = buf;
  src.connect(g).connect(c.destination);
  src.start(c.currentTime + at);
}

export type SfxKind =
  | "hit" | "crit" | "skill" | "guard" | "hurt" | "flee" | "fleeFail"
  | "win" | "lose" | "levelup" | "ui" | "buy" | "start";

export function sfx(kind: SfxKind): void {
  try {
    switch (kind) {
      case "hit":
        tone(0, 240, 0.09, "square", 0.045, 110);
        noise(0, 0.06, 0.028);
        break;
      case "crit":
        tone(0, 320, 0.12, "square", 0.06, 90);
        tone(0.02, 640, 0.1, "triangle", 0.04, 180);
        noise(0, 0.09, 0.045);
        break;
      case "skill":
        tone(0, 420, 0.1, "square", 0.045, 620);
        tone(0.08, 620, 0.12, "square", 0.05, 180);
        noise(0.06, 0.1, 0.035);
        break;
      case "guard":
        tone(0, 180, 0.09, "triangle", 0.05, 140);
        noise(0, 0.05, 0.02);
        break;
      case "hurt":
        tone(0, 200, 0.14, "sawtooth", 0.05, 70);
        break;
      case "flee":
        tone(0, 300, 0.07, "square", 0.04, 500);
        tone(0.07, 500, 0.07, "square", 0.04, 700);
        break;
      case "fleeFail":
        tone(0, 260, 0.1, "sawtooth", 0.045, 120);
        break;
      case "win":
        tone(0, 392, 0.12, "square", 0.05);
        tone(0.12, 523, 0.12, "square", 0.05);
        tone(0.24, 659, 0.18, "square", 0.055);
        break;
      case "lose":
        tone(0, 300, 0.16, "square", 0.05, 220);
        tone(0.16, 220, 0.18, "square", 0.05, 150);
        tone(0.34, 150, 0.3, "square", 0.05, 90);
        break;
      case "levelup":
        tone(0, 523, 0.09, "triangle", 0.05);
        tone(0.09, 659, 0.09, "triangle", 0.05);
        tone(0.18, 784, 0.09, "triangle", 0.05);
        tone(0.27, 1046, 0.2, "triangle", 0.06);
        break;
      case "buy":
        tone(0, 700, 0.06, "square", 0.035);
        tone(0.06, 940, 0.08, "square", 0.035);
        break;
      case "start":
        tone(0, 440, 0.08, "square", 0.04, 660);
        break;
      case "ui":
        tone(0, 600, 0.04, "square", 0.025);
        break;
    }
  } catch {
    /* เสียงล้มเหลวก็ไม่ต้องเดือดร้อนเกม */
  }
}
