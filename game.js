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
    this.message = "點「開戰」開始對決";
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
    this.aiThink = 0;
  }

  reset() {
    this.status = "ready";
    this.message = "點「開戰」開始對決";
    this.score = 0;
    this.walls = makeWalls();
    this.tanks = [];
    this.bullets = [];
    this.explosions = [];
    this.shake = 0;
  }

  start() {
    this.status = "playing";
    this.message = "摧毀敵方戰車！";
    this.score = 0;
    this.walls = makeWalls();
    this.bullets = [];
    this.explosions = [];
    this.shake = 0;
    this.aiThink = 0;
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
      },
      {
        id: nid(),
        side: "enemy",
        x: W * 0.5,
        y: 56,
        angle: Math.PI / 2,
        turret: Math.PI / 2,
        hp: MAX_HP,
        cool: 0.4,
        alive: true,
        move: 0,
        turn: 0,
      },
    ];
  }

  get player() {
    return this.tanks.find((t) => t.side === "player");
  }

  get enemy() {
    return this.tanks.find((t) => t.side === "enemy");
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

    // player control
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
      // aim turret toward stick aim or last aim
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

    // AI
    if (enemy.alive) {
      this.updateAi(enemy, player, dt, events);
      enemy.cool = Math.max(0, enemy.cool - dt);
    }

    // bullets
    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
    }

    // bullet collisions
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
              this.score += 100;
              this.wins += 1;
              this.status = "won";
              this.message = "敵方擊毀！再戰一回合？";
              events.push("win");
            } else {
              this.status = "lost";
              this.message = "我方陣亡…再試一次";
              events.push("lose");
            }
          } else if (t.side === "enemy") {
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
      // avoid overlapping other tanks
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
   * @param {Tank} enemy
   * @param {Tank} player
   * @param {number} dt
   * @param {string[]} events
   */
  updateAi(enemy, player, dt, events) {
    this.aiThink -= dt;
    const toP = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    // turret tracks player
    let tdiff = toP - enemy.turret;
    while (tdiff > Math.PI) tdiff -= Math.PI * 2;
    while (tdiff < -Math.PI) tdiff += Math.PI * 2;
    enemy.turret += Math.max(-2.8 * dt, Math.min(2.8 * dt, tdiff));

    // body turns toward player with some wander
    let adiff = toP - enemy.angle;
    while (adiff > Math.PI) adiff -= Math.PI * 2;
    while (adiff < -Math.PI) adiff += Math.PI * 2;
    enemy.angle += Math.max(-TURN_SPEED * 0.85 * dt, Math.min(TURN_SPEED * 0.85 * dt, adiff));

    const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    let speed = TANK_SPEED * 0.72;
    if (dist < 90) speed *= -0.55;
    else if (dist < 160) speed *= 0.35;
    this.moveTank(enemy, Math.cos(enemy.angle) * speed * dt, Math.sin(enemy.angle) * speed * dt);

    // strafe occasionally
    if (this.aiThink <= 0) {
      this.aiThink = 0.4 + Math.random() * 0.7;
      const side = Math.random() < 0.5 ? 1 : -1;
      this.moveTank(
        enemy,
        Math.cos(enemy.angle + Math.PI / 2) * side * 18,
        Math.sin(enemy.angle + Math.PI / 2) * side * 18,
      );
    }

    // fire when roughly aimed
    if (Math.abs(tdiff) < 0.18 && dist < 280 && enemy.cool <= 0) {
      // line of sight rough check: skip if wall between (sample)
      if (this.hasLos(enemy.x, enemy.y, player.x, player.y)) {
        if (this.tryFire(enemy)) events.push("enemyFire");
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
