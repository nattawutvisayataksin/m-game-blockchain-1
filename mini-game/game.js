// ============================================================================
// Retro Nitro Racer - Grand Prix Edition (8 Racers, Wide Track, Mega Straight)
// Features: 250px Ultra-Wide Track, 3,200px Mega Nitro Straight, 8 AI Racers,
// Bumper Guardrails, Super Turbo Pads, Nitro Pickups & Dynamic Wall Bouncing
// ============================================================================

// --- Sound Synthesis (Web Audio API - 100% Standalone) ---
class SoundManager {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Engine sound loop
      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);
      this.engineGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, this.ctx.currentTime);

      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();
      this.initialized = true;
    } catch (e) {
      console.warn("Audio Context error", e);
    }
  }

  updateEngine(speedRatio) {
    if (!this.initialized || !this.ctx) return;
    const baseFreq = 42;
    const targetFreq = baseFreq + speedRatio * 190;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.08);
  }

  playDriftScreech() {
    if (!this.initialized || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420 + Math.random() * 240, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.14);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.14);
  }

  playBoostSound() {
    if (!this.initialized || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(750, this.ctx.currentTime + 0.28);
    gain.gain.setValueAtTime(0.13, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playTurboPadSound() {
    if (!this.initialized || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1250, this.ctx.currentTime + 0.36);
    gain.gain.setValueAtTime(0.16, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + 0.38);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.38);
  }

  playWallBounce() {
    if (!this.initialized || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(170, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(55, this.ctx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.16);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.16);
  }

  playPickupSound() {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);
      gain.gain.setValueAtTime(0.08, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.12);
    });
  }

  playCollision() {
    if (!this.initialized || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(90, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(35, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.13, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }
}

const sounds = new SoundManager();

// ============================================================================
// Grand Prix Circuit Track Points (ยาวขึ้น 3.5 เท่า + ทางตรงยาว 3,200px)
// ============================================================================
const TRACK_POINTS = [
  // --- Section 1: The Mega Nitro Straight (ทางตรงระดับตำนาน 3,200px!) ---
  { x: 800, y: 3100 },   // [P0] Start / Finish Line
  { x: 1800, y: 3100 },  // [P1] Straight Sector 1
  { x: 2800, y: 3100 },  // [P2] Straight Sector 2
  { x: 3800, y: 3100 },  // [P3] Mega Straight Braking Point

  // --- Section 2: High-Speed Banking Turn (โค้งกว้างความเร็วสูงด้านขวา) ---
  { x: 4400, y: 2800 },  // [P4] High speed entry
  { x: 4650, y: 2100 },  // [P5] Outer banking apex
  { x: 4400, y: 1400 },  // [P6] High speed exit
  { x: 3900, y: 900 },   // [P7] Turn to North Straight

  // --- Section 3: North High-Speed Straight (ทางตรงด้านบน) ---
  { x: 3000, y: 700 },   // [P8] Top straight fast
  { x: 2000, y: 700 },   // [P9] Top straight mid
  { x: 1100, y: 700 },   // [P10] Top straight braking zone

  // --- Section 4: Mountain Hairpin & Infield S-Curves (โซนเทคนิคดริฟต์) ---
  { x: 650, y: 1000 },   // [P11] North-West Hairpin entry
  { x: 650, y: 1500 },   // [P12] Hairpin exit
  { x: 1200, y: 1750 },  // [P13] Infield dive east
  { x: 1900, y: 1650 },  // [P14] S-Chicane 1 (Left)
  { x: 2600, y: 1950 },  // [P15] S-Chicane 2 (Right)
  { x: 3200, y: 1700 },  // [P16] Infield East Apex
  { x: 3500, y: 2150 },  // [P17] Loop south
  { x: 3000, y: 2450 },  // [P18] Curve into Mid Straight

  // --- Section 5: Mid-Straight & Final Corner Complex ---
  { x: 2000, y: 2450 },  // [P19] Mid straight west
  { x: 1100, y: 2450 },  // [P20] Mid straight approach
  { x: 600, y: 2600 },   // [P21] South-West turn
  { x: 450, y: 2900 },   // [P22] Final Hairpin Apex
  { x: 580, y: 3100 }    // [P23] Launch onto Mega Straight (เข้าเส้นชัย P0)
];

const TRACK_WIDTH = 250; // ความกว้างถนน 250px (กว้างมาก วิ่ง 8 คันคู่คี่ได้สบาย)
const ROAD_HALF_WIDTH = TRACK_WIDTH / 2; // 125px
const TOTAL_LAPS = 2;    // แข่ง 2 รอบ (เพราะสนามยาวมาก 13,000+ px ต่อรอบ เล่นจุใจ)

// --- Speed Boost Pads (แผ่นเหยียบคันเร่ง Super Turbo ทั่วสนาม) ---
const BOOST_PADS = [
  // Mega Straight Pads (กดไนโตรต่อเนื่องทำ Top Speed!)
  { x: 1400, y: 3100, angle: 0 },
  { x: 2400, y: 3100, angle: 0 },
  { x: 3400, y: 3100, angle: 0 },

  // Banking & North Straight
  { x: 4620, y: 2100, angle: -Math.PI / 2 },
  { x: 2500, y: 700, angle: Math.PI },
  { x: 1500, y: 700, angle: Math.PI },

  // Infield & Mid-Straight
  { x: 2100, y: 1700, angle: 0.2 },
  { x: 2300, y: 2450, angle: Math.PI },
  { x: 1400, y: 2450, angle: Math.PI }
];

// --- Nitro Pickups (ไอเทมถังไนโตรลอยได้) ---
const NITRO_PICKUPS = [
  { x: 1900, y: 3100, active: true, respawnTime: 0 },
  { x: 4200, y: 1100, active: true, respawnTime: 0 },
  { x: 1800, y: 700, active: true, respawnTime: 0 },
  { x: 800, y: 1600, active: true, respawnTime: 0 },
  { x: 2900, y: 1800, active: true, respawnTime: 0 },
  { x: 3300, y: 2350, active: true, respawnTime: 0 },
  { x: 1700, y: 2450, active: true, respawnTime: 0 },
  { x: 480, y: 3000, active: true, respawnTime: 0 }
];

// --- Corner Turn Direction Chevrons (ป้ายเตือนโค้งเรืองแสง) ---
const CORNER_SIGNS = [
  { x: 4000, y: 3050, angle: -Math.PI / 4 },
  { x: 4300, y: 1200, angle: -Math.PI * 0.7 },
  { x: 800, y: 750, angle: Math.PI * 0.75 },
  { x: 3400, y: 1850, angle: Math.PI / 2 },
  { x: 800, y: 2500, angle: Math.PI * 0.75 }
];

// --- Floating Text Popups ---
let floatingTexts = [];
function addFloatingText(x, y, text, color = "#00f0ff") {
  floatingTexts.push({ x, y, text, color, life: 1.0, vy: -1.2 });
}

// ============================================================================
// Vehicle Class (พร้อม Physics & Drifting)
// ============================================================================
class Vehicle {
  constructor(x, y, angle, color, isPlayer = false, name = "Car") {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.color = color;
    this.isPlayer = isPlayer;
    this.name = name;

    // Movement & Physics
    this.speed = 0;
    this.maxSpeed = isPlayer ? 12.0 : 10.0 + Math.random() * 1.4;
    this.accel = 0.22;
    this.braking = 0.35;
    this.reverseMax = -3.5;
    this.friction = 0.982;
    this.turnRate = 0.048;

    // Drifting & Nitro
    this.isDrifting = false;
    this.lateralVelocity = { x: 0, y: 0 };
    this.boost = 100;
    this.isBoosting = false;
    this.superTurboTimer = 0;

    // Progress Tracking
    this.nextCheckpoint = 1;
    this.currentLap = 1;
    this.finished = false;
    this.finishTime = 0;

    // Appearance & Collision Box
    this.width = 24;
    this.length = 44;
    this.radius = 16;
  }

  update(inputs) {
    if (this.finished) {
      this.speed *= 0.95;
      this.move();
      return;
    }

    // Super Turbo Timer handling
    let effectiveMaxSpeed = this.maxSpeed;
    let effectiveAccel = this.accel;

    if (this.superTurboTimer > 0) {
      this.superTurboTimer--;
      effectiveMaxSpeed *= 1.5;
      effectiveAccel *= 1.85;
      this.isBoosting = true;
      if (Math.random() < 0.35) {
        addSmokeParticle(
          this.x - Math.cos(this.angle) * 20,
          this.y - Math.sin(this.angle) * 20,
          true
        );
      }
    }

    // Manual Nitro
    if (inputs.boost && this.boost > 0) {
      this.isBoosting = true;
      this.boost = Math.max(0, this.boost - 0.4);
      effectiveMaxSpeed *= 1.38;
      effectiveAccel *= 1.65;
      if (this.isPlayer && Math.random() < 0.22) sounds.playBoostSound();
    } else {
      this.boost = Math.min(100, this.boost + 0.16); // ค่อยๆ รีชาร์จ
    }

    // Acceleration & Braking
    if (inputs.throttle) {
      this.speed += effectiveAccel;
      if (this.speed > effectiveMaxSpeed) this.speed = effectiveMaxSpeed;
    } else if (inputs.brake) {
      this.speed -= this.braking;
      if (this.speed < this.reverseMax) this.speed = this.reverseMax;
    } else {
      this.speed *= this.friction;
    }

    // Turning dynamics
    const turnInfluence = Math.min(Math.abs(this.speed) / 2.5, 1);
    const dir = this.speed >= 0 ? 1 : -1;
    let actualTurnRate = this.turnRate;

    // Drift mode
    this.isDrifting = inputs.drift && Math.abs(this.speed) > 4.5;
    if (this.isDrifting) {
      actualTurnRate *= 1.4;
      this.speed *= 0.99;
      if (this.isPlayer && Math.random() < 0.16) sounds.playDriftScreech();
    }

    if (inputs.steerLeft) this.angle -= actualTurnRate * turnInfluence * dir;
    if (inputs.steerRight) this.angle += actualTurnRate * turnInfluence * dir;

    this.move();
  }

  move() {
    const forwardX = Math.cos(this.angle);
    const forwardY = Math.sin(this.angle);

    if (this.isDrifting) {
      this.lateralVelocity.x = this.lateralVelocity.x * 0.90 + forwardX * this.speed * 0.10;
      this.lateralVelocity.y = this.lateralVelocity.y * 0.90 + forwardY * this.speed * 0.10;
      this.x += this.lateralVelocity.x;
      this.y += this.lateralVelocity.y;
    } else {
      this.x += forwardX * this.speed;
      this.y += forwardY * this.speed;
      this.lateralVelocity = { x: forwardX * this.speed, y: forwardY * this.speed };
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Car Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.fillRect(-this.length / 2 + 3, -this.width / 2 + 4, this.length, this.width);

    // Exhaust Nitro Flame
    if (this.isBoosting || this.superTurboTimer > 0) {
      const isSuper = this.superTurboTimer > 0;
      ctx.fillStyle = isSuper ? (Math.random() > 0.5 ? "#ffd700" : "#ff0055") : (Math.random() > 0.5 ? "#00f0ff" : "#ff0077");
      ctx.beginPath();
      ctx.moveTo(-this.length / 2, -7);
      ctx.lineTo(-this.length / 2 - (isSuper ? 32 : 20) - Math.random() * 12, 0);
      ctx.lineTo(-this.length / 2, 7);
      ctx.closePath();
      ctx.fill();
    }

    // Car Body
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.roundRect(-this.length / 2, -this.width / 2, this.length, this.width, 6);
    ctx.fill();

    // Racing Stripes
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-this.length / 2 + 5, -3, this.length - 10, 6);

    // Windshield & Windows
    ctx.fillStyle = "#1e283b";
    ctx.fillRect(-6, -this.width / 2 + 3, 14, this.width - 6);
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(-3, -this.width / 2 + 5, 8, this.width - 10);

    // Headlights
    ctx.fillStyle = "#fef08a";
    ctx.fillRect(this.length / 2 - 3, -this.width / 2 + 2, 3, 5);
    ctx.fillRect(this.length / 2 - 3, this.width / 2 - 7, 3, 5);

    // Taillights
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(-this.length / 2, -this.width / 2 + 3, 3, 4);
    ctx.fillRect(-this.length / 2, this.width / 2 - 7, 3, 4);

    ctx.restore();
  }
}

// ============================================================================
// AI Controller (รองรับ 7 คัน วิ่งกระจายเลนบนถนนกว้าง 250px)
// ============================================================================
class AICar extends Vehicle {
  constructor(x, y, angle, color, name, laneOffset = 0) {
    super(x, y, angle, color, false, name);
    this.targetPointIdx = 1;
    this.laneOffset = laneOffset; // กระจายเลนขับขี่บนถนนกว้าง
    this.wobbleTime = Math.random() * 100;
  }

  think() {
    this.wobbleTime += 0.02;
    const target = TRACK_POINTS[this.targetPointIdx];
    
    // คำนวณเลนวิ่งแบบเป็นธรรมชาติ (Dynamic Lane Positioning)
    const currentWobble = this.laneOffset + Math.sin(this.wobbleTime) * 35;
    const tx = target.x + Math.cos(this.targetPointIdx) * currentWobble;
    const ty = target.y + Math.sin(this.targetPointIdx) * currentWobble;

    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 180) {
      this.targetPointIdx = (this.targetPointIdx + 1) % TRACK_POINTS.length;
    }

    const desiredAngle = Math.atan2(dy, dx);
    let diff = desiredAngle - this.angle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;

    const inputs = {
      throttle: true,
      brake: false,
      steerLeft: diff < -0.05,
      steerRight: diff > 0.05,
      drift: Math.abs(diff) > 0.65,
      boost: Math.abs(diff) < 0.22 && dist > 260 && Math.random() < 0.05
    };

    // ชะลอความเร็วเล็กน้อยตอนเข้าโค้งหักศอก
    if (Math.abs(diff) > 0.92 && this.speed > 7.0) {
      inputs.throttle = false;
      inputs.brake = true;
    }

    this.update(inputs);
  }
}

// ============================================================================
// Core Physics: ขอบทางกันกระแทก (Bumper Guardrails)
// ============================================================================
function getClosestTrackProjection(px, py) {
  let minDistanceSq = Infinity;
  let bestProj = { x: px, y: py };
  let bestTangent = { x: 1, y: 0 };
  let bestNormal = { x: 0, y: 1 };
  let bestSegmentIdx = 0;

  const N = TRACK_POINTS.length;
  for (let i = 0; i < N; i++) {
    const pA = TRACK_POINTS[i];
    const pB = TRACK_POINTS[(i + 1) % N];

    const vx = pB.x - pA.x;
    const vy = pB.y - pA.y;
    const lenSq = vx * vx + vy * vy;
    if (lenSq === 0) continue;

    const wx = px - pA.x;
    const wy = py - pA.y;
    let t = (wx * vx + wy * vy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const projX = pA.x + t * vx;
    const projY = pA.y + t * vy;

    const dx = px - projX;
    const dy = py - projY;
    const distSq = dx * dx + dy * dy;

    if (distSq < minDistanceSq) {
      minDistanceSq = distSq;
      bestProj = { x: projX, y: projY };
      const len = Math.sqrt(lenSq);
      bestTangent = { x: vx / len, y: vy / len };

      const dist = Math.sqrt(distSq);
      if (dist > 0.0001) {
        bestNormal = { x: dx / dist, y: dy / dist };
      } else {
        bestNormal = { x: -bestTangent.y, y: bestTangent.x };
      }
      bestSegmentIdx = i;
    }
  }

  return {
    closestPoint: bestProj,
    distance: Math.sqrt(minDistanceSq),
    normal: bestNormal,
    tangent: bestTangent,
    segmentIdx: bestSegmentIdx
  };
}

function applyGuardrailBumper(car) {
  const proj = getClosestTrackProjection(car.x, car.y);
  const maxDistance = ROAD_HALF_WIDTH - car.radius; // ปรับตามความกว้างถนน 250px

  if (proj.distance > maxDistance) {
    const penetration = proj.distance - maxDistance;
    car.x -= proj.normal.x * penetration;
    car.y -= proj.normal.y * penetration;

    const carVx = Math.cos(car.angle) * car.speed;
    const carVy = Math.sin(car.angle) * car.speed;
    const normalVelocity = carVx * proj.normal.x + carVy * proj.normal.y;

    if (normalVelocity > 0) {
      const bounceRestitution = 0.55;
      const newVx = carVx - (1 + bounceRestitution) * normalVelocity * proj.normal.x;
      const newVy = carVy - (1 + bounceRestitution) * normalVelocity * proj.normal.y;

      car.speed = Math.hypot(newVx, newVy) * 0.93;

      const targetAngle = Math.atan2(proj.tangent.y, proj.tangent.x);
      let angleDiff = targetAngle - car.angle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      car.angle += angleDiff * 0.35; // ช่วยหันหัวรถไปข้างหน้าตามแนวถนน

      for (let s = 0; s < 4; s++) {
        addSparkParticle(
          car.x + proj.normal.x * car.radius,
          car.y + proj.normal.y * car.radius,
          -proj.normal.x * 3 + (Math.random() - 0.5) * 3,
          -proj.normal.y * 3 + (Math.random() - 0.5) * 3
        );
      }

      if (car.isPlayer) {
        sounds.playWallBounce();
        triggerScreenShake(4.5);
      }
    }
  }
}

// ============================================================================
// Boost Pads & Nitro Pickups Interaction
// ============================================================================
function checkTrackInteractions(car) {
  // Boost Pads
  BOOST_PADS.forEach(pad => {
    const dist = Math.hypot(pad.x - car.x, pad.y - car.y);
    if (dist < 50) {
      if (car.superTurboTimer <= 0) {
        car.superTurboTimer = 90; // บูสต์ความเร็วสูงพิเศษ 1.5 วินาที
        car.boost = Math.min(100, car.boost + 40);
        if (car.isPlayer) {
          sounds.playTurboPadSound();
          triggerScreenShake(6.5);
          addFloatingText(car.x, car.y - 25, "🚀 MEGA TURBO!!", "#ff0077");
        }
      }
    }
  });

  // Nitro Pickups
  const now = Date.now();
  NITRO_PICKUPS.forEach(item => {
    if (!item.active && now > item.respawnTime) {
      item.active = true;
    }
    if (item.active) {
      const dist = Math.hypot(item.x - car.x, item.y - car.y);
      if (dist < 40) {
        item.active = false;
        item.respawnTime = now + 8000;
        car.boost = 100;
        if (car.isPlayer) {
          sounds.playPickupSound();
          driftScoreTotal += 500;
          addFloatingText(car.x, car.y - 25, "+100% NITRO!", "#00f0ff");
        }
      }
    }
  });
}

// ============================================================================
// Game State & 8-Racer Starting Grid Formation
// ============================================================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let player;
let racers = [];
let keys = {};
let particles = [];
let skidMarks = [];
let raceStartTime = 0;
let raceRunning = true;
let driftScoreTotal = 0;
let screenShake = 0;

function triggerScreenShake(amount) {
  screenShake = Math.max(screenShake, amount);
}

function initGame() {
  const p0 = TRACK_POINTS[0];
  const p1 = TRACK_POINTS[1];
  const startAngle = Math.atan2(p1.y - p0.y, p1.x - p0.x); // ทิศทางพุ่งไปตาม Mega Straight

  // จัดกริดออกสตาร์ท 8 คัน (2 แถวขนาน สลับฟันปลาบนถนนกว้าง 250px)
  // Row 1: Player & AI 1
  player = new Vehicle(p0.x, p0.y - 45, startAngle, "#00f0ff", true, "Player");
  
  racers = [
    player,
    new AICar(p0.x, p0.y + 45, startAngle, "#ef4444", "Crimson Comet", 55),
    // Row 2
    new AICar(p0.x - 70, p0.y - 45, startAngle, "#f59e0b", "Gold Rush", -60),
    new AICar(p0.x - 70, p0.y + 45, startAngle, "#a855f7", "Shadow Drift", 60),
    // Row 3
    new AICar(p0.x - 140, p0.y - 45, startAngle, "#10b981", "Emerald Blade", -40),
    new AICar(p0.x - 140, p0.y + 45, startAngle, "#ec4899", "Cyber Phantom", 40),
    // Row 4
    new AICar(p0.x - 210, p0.y - 45, startAngle, "#facc15", "Thunder Bolt", -70),
    new AICar(p0.x - 210, p0.y + 45, startAngle, "#3b82f6", "Cobalt Striker", 70)
  ];

  particles = [];
  skidMarks = [];
  floatingTexts = [];
  raceStartTime = Date.now();
  raceRunning = true;
  driftScoreTotal = 0;
  screenShake = 0;
  document.getElementById('center-message').style.display = 'none';
}

// Input Listeners
window.addEventListener('keydown', (e) => {
  sounds.init();
  keys[e.key.toLowerCase()] = true;
  if (e.key === 'r' || e.key === 'R') {
    const pt = TRACK_POINTS[player.nextCheckpoint > 0 ? player.nextCheckpoint - 1 : 0];
    player.x = pt.x;
    player.y = pt.y;
    player.speed = 0;
    player.superTurboTimer = 0;
  }
});
window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

// Particles
function addSkidMark(x, y, angle) {
  if (skidMarks.length > 320) skidMarks.shift();
  skidMarks.push({ x, y, angle, life: 1.0 });
}

function addSmokeParticle(x, y, isFire = false) {
  particles.push({
    x, y,
    vx: (Math.random() - 0.5) * 1.5,
    vy: (Math.random() - 0.5) * 1.5,
    size: isFire ? 5 : 5.5,
    color: isFire ? (Math.random() > 0.5 ? "#00f0ff" : "#ff0077") : "rgba(200, 215, 235, 0.45)",
    life: 1.0,
    decay: isFire ? 0.07 : 0.04
  });
}

function addSparkParticle(x, y, vx, vy) {
  particles.push({
    x, y,
    vx, vy,
    size: 2.5 + Math.random() * 2,
    color: Math.random() > 0.5 ? "#ffd700" : "#ff7700",
    life: 1.0,
    decay: 0.09
  });
}

// Checkpoints & Laps
function updateLaps(car) {
  const currentTarget = TRACK_POINTS[car.nextCheckpoint];
  const dist = Math.hypot(currentTarget.x - car.x, currentTarget.y - car.y);

  if (dist < 220) {
    car.nextCheckpoint = (car.nextCheckpoint + 1) % TRACK_POINTS.length;
    if (car.nextCheckpoint === 1) {
      car.currentLap++;
      if (car.isPlayer && car.currentLap <= TOTAL_LAPS) {
        addFloatingText(car.x, car.y - 30, `LAP ${car.currentLap} / ${TOTAL_LAPS}`, "#ffd700");
      }
      if (car.currentLap > TOTAL_LAPS) {
        car.finished = true;
        car.finishTime = (Date.now() - raceStartTime) / 1000;
        if (car.isPlayer) {
          endRace();
        }
      }
    }
  }
}

function endRace() {
  raceRunning = false;
  const msgModal = document.getElementById('center-message');
  const title = document.getElementById('msg-title');
  const desc = document.getElementById('msg-desc');

  const rank = getLeaderboard().findIndex(r => r.car === player) + 1;
  title.innerText = rank === 1 ? "🏆 ยินดีด้วย! คุณคว้าแชมป์อันดับ 1!" : `🏁 จบการแข่งขัน! ได้อันดับ ${rank} / ${racers.length}`;
  desc.innerHTML = `เวลาของคุณ: <b>${player.finishTime.toFixed(2)}s</b><br>คะแนนดริฟต์รวม: <b>${Math.floor(driftScoreTotal)} pts</b>`;
  msgModal.style.display = 'block';
}

function restartRace() {
  initGame();
}

function getLeaderboard() {
  return racers.map(c => {
    const progress = (c.currentLap - 1) * TRACK_POINTS.length + c.nextCheckpoint;
    return { car: c, score: progress };
  }).sort((a, b) => b.score - a.score);
}

// ============================================================================
// Main Game Loop
// ============================================================================
function gameLoop() {
  if (raceRunning) {
    // Player Input
    const playerInputs = {
      throttle: keys['w'] || keys['arrowup'],
      brake: keys['s'] || keys['arrowdown'],
      steerLeft: keys['a'] || keys['arrowleft'],
      steerRight: keys['d'] || keys['arrowright'],
      boost: keys[' '],
      drift: keys[' '] || (Math.abs(player.speed) > 6.8 && (keys['a'] || keys['d'] || keys['arrowleft'] || keys['arrowright']))
    };

    player.update(playerInputs);
    sounds.updateEngine(Math.abs(player.speed) / player.maxSpeed);

    // Drift effects
    if (player.isDrifting) {
      driftScoreTotal += 0.85;
      addSkidMark(player.x, player.y, player.angle);
      addSmokeParticle(
        player.x - Math.cos(player.angle) * 20,
        player.y - Math.sin(player.angle) * 20
      );
    }
    if (player.isBoosting) {
      addSmokeParticle(
        player.x - Math.cos(player.angle) * 22,
        player.y - Math.sin(player.angle) * 22,
        true
      );
    }

    // AI Racers Update
    for (let i = 1; i < racers.length; i++) {
      racers[i].think();
      if (racers[i].isDrifting && Math.random() < 0.35) {
        addSkidMark(racers[i].x, racers[i].y, racers[i].angle);
      }
    }

    // Bumper guardrails, Boost Pads & Laps for all racers
    racers.forEach(car => {
      applyGuardrailBumper(car);
      checkTrackInteractions(car);
      updateLaps(car);
    });

    // Collision check between 8 racers
    for (let i = 0; i < racers.length; i++) {
      for (let j = i + 1; j < racers.length; j++) {
        const c1 = racers[i];
        const c2 = racers[j];
        const dx = c2.x - c1.x;
        const dy = c2.y - c1.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 28) {
          const overlap = 28 - dist;
          const nx = dx / (dist || 1);
          const ny = dy / (dist || 1);
          c1.x -= nx * overlap * 0.5;
          c1.y -= ny * overlap * 0.5;
          c2.x += nx * overlap * 0.5;
          c2.y += ny * overlap * 0.5;
          c1.speed *= 0.92;
          c2.speed *= 0.92;
          if (c1.isPlayer || c2.isPlayer) {
            sounds.playCollision();
            triggerScreenShake(3.0);
          }
        }
      }
    }

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Update Floating texts
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y += ft.vy;
      ft.life -= 0.022;
      if (ft.life <= 0) floatingTexts.splice(i, 1);
    }

    // Screen Shake decay
    if (screenShake > 0) {
      screenShake *= 0.88;
      if (screenShake < 0.1) screenShake = 0;
    }

    // Update HUD
    document.getElementById('lap-display').innerText = `${Math.min(player.currentLap, TOTAL_LAPS)} / ${TOTAL_LAPS}`;
    document.getElementById('speed-display').innerText = `${Math.round(Math.abs(player.speed) * 14)} KM/H`;
    document.getElementById('boost-fill').style.width = `${player.boost}%`;
    document.getElementById('drift-score').innerText = `DRIFT: ${Math.floor(driftScoreTotal)}`;

    const curTime = ((Date.now() - raceStartTime) / 1000).toFixed(2);
    document.getElementById('lap-time').innerText = `เวลา: ${curTime}s`;

    const rank = getLeaderboard().findIndex(r => r.car === player) + 1;
    document.getElementById('rank-display').innerText = `อันดับ ${rank} / ${racers.length}`;
  }

  // ==========================================================================
  // Render Scene
  // ==========================================================================
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  // Camera Follow Player
  const shakeX = (Math.random() - 0.5) * screenShake;
  const shakeY = (Math.random() - 0.5) * screenShake;
  const cameraX = canvas.width / 2 - player.x + shakeX;
  const cameraY = canvas.height / 2 - player.y + shakeY;
  ctx.translate(cameraX, cameraY);

  // 1. Terrain Grid
  drawWorldBackground(ctx);

  // 2. Track & Neon Guardrails (250px Wide)
  drawTrackWithGuardrails(ctx);

  // 3. Speed Boost Pads
  drawBoostPads(ctx);

  // 4. Nitro Pickups
  drawNitroPickups(ctx);

  // 5. Turn Direction Signs
  drawCornerSigns(ctx);

  // 6. Skid Marks
  skidMarks.forEach(s => {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);
    ctx.fillStyle = `rgba(15, 20, 25, ${s.life * 0.6})`;
    ctx.fillRect(-12, -8, 12, 4);
    ctx.fillRect(-12, 4, 12, 4);
    ctx.restore();
  });

  // 7. Particles
  particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1.0;

  // 8. Racers (ทั้ง 8 คัน)
  racers.forEach(car => car.draw(ctx));

  // 9. Floating Texts
  floatingTexts.forEach(ft => {
    ctx.save();
    ctx.font = "bold 15px sans-serif";
    ctx.fillStyle = ft.color;
    ctx.globalAlpha = Math.max(0, ft.life);
    ctx.shadowColor = ft.color;
    ctx.shadowBlur = 8;
    ctx.fillText(ft.text, ft.x - 30, ft.y);
    ctx.restore();
  });

  ctx.restore();

  // 10. Radar Mini-Map (Screen overlay - ปรับสเกลรองรับสนามขนาดใหญ่ 5,000px)
  drawMinimap(ctx);

  requestAnimationFrame(gameLoop);
}

