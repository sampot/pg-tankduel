import { describe, expect, it } from "vitest";

import {
  keyboardVector,
  mergeInputSources,
  normalizeStickDrag,
} from "./input-controls.js";

describe("normalizeStickDrag", () => {
  it("returns zero inside the radial deadzone", () => {
    expect(normalizeStickDrag(10, 0, 100, 0.15)).toEqual({ x: 0, y: 0 });
    expect(normalizeStickDrag(0, 15, 100, 0.15)).toEqual({ x: 0, y: 0 });
  });

  it("remaps travel outside the deadzone to a normalized unit circle", () => {
    const halfway = normalizeStickDrag(57.5, 0, 100, 0.15);
    expect(halfway.x).toBeCloseTo(0.5);
    expect(halfway.y).toBe(0);
    expect(normalizeStickDrag(200, 0, 100, 0.15)).toEqual({ x: 1, y: 0 });

    const diagonal = normalizeStickDrag(100, 100, 100, 0.15);
    expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(1);
    expect(diagonal.x).toBeCloseTo(Math.SQRT1_2);
    expect(diagonal.y).toBeCloseTo(Math.SQRT1_2);
  });

  it("handles an unusable radius without non-finite values", () => {
    expect(normalizeStickDrag(20, 10, 0, 0.15)).toEqual({ x: 0, y: 0 });
  });
});

describe("keyboardVector", () => {
  it("normalizes diagonal keyboard movement", () => {
    const keys = new Set(["KeyW", "ArrowRight"]);
    const vector = keyboardVector(keys);
    expect(vector.x).toBeCloseTo(Math.SQRT1_2);
    expect(vector.y).toBeCloseTo(-Math.SQRT1_2);
  });
});

describe("mergeInputSources", () => {
  it("keeps an active stick authoritative even while centered", () => {
    expect(
      mergeInputSources({
        keyboardMove: { x: 1, y: 0 },
        stickMove: { x: 0, y: 0 },
        stickActive: true,
        keyboardFire: false,
        touchFire: false,
      }),
    ).toEqual({ moveX: 0, moveY: 0, fire: false });
  });

  it("falls back to keyboard movement when the stick is inactive", () => {
    expect(
      mergeInputSources({
        keyboardMove: { x: -1, y: 0 },
        stickMove: { x: 0.5, y: 0.5 },
        stickActive: false,
        keyboardFire: false,
        touchFire: false,
      }),
    ).toEqual({ moveX: -1, moveY: 0, fire: false });
  });

  it("keeps fire pressed until every input source releases", () => {
    expect(
      mergeInputSources({
        keyboardMove: { x: 0, y: 0 },
        stickMove: { x: 0, y: 0 },
        stickActive: false,
        keyboardFire: true,
        touchFire: true,
      }).fire,
    ).toBe(true);

    expect(
      mergeInputSources({
        keyboardMove: { x: 0, y: 0 },
        stickMove: { x: 0, y: 0 },
        stickActive: false,
        keyboardFire: true,
        touchFire: false,
      }).fire,
    ).toBe(true);
  });
});
