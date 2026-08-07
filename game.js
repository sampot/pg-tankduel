/**
 * Tank duel — top-down arena. Genre homage, not a commercial clone.
 */

export const W = 360;
export const H = 520;
export const TANK_R = 16;
export const BULLET_R = 3.5;
export const BULLET_SPEED = 320;
export const TANK_SPEED = 95;
export const TURN_SPEED = 3.2;
export const FIRE_COOLDOWN = 0.55;
export const MAX_HP = 5;

/**
 * @typedef {{ x: number, y: number, w: number, h: number }} Wall
 * @typedef {{ x: number, y: number, vx: number, vy: number, life: number, side: 'player'|'enemy', fromId: number }} Bullet
 * @typedef {{
 *   id: number,
 *   side: 'player'|'enemy',
 *   x: number, y: number,
 *   angle: number,
 *   turret: number,
 *   hp: number,
 *   cool: number,
 *   alive: boolean,
 *   move: number,
 *   turn: number,
 *   aiThink?: number,
 *   style?: number,
 * }} Tank
 */

let _id = 1;
function nid() {
  return _id++;
}

/** @returns {Wall[]} */
export function makeWalls() {
  return [
    { x: 110, y: 140, w: 140, h: 18 },
    { x: 40, y: 250, w: 18, h: 100 },
    { x: 302, y: 250, w: 18, h: 100 },
    { x: 110, y: 360, w: 140, h: 18 },
    { x: 150, y: 230, w: 60, h: 60 },
  ];
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} r
 * @param {Wall[]} walls
 */