// ============================================================================
// Drawing Helpers
// ============================================================================
function drawWorldBackground(ctx) {
  ctx.fillStyle = "#0a0e16";
  ctx.fillRect(-1000, -1000, 6500, 5500);

  // Background Cyber Grid
  ctx.strokeStyle = "rgba(0, 240, 255, 0.03)";
  ctx.lineWidth = 1;
  const gridSize = 120;
  for (let x = -1000; x < 5500; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, -1000);
    ctx.lineTo(x, 4500);
    ctx.stroke();
  }
  for (let y = -1000; y < 4500; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(-1000, y);
    ctx.lineTo(5500, y);
    ctx.stroke();
  }
}

function drawTrackWithGuardrails(ctx) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. กำแพงกั้นนีออนด้านนอกสุด (Outer Glowing Neon Bumper Rails)
  ctx.strokeStyle = "rgba(0, 240, 255, 0.35)";
  ctx.lineWidth = TRACK_WIDTH + 28;
  buildTrackPath(ctx);
  ctx.stroke();

  // 2. ขอบทางกันกระแทกสีแดง-ขาว (Curbs & Barriers)
  ctx.strokeStyle = "#e11d48";
  ctx.lineWidth = TRACK_WIDTH + 14;
  buildTrackPath(ctx);
  ctx.stroke();

  // 3. พื้นผิวแอสฟัลต์ถนนกว้าง 250px (Dark Racing Asphalt)
  ctx.strokeStyle = "#151a24";
  ctx.lineWidth = TRACK_WIDTH;
  buildTrackPath(ctx);
  ctx.stroke();

  // 4. เส้นแบ่งเลนด้านข้างถนน (Dual Lane Markers)
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = TRACK_WIDTH - 80;
  ctx.setLineDash([30, 40]);
  buildTrackPath(ctx);
  ctx.stroke();

  // 5. เส้นประสีทองกึ่งกลางสนาม (Glow Golden Centerline)
  ctx.strokeStyle = "rgba(255, 215, 0, 0.7)";
  ctx.lineWidth = 5;
  ctx.setLineDash([25, 30]);
  buildTrackPath(ctx);
  ctx.stroke();
  ctx.setLineDash([]); // Reset dash

  // 6. เส้นพลังงานเรืองแสงขอบถนนนีออน (Neon Edge Guardrail)
  ctx.strokeStyle = "#00f0ff";
  ctx.lineWidth = 3;
  ctx.shadowColor = "#00f0ff";
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 7. เส้นชัยลายตารางหมากรุก (Checkered Finish Line)
  const p0 = TRACK_POINTS[0];
  const p1 = TRACK_POINTS[1];
  const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);

  ctx.save();
  ctx.translate(p0.x, p0.y);
  ctx.rotate(angle + Math.PI / 2);

  const finishWidth = TRACK_WIDTH;
  const step = 18;
  for (let i = -finishWidth / 2; i < finishWidth / 2; i += step) {
    ctx.fillStyle = (Math.floor(i / step) % 2 === 0) ? "#ffffff" : "#111111";
    ctx.fillRect(i, -8, step, 8);
    ctx.fillStyle = (Math.floor(i / step) % 2 === 0) ? "#111111" : "#ffffff";
    ctx.fillRect(i, 0, step, 8);
  }
  ctx.restore();
}

function buildTrackPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(TRACK_POINTS[0].x, TRACK_POINTS[0].y);
  for (let i = 1; i < TRACK_POINTS.length; i++) {
    ctx.lineTo(TRACK_POINTS[i].x, TRACK_POINTS[i].y);
  }
  ctx.closePath();
}

function drawBoostPads(ctx) {
  const pulse = Math.sin(Date.now() * 0.008) * 0.2 + 0.8;
  BOOST_PADS.forEach(pad => {
    ctx.save();
    ctx.translate(pad.x, pad.y);
    ctx.rotate(pad.angle);

    ctx.fillStyle = `rgba(255, 0, 119, ${0.35 * pulse})`;
    ctx.fillRect(-22, -30, 44, 60);
    ctx.strokeStyle = "#ff0077";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-22, -30, 44, 60);

    ctx.fillStyle = "#ffd700";
    for (let offset = -14; offset <= 14; offset += 14) {
      ctx.beginPath();
      ctx.moveTo(-14, offset + 7);
      ctx.lineTo(0, offset - 7);
      ctx.lineTo(14, offset + 7);
      ctx.lineTo(0, offset);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  });
}

function drawNitroPickups(ctx) {
  const now = Date.now();
  const floatOffset = Math.sin(now * 0.005) * 4;

  NITRO_PICKUPS.forEach(item => {
    if (item.active) {
      ctx.save();
      ctx.translate(item.x, item.y + floatOffset);

      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 14;

      ctx.fillStyle = "rgba(0, 240, 255, 0.25)";
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#00f0ff";
      ctx.beginPath();
      ctx.roundRect(-8, -13, 16, 26, 4);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(-2, -7);
      ctx.lineTo(4, -1);
      ctx.lineTo(0, -1);
      ctx.lineTo(2, 7);
      ctx.lineTo(-4, 1);
      ctx.lineTo(0, 1);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  });
}

function drawCornerSigns(ctx) {
  const blink = Math.sin(Date.now() * 0.01) > 0;
  CORNER_SIGNS.forEach(sign => {
    ctx.save();
    ctx.translate(sign.x, sign.y);
    ctx.rotate(sign.angle);

    ctx.fillStyle = blink ? "rgba(255, 215, 0, 0.85)" : "rgba(255, 215, 0, 0.35)";
    for (let i = -22; i <= 22; i += 22) {
      ctx.beginPath();
      ctx.moveTo(i - 9, -14);
      ctx.lineTo(i + 5, 0);
      ctx.lineTo(i - 9, 14);
      ctx.lineTo(i - 2, 14);
      ctx.lineTo(i + 12, 0);
      ctx.lineTo(i - 2, -14);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  });
}

// Radar Mini-Map (ย่อส่วนขนาดสนาม 5,000px ให้มองเห็นชัดเจนทั้งสนาม)
function drawMinimap(ctx) {
  const mapW = 185;
  const mapH = 155;
  const mapX = canvas.width - mapW - 15;
  const mapY = canvas.height - mapH - 15;

  ctx.save();
  ctx.fillStyle = "rgba(12, 16, 26, 0.90)";
  ctx.strokeStyle = "rgba(0, 240, 255, 0.55)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(mapX, mapY, mapW, mapH, 10);
  ctx.fill();
  ctx.stroke();

  // สเกลย่อส่วนสำหรับสนามขนาด 4800 x 3300 px
  const scale = 0.034;
  const offsetX = mapX + 15;
  const offsetY = mapY + 18;

  // วาดเส้นทางสนามในเรดาร์
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(TRACK_POINTS[0].x * scale + offsetX, TRACK_POINTS[0].y * scale + offsetY);
  for (let i = 1; i < TRACK_POINTS.length; i++) {
    ctx.lineTo(TRACK_POINTS[i].x * scale + offsetX, TRACK_POINTS[i].y * scale + offsetY);
  }
  ctx.closePath();
  ctx.stroke();

  // จุด Boost Pad บน Minimap
  ctx.fillStyle = "#ff0077";
  BOOST_PADS.forEach(bp => {
    ctx.beginPath();
    ctx.arc(bp.x * scale + offsetX, bp.y * scale + offsetY, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // จุด AI Blips ทั้ง 7 คัน
  racers.forEach(car => {
    if (!car.isPlayer) {
      ctx.fillStyle = car.color;
      ctx.beginPath();
      ctx.arc(car.x * scale + offsetX, car.y * scale + offsetY, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // จุดผู้เล่น (Player Blip - สีฟ้าขนาดใหญ่)
  ctx.fillStyle = "#00f0ff";
  ctx.beginPath();
  ctx.arc(player.x * scale + offsetX, player.y * scale + offsetY, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Start Game
initGame();
requestAnimationFrame(gameLoop);
