/**
 * Convert a drag from a temporary stick origin into a deadzoned unit vector.
 *
 * @param {number} dx
 * @param {number} dy
 * @param {number} radius
 * @param {number} [deadzone]
 * @returns {{ x: number, y: number }}
 */
export function normalizeStickDrag(dx, dy, radius, deadzone = 0.15) {
  if (!Number.isFinite(radius) || radius <= 0) return { x: 0, y: 0 };

  const distance = Math.hypot(dx, dy);
  const threshold = Math.min(0.99, Math.max(0, deadzone));
  const rawMagnitude = Math.min(1, distance / radius);
  if (!Number.isFinite(distance) || distance === 0 || rawMagnitude <= threshold) {
    return { x: 0, y: 0 };
  }

  const magnitude = (rawMagnitude - threshold) / (1 - threshold);
  return {
    x: (dx / distance) * magnitude,
    y: (dy / distance) * magnitude,
  };
}

/**
 * @param {Set<string>} keys
 * @returns {{ x: number, y: number }}
 */
export function keyboardVector(keys) {
  let x = 0;
  let y = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp")) y -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) y += 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) x -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) x += 1;

  const magnitude = Math.hypot(x, y);
  return magnitude ? { x: x / magnitude, y: y / magnitude } : { x: 0, y: 0 };
}

/**
 * Keep pointer sources independent so releasing one cannot clear another.
 *
 * @param {{
 *   keyboardMove: { x: number, y: number },
 *   stickMove: { x: number, y: number },
 *   stickActive: boolean,
 *   keyboardFire: boolean,
 *   touchFire: boolean,
 * }} sources
 */
export function mergeInputSources(sources) {
  const move = sources.stickActive ? sources.stickMove : sources.keyboardMove;
  return {
    moveX: move.x,
    moveY: move.y,
    fire: sources.keyboardFire || sources.touchFire,
  };
}
