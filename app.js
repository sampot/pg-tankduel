import { TankAudio } from "./audio.js";
import { TankDuelGame, W, H } from "./game.js";
import {
  keyboardVector,
  mergeInputSources,
  normalizeStickDrag,
} from "./input-controls.js";
import { drawArena, drawBullet, drawExplosion, drawTank } from "./sprites.js";

const audio = new TankAudio();
const game = new TankDuelGame();

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("game"));
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const hpYouEl = document.getElementById("hp-you");
const hpEnemyEl = document.getElementById("hp-enemy");
const statusEl = document.getElementById("status");
const btnStart = document.getElementById("btn-start");
const btnMute = document.getElementById("btn-mute");
const btnFire = document.getElementById("btn-fire");
const stickZoneEl = document.getElementById("stick-zone");
const stickEl = document.getElementById("stick");
const knobEl = document.getElementById("stick-knob");
const touchLayer = document.getElementById("touch-layer");
const stageEl = document.querySelector(".stage");
const hintEl = document.getElementById("hint");
const hpYouLabel = document.getElementById("hp-you-label");
const hpEnemyLabel = document.getElementById("hp-enemy-label");
const modeBtns = /** @type {NodeListOf<HTMLButtonElement>} */ (
  document.querySelectorAll(".mode-btn")
);

/** @type {'pve'|'aivai'} */
let selectedMode = "pve";

canvas.width = W;
canvas.height = H;

/** @type {{ mx: number, my: number, aimX: number, aimY: number, fire: boolean }} */
const input = { mx: 0, my: 0, aimX: 0, aimY: 0, fire: false };
/** @type {Set<string>} */
const keys = new Set();
/** @type {{ x: number, y: number }} */
let stickMove = { x: 0, y: 0 };
/** @type {Set<number>} */
const firePointers = new Set();
let lastTs = 0;
/** @type {Set<number>} */
const flashIds = new Set();

/**
 * @param {string} msg
 * @param {string} [tone]
 */
function setStatus(msg, tone = "") {
  statusEl.textContent = msg;
  statusEl.dataset.tone = tone;
}

function syncModeUi() {
  for (const btn of modeBtns) {
    btn.classList.toggle("is-active", btn.dataset.mode === selectedMode);
  }
  const watching = selectedMode === "aivai" || game.isWatching;
  stageEl.classList.toggle("is-spectate", watching && (game.status === "playing" || selectedMode === "aivai"));
  if (selectedMode === "aivai") {
    hpYouLabel.textContent = "綠 AI";
    hpEnemyLabel.textContent = "紅 AI";
    hintEl.textContent = "觀戰模式：雙方 AI 自動對打（綠偏猛攻、紅偏拉距）";
    touchLayer.style.pointerEvents = "none";
  } else {
    hpYouLabel.textContent = "我方 HP";
    hpEnemyLabel.textContent = "敵方 HP";
    hintEl.textContent = "左下區域任意按住拖曳 · 右下炮鍵開火（或鍵盤 WASD／方向鍵＋空白鍵）";
    touchLayer.style.pointerEvents = "";
  }
}

function syncHud() {
  scoreEl.textContent = String(game.score);
  hpYouEl.textContent = String(game.player?.hp ?? 0);
  hpEnemyEl.textContent = String(game.enemy?.hp ?? 0);
  btnStart.textContent = game.status === "ready" ? "開戰" : game.status === "playing" ? "重開" : "再戰";
  const spectate = game.mode === "aivai";
  stageEl.classList.toggle("is-spectate", spectate);
  if (game.status === "playing" && spectate) {
    touchLayer.style.pointerEvents = "none";
  }
}

/**
 * @param {string[]} events
 */
function handleEvents(events) {
  for (const e of events) {
    if (e === "fire") {
      void audio.unlock();
      audio.fire();
    } else if (e === "enemyFire") {
      void audio.unlock();
      audio.enemyFire();
    } else if (e === "impact") audio.impact();
    else if (e === "hit") {
      audio.hit();
      for (const t of game.tanks) {
        if (t.alive) flashIds.add(t.id);
      }
      setTimeout(() => flashIds.clear(), 70);
    } else if (e === "kill") audio.explode();
    else if (e === "win") {
      audio.explode();
      audio.win();
      audio.stopEngine();
      setStatus(game.message, "ok");
    } else if (e === "lose") {
      audio.explode();
      audio.lose();
      audio.stopEngine();
      setStatus(game.message, "bad");
    }
  }
}

function layoutCanvas() {
  // CSS scales; drawing uses logical W/H
}

const STICK_RADIUS = 58;
const STICK_DEADZONE = 0.15;
const KNOB_TRAVEL = 40;

/** @type {number | null} */
let stickPointer = null;
/** @type {{ x: number, y: number }} */
let stickOrigin = { x: 0, y: 0 };

function syncInputSources() {
  const merged = mergeInputSources({
    keyboardMove: keyboardVector(keys),
    stickMove,
    stickActive: stickPointer != null,
    keyboardFire: keys.has("Space"),
    touchFire: firePointers.size > 0,
  });
  input.mx = merged.moveX;
  input.my = merged.moveY;
  input.fire = merged.fire;
  if (Math.hypot(input.mx, input.my) > 0) {
    input.aimX = input.mx;
    input.aimY = input.my;
  }
}

function setStickVisual(x, y) {
  knobEl.style.transform = `translate(-50%, -50%) translate(${x * KNOB_TRAVEL}px, ${y * KNOB_TRAVEL}px)`;
}