export function hitsWall(x, y, r, walls) {
  for (const w of walls) {
    const cx = Math.max(w.x, Math.min(x, w.x + w.w));
    const cy = Math.max(w.y, Math.min(y, w.y + w.h));
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} r
 */
export function inBounds(x, y, r) {
  return x >= r + 4 && x <= W - r - 4 && y >= r + 4 && y <= H - r - 4;
}

export class TankDuelGame {
  constructor() {
    /** @type {'ready'|'playing'|'won'|'lost'} */
    this.status = "ready";
    /** @type {'pve'|'aivai'} */
    this.mode = "pve";
    this.message = "選模式後點「開戰」";
    this.score = 0;
    this.wins = 0;
    this.walls = makeWalls();
    /** @type {Tank[]} */
    this.tanks = [];
    /** @type {Bullet[]} */
    this.bullets = [];
    /** @type {{ x: number, y: number, t: number, big: boolean }[]} */
    this.explosions = [];
    this.shake = 0;
  }

  reset() {
    this.status = "ready";
    this.message = "選模式後點「開戰」";
    this.score = 0;
    this.walls = makeWalls();
    this.tanks = [];
    this.bullets = [];
    this.explosions = [];
    this.shake = 0;
  }

  /**
   * @param {'pve'|'aivai'} [mode]
   */
  start(mode = this.mode) {
    this.mode = mode;
    this.status = "playing";
    this.message = mode === "aivai" ? "觀戰：綠 AI vs 紅 AI" : "摧毀敵方戰車！";
    this.score = 0;
    this.walls = makeWalls();
    this.bullets = [];
    this.explosions = [];
    this.shake = 0;
    this.tanks = [
      {
        id: nid(),
        side: "player",
        x: W * 0.5,
        y: H - 56,
        angle: -Math.PI / 2,
        turret: -Math.PI / 2,
        hp: MAX_HP,
        cool: 0,
        alive: true,
        move: 0,
        turn: 0,
        aiThink: 0.2,
        style: mode === "aivai" ? 0 : 0,
      },
      {
        id: nid(),
        side: "enemy",
        x: W * 0.5,
        y: 56,
        angle: Math.PI / 2,
        turret: Math.PI / 2,
        hp: MAX_HP,
        cool: 0.35,
        alive: true,
        move: 0,
        turn: 0,
        aiThink: 0.1,
        style: 1,
      },
    ];
  }

  get player() {
    return this.tanks.find((t) => t.side === "player");
  }

  get enemy() {
    return this.tanks.find((t) => t.side === "enemy");
  }

  get isWatching() {
    return this.mode === "aivai";
  }

  /**
   * @param {Tank} tank
   */
  tryFire(tank) {
    if (!tank.alive || tank.cool > 0 || this.status !== "playing") return false;
    tank.cool = FIRE_COOLDOWN;
    const muzzle = 26;
    const ang = tank.turret;
    this.bullets.push({
      x: tank.x + Math.cos(ang) * muzzle,
      y: tank.y + Math.sin(ang) * muzzle,
      vx: Math.cos(ang) * BULLET_SPEED,
      vy: Math.sin(ang) * BULLET_SPEED,
      life: 2.2,
      side: tank.side,
      fromId: tank.id,
    });
    return true;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {boolean} big
   */
  boom(x, y, big = false) {
    this.explosions.push({ x, y, t: big ? 0.7 : 0.35, big });
    this.shake = Math.max(this.shake, big ? 10 : 5);
  }

  /**
   * @param {number} dt
   * @param {{ mx: number, my: number, aimX: number, aimY: number, fire: boolean }} input
   */
  update(dt, input) {
    if (this.status !== "playing") {
      this.tickFx(dt);
      return { events: /** @type {string[]} */ ([]) };
    }

    /** @type {string[]} */
    const events = [];
    const player = this.player;
    const enemy = this.enemy;
    if (!player || !enemy) return { events };

    if (this.mode === "aivai") {
      if (player.alive) {
        this.updateAi(player, enemy, dt, events, "fire");
        player.cool = Math.max(0, player.cool - dt);
      }
      if (enemy.alive) {
        this.updateAi(enemy, player, dt, events, "enemyFire");
        enemy.cool = Math.max(0, enemy.cool - dt);
      }
    } else {
      if (player.alive) {
        const mag = Math.hypot(input.mx, input.my);
        if (mag > 0.15) {
          const target = Math.atan2(input.my, input.mx);
          let diff = target - player.angle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          player.angle += Math.max(-TURN_SPEED * dt, Math.min(TURN_SPEED * dt, diff));
          const speed = TANK_SPEED * Math.min(1, mag);
          this.moveTank(player, Math.cos(player.angle) * speed * dt, Math.sin(player.angle) * speed * dt);
        }
        if (Math.hypot(input.aimX, input.aimY) > 0.2) {
          player.turret = Math.atan2(input.aimY, input.aimX);
        } else {
          player.turret = player.angle;
        }
        player.cool = Math.max(0, player.cool - dt);
        if (input.fire) {
          if (this.tryFire(player)) events.push("fire");
        }
      }
      if (enemy.alive) {
        this.updateAi(enemy, player, dt, events, "enemyFire");
        enemy.cool = Math.max(0, enemy.cool - dt);
      }
    }

    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
    }

    for (const b of this.bullets) {
      if (b.life <= 0) continue;
      if (!inBounds(b.x, b.y, BULLET_R) || hitsWall(b.x, b.y, BULLET_R, this.walls)) {
        b.life = 0;
        this.boom(b.x, b.y, false);
        events.push("impact");
        continue;
      }
      for (const t of this.tanks) {
        if (!t.alive || t.id === b.fromId) continue;
        const dx = t.x - b.x;
        const dy = t.y - b.y;
        if (dx * dx + dy * dy < (TANK_R + BULLET_R) * (TANK_R + BULLET_R)) {
          b.life = 0;
          t.hp -= 1;
          this.boom(b.x, b.y, t.hp <= 0);
          events.push(t.hp <= 0 ? "kill" : "hit");
          if (t.hp <= 0) {
            t.alive = false;
            t.hp = 0;
            this.boom(t.x, t.y, true);
            if (t.side === "enemy") {
              this.score += this.mode === "aivai" ? 0 : 100;
              this.wins += 1;
              this.status = "won";
              this.message =
                this.mode === "aivai" ? "綠方 AI 獲勝！" : "敵方擊毀！再戰一回合？";
              events.push("win");
            } else {
              this.status = "lost";
              this.message =
                this.mode === "aivai" ? "紅方 AI 獲勝！" : "我方陣亡…再試一次";
              events.push("lose");
            }
          } else if (t.side === "enemy" && this.mode === "pve") {
            this.score += 20;
          }
        }
      }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);
    this.tickFx(dt);
    return { events };
  }

  /**
   * @param {number} dt
   */
  tickFx(dt) {
    for (const e of this.explosions) e.t -= dt;
    this.explosions = this.explosions.filter((e) => e.t > 0);
    this.shake = Math.max(0, this.shake - dt * 28);
  }

  /**
   * @param {Tank} tank
   * @param {number} dx
   * @param {number} dy
   */
  moveTank(tank, dx, dy) {
    const nx = tank.x + dx;
    const ny = tank.y + dy;
    if (inBounds(nx, tank.y, TANK_R) && !hitsWall(nx, tank.y, TANK_R, this.walls)) {
      let ok = true;
      for (const o of this.tanks) {
        if (o.id === tank.id || !o.alive) continue;
        if ((nx - o.x) ** 2 + (tank.y - o.y) ** 2 < (TANK_R * 2) ** 2) ok = false;
      }
      if (ok) tank.x = nx;
    }
    if (inBounds(tank.x, ny, TANK_R) && !hitsWall(tank.x, ny, TANK_R, this.walls)) {
      let ok = true;
      for (const o of this.tanks) {
        if (o.id === tank.id || !o.alive) continue;
        if ((tank.x - o.x) ** 2 + (ny - o.y) ** 2 < (TANK_R * 2) ** 2) ok = false;
      }
      if (ok) tank.y = ny;
    }
  }

  /**
   * @param {Tank} self
   * @param {Tank} target
   * @param {number} dt
   * @param {string[]} events
   * @param {string} fireEvent
   */
  updateAi(self, target, dt, events, fireEvent) {
    if (self.aiThink == null) self.aiThink = 0;
    self.aiThink -= dt;

    // style 0 = aggressive closer; style 1 = keep distance / strafe more
    const style = self.style ?? (self.side === "enemy" ? 1 : 0);
    const turnRate = style === 0 ? 0.95 : 0.78;
    const aimSnap = style === 0 ? 0.2 : 0.14;
    const preferDist = style === 0 ? 110 : 170;
    const speedMul = style === 0 ? 0.8 : 0.68;

    const toT = Math.atan2(target.y - self.y, target.x - self.x);
    let tdiff = toT - self.turret;
    while (tdiff > Math.PI) tdiff -= Math.PI * 2;
    while (tdiff < -Math.PI) tdiff += Math.PI * 2;
    self.turret += Math.max(-2.8 * dt, Math.min(2.8 * dt, tdiff));

    let adiff = toT - self.angle;
    while (adiff > Math.PI) adiff -= Math.PI * 2;
    while (adiff < -Math.PI) adiff += Math.PI * 2;
    self.angle += Math.max(-TURN_SPEED * turnRate * dt, Math.min(TURN_SPEED * turnRate * dt, adiff));

    const dist = Math.hypot(target.x - self.x, target.y - self.y);
    let speed = TANK_SPEED * speedMul;
    if (dist < preferDist - 40) speed *= -0.6;
    else if (dist < preferDist) speed *= 0.25;
    else if (dist > preferDist + 80) speed *= 1.05;
    this.moveTank(self, Math.cos(self.angle) * speed * dt, Math.sin(self.angle) * speed * dt);

    if (self.aiThink <= 0) {
      self.aiThink = 0.35 + Math.random() * (style === 1 ? 0.9 : 0.55);
      const side = Math.random() < 0.5 ? 1 : -1;
      const strafe = style === 1 ? 22 : 14;
      this.moveTank(
        self,
        Math.cos(self.angle + Math.PI / 2) * side * strafe,
        Math.sin(self.angle + Math.PI / 2) * side * strafe,
      );
    }

    if (Math.abs(tdiff) < aimSnap && dist < 300 && self.cool <= 0) {
      if (this.hasLos(self.x, self.y, target.x, target.y)) {
        if (this.tryFire(self)) events.push(fireEvent);
      }
    }
  }

  /**
   * @param {number} x0
   * @param {number} y0
   * @param {number} x1
   * @param {number} y1
   */
  hasLos(x0, y0, x1, y1) {
    const steps = 12;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      if (hitsWall(x, y, 2, this.walls)) return false;
    }
    return true;
  }
}
