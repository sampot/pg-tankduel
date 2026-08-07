/**
 * Draw tanks that read as tanks: hull, tracks, turret, barrel, details.
 */

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./game.js').Wall[]} walls
 * @param {string} wallColor
 * @param {string} wallTop
 */
export function drawArena(ctx, walls, wallColor, wallTop) {
  // dirt ground
  const g = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
  g.addColorStop(0, "#3d5a3a");
  g.addColorStop(1, "#2a4028");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 360, 520);

  // subtle grid
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x < 360; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 520);
    ctx.stroke();
  }
  for (let y = 0; y < 520; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(360, y);
    ctx.stroke();
  }

  for (const w of walls) {
    ctx.fillStyle = wallColor;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = wallTop;
    ctx.fillRect(w.x, w.y, w.w, 5);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.strokeRect(w.x + 0.5, w.y + 0.5, w.w - 1, w.h - 1);
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./game.js').Tank} tank
 * @param {boolean} [flash]
 */
export function drawTank(ctx, tank, flash = false) {
  if (!tank.alive && tank.hp <= 0) {
    // wreck
    ctx.save();
    ctx.translate(tank.x, tank.y);
    ctx.rotate(tank.angle);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(-14, -12, 28, 24);
    ctx.restore();
    return;
  }

  const isPlayer = tank.side === "player";
  const hull = isPlayer ? "#3d7a3a" : "#8b3a2e";
  const hullDark = isPlayer ? "#2a5528" : "#5c241c";
  const hullLight = isPlayer ? "#5a9a55" : "#b04a3a";
  const track = "#1a1a1a";
  const trackPad = "#3a3a3a";
  const turret = isPlayer ? "#4a8f48" : "#a04434";
  const barrel = "#222";

  ctx.save();
  ctx.translate(tank.x, tank.y);

  // body + tracks oriented by hull angle
  ctx.rotate(tank.angle);

  // tracks
  ctx.fillStyle = track;
  roundRect(ctx, -18, -14, 8, 28, 2);
  ctx.fill();
  roundRect(ctx, 10, -14, 8, 28, 2);
  ctx.fill();
  // track pads
  ctx.fillStyle = trackPad;
  for (let i = -12; i <= 10; i += 5) {
    ctx.fillRect(-17, i, 6, 2);
    ctx.fillRect(11, i, 6, 2);
  }

  // hull
  const hg = ctx.createLinearGradient(0, -12, 0, 12);
  hg.addColorStop(0, hullLight);
  hg.addColorStop(0.5, hull);
  hg.addColorStop(1, hullDark);
  ctx.fillStyle = flash ? "#fff" : hg;
  roundRect(ctx, -12, -11, 24, 22, 3);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 1.2;
  roundRect(ctx, -12, -11, 24, 22, 3);
  ctx.stroke();

  // front armor plate
  ctx.fillStyle = hullDark;
  ctx.fillRect(8, -8, 4, 16);

  // engine deck vents
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(-10, -8, 8, 2);
  ctx.fillRect(-10, -4, 8, 2);
  ctx.fillRect(-10, 0, 8, 2);

  // side skirts detail
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.beginPath();
  ctx.moveTo(-10, -10);
  ctx.lineTo(8, -10);
  ctx.stroke();

  // turret rotates independently
  ctx.rotate(tank.turret - tank.angle);

  // turret ring
  ctx.fillStyle = hullDark;
  ctx.beginPath();
  ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
  ctx.fill();

  const tg = ctx.createRadialGradient(-2, -2, 1, 0, 0, 9);
  tg.addColorStop(0, hullLight);
  tg.addColorStop(1, turret);
  ctx.fillStyle = flash ? "#ffe" : tg;
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.stroke();

  // commander's hatch
  ctx.fillStyle = hullDark;
  ctx.beginPath();
  ctx.arc(-1, -2, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // barrel
  ctx.fillStyle = barrel;
  roundRect(ctx, 6, -2.2, 20, 4.4, 1.2);
  ctx.fill();
  // muzzle brake
  ctx.fillStyle = "#111";
  ctx.fillRect(24, -3.2, 4, 6.4);
  ctx.fillStyle = "#444";
  ctx.fillRect(25, -2.2, 2, 4.4);

  // barrel highlight
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(8, -1.5, 14, 1.2);

  ctx.restore();

  // HP pips above
  const max = 5;
  const bw = 22;
  const bx = tank.x - bw / 2;
  const by = tank.y - 26;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(bx - 1, by - 1, bw + 2, 5);
  for (let i = 0; i < max; i++) {
    ctx.fillStyle = i < tank.hp ? (isPlayer ? "#6dffb0" : "#ff8a70") : "rgba(255,255,255,0.15)";
    ctx.fillRect(bx + i * (bw / max), by, bw / max - 1, 3);
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./game.js').Bullet} b
 */
export function drawBullet(ctx, b) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(Math.atan2(b.vy, b.vx));
  ctx.fillStyle = "#f5e6a8";
  ctx.shadowColor = "#ff9a3c";
  ctx.shadowBlur = 8;
  roundRect(ctx, -5, -2, 10, 4, 1);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff8d0";
  ctx.fillRect(-2, -1, 4, 2);
  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number, t: number, big: boolean }} e
 */
export function drawExplosion(ctx, e) {
  const maxT = e.big ? 0.7 : 0.35;
  const p = 1 - e.t / maxT;
  const r = (e.big ? 48 : 22) * (0.35 + p * 0.9);
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.globalAlpha = Math.max(0, 1 - p);

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  glow.addColorStop(0, "#fff6c8");
  glow.addColorStop(0.25, "#ff9a2a");
  glow.addColorStop(0.55, "#e03a10");
  glow.addColorStop(1, "rgba(40,20,10,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // debris sparks
  const n = e.big ? 10 : 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + p * 2;
    const d = r * (0.4 + (i % 3) * 0.15) * p;
    ctx.fillStyle = i % 2 ? "#ffd080" : "#ff5020";
    ctx.beginPath();
    ctx.arc(Math.cos(a) * d, Math.sin(a) * d, e.big ? 3.5 : 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // smoke ring
  if (e.big) {
    ctx.strokeStyle = `rgba(60,60,60,${0.5 * (1 - p)})`;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} r
 */
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