stickZoneEl.addEventListener(
  "pointerdown",
  (ev) => {
    if (stickPointer != null) return;
    ev.preventDefault();
    stickZoneEl.setPointerCapture(ev.pointerId);
    stickPointer = ev.pointerId;
    stickOrigin = { x: ev.clientX, y: ev.clientY };
    stickMove = { x: 0, y: 0 };
    const rect = stickZoneEl.getBoundingClientRect();
    stickEl.style.left = `${ev.clientX - rect.left}px`;
    stickEl.style.top = `${ev.clientY - rect.top}px`;
    stickEl.classList.add("is-active");
    setStickVisual(0, 0);
    syncInputSources();
    void audio.unlock();
  },
  { passive: false },
);

stickZoneEl.addEventListener(
  "pointermove",
  (ev) => {
    if (stickPointer !== ev.pointerId) return;
    ev.preventDefault();
    stickMove = normalizeStickDrag(
      ev.clientX - stickOrigin.x,
      ev.clientY - stickOrigin.y,
      STICK_RADIUS,
      STICK_DEADZONE,
    );
    setStickVisual(stickMove.x, stickMove.y);
    syncInputSources();
  },
  { passive: false },
);

function endStick(ev) {
  if (stickPointer !== ev.pointerId) return;
  stickPointer = null;
  stickMove = { x: 0, y: 0 };
  setStickVisual(0, 0);
  stickEl.classList.remove("is-active");
  syncInputSources();
}

stickZoneEl.addEventListener("pointerup", endStick);
stickZoneEl.addEventListener("pointercancel", endStick);
stickZoneEl.addEventListener("lostpointercapture", endStick);

btnFire.addEventListener(
  "pointerdown",
  (ev) => {
    ev.preventDefault();
    btnFire.setPointerCapture(ev.pointerId);
    firePointers.add(ev.pointerId);
    btnFire.classList.add("is-pressed");
    btnFire.setAttribute("aria-pressed", "true");
    syncInputSources();
    void audio.unlock();
  },
  { passive: false },
);

function endFire(ev) {
  if (!firePointers.delete(ev.pointerId)) return;
  if (firePointers.size === 0) {
    btnFire.classList.remove("is-pressed");
    btnFire.setAttribute("aria-pressed", "false");
  }
  syncInputSources();
}

btnFire.addEventListener("pointerup", endFire);
btnFire.addEventListener("pointercancel", endFire);
btnFire.addEventListener("lostpointercapture", endFire);

window.addEventListener("keydown", (ev) => {
  keys.add(ev.code);
  if (ev.code === "Space") {
    ev.preventDefault();
  }
  syncInputSources();
  void audio.unlock();
});
window.addEventListener("keyup", (ev) => {
  keys.delete(ev.code);
  syncInputSources();
});

function readKeyboard() {
  syncInputSources();
}

function resetInputSources() {
  keys.clear();
  stickPointer = null;
  stickMove = { x: 0, y: 0 };
  firePointers.clear();
  stickEl.classList.remove("is-active");
  btnFire.classList.remove("is-pressed");
  btnFire.setAttribute("aria-pressed", "false");
  setStickVisual(0, 0);
  syncInputSources();
}

window.addEventListener("blur", resetInputSources);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") resetInputSources();
});

btnStart.addEventListener("click", async () => {
  await audio.unlock();
  audio.click();
  game.start(selectedMode);
  syncModeUi();
  if (selectedMode === "pve") audio.startEngine();
  else audio.stopEngine();
  setStatus(game.message);
  syncHud();
});

for (const btn of modeBtns) {
  btn.addEventListener("click", async () => {
    await audio.unlock();
    audio.click();
    selectedMode = /** @type {'pve'|'aivai'} */ (btn.dataset.mode || "pve");
    if (selectedMode === "aivai") resetInputSources();
    syncModeUi();
    if (game.status === "playing") {
      game.start(selectedMode);
      if (selectedMode === "pve") audio.startEngine();
      else audio.stopEngine();
      setStatus(game.message);
      syncHud();
    }
  });
}

btnMute.addEventListener("click", async () => {
  await audio.unlock();
  const on = !(btnMute.getAttribute("aria-pressed") === "true");
  btnMute.setAttribute("aria-pressed", on ? "true" : "false");
  btnMute.textContent = on ? "音效開" : "音效關";
  audio.setEnabled(on);
  if (on && game.status === "playing" && game.mode === "pve") audio.startEngine();
});

/**
 * @param {number} ts
 */
function frame(ts) {
  const dt = Math.min(0.05, (ts - (lastTs || ts)) / 1000);
  lastTs = ts;

  if (game.mode === "pve") readKeyboard();
  const frameInput = {
    mx: game.mode === "pve" ? input.mx : 0,
    my: game.mode === "pve" ? input.my : 0,
    aimX: game.mode === "pve" ? input.aimX : 0,
    aimY: game.mode === "pve" ? input.aimY : 0,
    fire: game.mode === "pve" ? input.fire : false,
  };

  const { events } = game.update(dt, frameInput);
  handleEvents(events);

  const throttle = game.mode === "pve" ? Math.hypot(input.mx, input.my) : 0.35;
  if (game.status === "playing") {
    if (game.mode === "pve") audio.setEngine(throttle);
    else audio.setEngine(0);
  }

  ctx.save();
  if (game.shake > 0.2) {
    ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
  }
  drawArena(ctx, game.walls, "#6b6358", "#9a9184");
  for (const b of game.bullets) drawBullet(ctx, b);
  for (const t of game.tanks) drawTank(ctx, t, flashIds.has(t.id));
  for (const e of game.explosions) drawExplosion(ctx, e);
  ctx.restore();

  syncHud();
  requestAnimationFrame(frame);
}

syncModeUi();
syncHud();
setStatus(game.message);
requestAnimationFrame(frame);
