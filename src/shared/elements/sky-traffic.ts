/**
 * sky-traffic.ts — shooting stars and drifting satellites for <st-planet-field>.
 *
 * These are the two systems from `script.js` that are neither stars nor
 * planets: a shooting star every 1.8–6.5 seconds (script.js:396-455) and five
 * satellites crossing the upper half on slow diagonals, each with its own blink
 * phase (script.js:457-507). They are small, they are the most alive thing on
 * the page, and the three.js swap has no business quietly dropping them — so
 * they moved here rather than being deleted.
 *
 * Both live in the same CSS-pixel world as everything else: world (x, -y) is
 * screen (x, y). Neither reacts to scroll; they did not before either.
 */

import {
  AdditiveBlending,
  Group,
  Sprite,
  SpriteMaterial,
  type CanvasTexture,
  type Scene,
} from "three";

interface ShootingStar {
  sprite: Sprite;
  material: SpriteMaterial;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  len: number;
  width: number;
  active: boolean;
}

interface Satellite {
  sprite: Sprite;
  material: SpriteMaterial;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  blinkPhase: number;
  blinkSpeed: number;
  glow: number;
}

const MAX_SHOOTING = 3;

export class SkyTraffic {
  readonly group = new Group();

  #shooting: ShootingStar[] = [];
  #satellites: Satellite[] = [];
  #nextShootAt = 0;
  #w = 1;
  #h = 1;

  // Written as plain fields rather than TypeScript parameter properties: core
  // ESLint's no-unused-vars does not understand that syntax and reports every
  // one of them as an unused argument, and the strict block makes that an error.
  #streak: CanvasTexture;
  #glow: CanvasTexture;
  #satelliteCount: number;

  constructor(streak: CanvasTexture, glow: CanvasTexture, satelliteCount: number) {
    this.#streak = streak;
    this.#glow = glow;
    this.#satelliteCount = satelliteCount;
  }

  addTo(scene: Scene): void {
    scene.add(this.group);
  }

  /** Rebuild for a new viewport. Cheap — at most eight sprites. */
  resize(w: number, h: number, now: number): void {
    this.#w = Math.max(1, w);
    this.#h = Math.max(1, h);
    this.#buildShooting();
    this.#buildSatellites();
    this.#scheduleNextShoot(now);
  }

  #buildShooting(): void {
    for (const s of this.#shooting) {
      s.sprite.removeFromParent();
      s.material.dispose();
    }
    this.#shooting = [];
    for (let i = 0; i < MAX_SHOOTING; i++) {
      const material = new SpriteMaterial({
        map: this.#streak,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        opacity: 0,
      });
      const sprite = new Sprite(material);
      sprite.visible = false;
      sprite.position.z = -5;
      this.group.add(sprite);
      this.#shooting.push({
        sprite,
        material,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        ttl: 1,
        len: 0,
        width: 1,
        active: false,
      });
    }
  }

  #buildSatellites(): void {
    for (const s of this.#satellites) {
      s.sprite.removeFromParent();
      s.material.dispose();
    }
    this.#satellites = [];
    for (let i = 0; i < this.#satelliteCount; i++) {
      const material = new SpriteMaterial({
        map: this.#glow,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      const sprite = new Sprite(material);
      sprite.position.z = -5;
      this.group.add(sprite);
      this.#satellites.push({ sprite, material, ...this.#spawnSatellite() });
    }
  }

  /** Matches createSatellite(), script.js:457-471. */
  #spawnSatellite(): Omit<Satellite, "sprite" | "material"> {
    const fromLeft = Math.random() > 0.5;
    const baseSpeed = 18 + Math.random() * 26;
    return {
      x: fromLeft ? -40 : this.#w + 40,
      y: this.#h * (0.1 + Math.random() * 0.45),
      vx: fromLeft ? baseSpeed : -baseSpeed,
      vy: (Math.random() - 0.5) * 2.2,
      size: 1.3 + Math.random() * 1.1,
      blinkPhase: Math.random() * Math.PI * 2,
      blinkSpeed: 0.006 + Math.random() * 0.005,
      glow: 0.55 + Math.random() * 0.25,
    };
  }

  #scheduleNextShoot(now: number): void {
    this.#nextShootAt = now + 1800 + Math.random() * 4700;
  }

  #launch(): void {
    const idle = this.#shooting.find((s) => !s.active);
    if (!idle) return;
    const angle = (25 + Math.random() * 20) * (Math.PI / 180);
    const speed = 650 + Math.random() * 550;
    idle.x = Math.random() * this.#w * 0.6 - this.#w * 0.2;
    idle.y = Math.random() * this.#h * 0.35;
    idle.vx = Math.cos(angle) * speed;
    idle.vy = Math.sin(angle) * speed;
    idle.life = 0;
    idle.ttl = 700 + Math.random() * 450;
    idle.len = 90 + Math.random() * 120;
    idle.width = 1 + Math.random() * 1.2;
    idle.active = true;
    idle.sprite.visible = true;
    // Sprite rotation is counter-clockwise; screen y grows downward, so the
    // travel angle has to be negated to point the streak the way it moves.
    idle.material.rotation = -angle;
  }

  /**
   * @param dt seconds since the last frame, already clamped by the caller
   * @param elapsed seconds since start, used for blink phase
   * @param nowMs rAF timestamp, used only for the shooting-star schedule
   */
  update(dt: number, elapsed: number, nowMs: number): void {
    const dtMs = dt * 1000;

    if (nowMs >= this.#nextShootAt) {
      this.#launch();
      this.#scheduleNextShoot(nowMs);
    }

    for (const s of this.#shooting) {
      if (!s.active) continue;
      s.life += dtMs;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.life > s.ttl || s.x > this.#w + s.len || s.y > this.#h + s.len) {
        s.active = false;
        s.sprite.visible = false;
        continue;
      }
      const fade = 1 - s.life / s.ttl;
      const n = Math.hypot(s.vx, s.vy) || 1;
      // The sprite is centred, so it sits at the midpoint of head and tail.
      const midX = s.x - (s.vx / n) * s.len * 0.5;
      const midY = s.y - (s.vy / n) * s.len * 0.5;
      s.sprite.position.set(midX, -midY, -5);
      s.sprite.scale.set(s.len, s.width * 7, 1);
      s.material.opacity = fade;
    }

    for (const s of this.#satellites) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.y += Math.sin((elapsed * 1000 + s.blinkPhase * 2000) * 0.00035) * 0.02;
      if (s.x < -80 || s.x > this.#w + 80 || s.y < -40 || s.y > this.#h + 40) {
        Object.assign(s, this.#spawnSatellite());
      }
      const blink = 0.55 + 0.45 * Math.sin(elapsed * 1000 * s.blinkSpeed + s.blinkPhase);
      s.sprite.position.set(s.x, -s.y, -5);
      s.sprite.scale.setScalar(s.size * 12);
      s.material.opacity = s.glow * blink;
    }
  }

  dispose(): void {
    for (const s of this.#shooting) s.material.dispose();
    for (const s of this.#satellites) s.material.dispose();
    this.#shooting = [];
    this.#satellites = [];
    this.group.removeFromParent();
    this.group.clear();
  }
}
