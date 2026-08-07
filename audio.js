/**
 * Tank duel SFX — punchy cannon + bass explosions via Web Audio.
 */

export class TankAudio {
  constructor() {
    /** @type {AudioContext | null} */
    this.ctx = null;
    this.enabled = true;
    this.master = 0.26;
    /** @type {OscillatorNode | null} */
    this.engineOsc = null;
    /** @type {GainNode | null} */
    this.engineGain = null;
  }

  async unlock() {
    this.ensure();
    if (this.ctx?.state === "suspended") await this.ctx.resume();
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on) this.stopEngine();
  }

  /**
   * @param {number} freq
   * @param {number} dur
   * @param {OscillatorType} [type]
   * @param {number} [gain]
   * @param {number} [when]
   * @param {number} [slideTo]
   */
  tone(freq, dur, type = "sine", gain = 0.12, when = 0, slideTo = 0) {
    if (!this.enabled) return;
    this.ensure();
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t0);
    if (slideTo > 0) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain * this.master, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.04, dur));
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  /**
   * @param {number} dur
   * @param {number} [gain]
   * @param {number} [when]
   * @param {number} [filterFreq]
   * @param {BiquadFilterType} [type]
   */
  noise(dur, gain = 0.12, when = 0, filterFreq = 800, type = "lowpass") {
    if (!this.enabled) return;
    this.ensure();
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const env = 1 - i / len;
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(filterFreq, t0);
    filter.Q.setValueAtTime(0.7, t0);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain * this.master, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  /** Sub thump for explosions. */
  thump(gain = 0.28, when = 0) {
    this.tone(68, 0.28, "sine", gain, when, 28);
    this.tone(42, 0.35, "triangle", gain * 0.7, when + 0.02, 22);
  }

  click() {
    this.tone(520, 0.04, "triangle", 0.06);
  }

  /** Cannon blast — loud muzzle crack + bass kick. */
  fire() {
    this.ensure();
    if (this.ctx?.state === "suspended") void this.ctx.resume();
    // sharp crack
    this.noise(0.06, 0.38, 0, 3200, "bandpass");
    this.noise(0.1, 0.28, 0.01, 900, "highpass");
    // body boom
    this.noise(0.22, 0.26, 0.02, 280, "lowpass");
    this.tone(120, 0.12, "sawtooth", 0.2, 0, 55);
    this.tone(70, 0.22, "sine", 0.26, 0.005, 32);
    this.tone(45, 0.28, "triangle", 0.16, 0.02, 28);
    // shell whoosh departing
    this.noise(0.14, 0.12, 0.04, 2400, "bandpass");
    this.tone(880, 0.08, "triangle", 0.06, 0.03, 220);
  }

  enemyFire() {
    this.ensure();
    if (this.ctx?.state === "suspended") void this.ctx.resume();
    this.noise(0.055, 0.32, 0, 2800, "bandpass");
    this.noise(0.18, 0.22, 0.015, 320, "lowpass");
    this.tone(100, 0.11, "sawtooth", 0.16, 0, 48);
    this.tone(58, 0.2, "sine", 0.2, 0.01, 30);
    this.noise(0.12, 0.1, 0.04, 2000, "bandpass");
  }

  /** Small shell impact. */
  impact() {
    this.noise(0.1, 0.14, 0, 900, "lowpass");
    this.tone(110, 0.08, "triangle", 0.08, 0, 50);
  }

  /** Hull hit. */
  hit() {
    this.noise(0.14, 0.18, 0, 700, "lowpass");
    this.thump(0.18);
    this.tone(200, 0.06, "square", 0.05);
  }

  /** Big tank kill explosion — must feel heavy. */
  explode() {
    this.thump(0.36);
    this.thump(0.22, 0.05);
    this.noise(0.35, 0.32, 0, 500, "lowpass");
    this.noise(0.22, 0.2, 0.04, 2200, "bandpass");
    this.noise(0.5, 0.14, 0.08, 180, "lowpass");
    this.tone(55, 0.45, "sine", 0.22, 0, 25);
    this.tone(320, 0.12, "sawtooth", 0.08, 0.02, 80);
  }

  win() {
    for (let i = 0; i < 5; i++) {
      this.tone(330 * Math.pow(1.2, i), 0.12, "sine", 0.09, i * 0.07);
    }
  }

  lose() {
    this.tone(220, 0.2, "triangle", 0.1, 0, 90);
    this.tone(140, 0.28, "sine", 0.08, 0.1, 60);
  }

  startEngine() {
    if (!this.enabled) return;
    this.ensure();
    const ctx = this.ctx;
    if (!ctx || this.engineOsc) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = 48;
    g.gain.value = 0.0001;
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    g.gain.exponentialRampToValueAtTime(0.035 * this.master, ctx.currentTime + 0.2);
    this.engineOsc = osc;
    this.engineGain = g;
  }

  /**
   * @param {number} throttle 0..1
   */
  setEngine(throttle) {
    if (!this.engineOsc || !this.engineGain || !this.ctx) return;
    const t = this.ctx.currentTime;
    const f = 44 + throttle * 36;
    this.engineOsc.frequency.setTargetAtTime(f, t, 0.08);
    this.engineGain.gain.setTargetAtTime(
      this.enabled ? (0.02 + throttle * 0.04) * this.master : 0.0001,
      t,
      0.08,
    );
  }

  stopEngine() {
    if (!this.engineOsc || !this.ctx) return;
    try {
      this.engineGain?.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.15);
      const osc = this.engineOsc;
      setTimeout(() => {
        try {
          osc.stop();
        } catch {
          /* */
        }
      }, 200);
    } catch {
      /* */
    }
    this.engineOsc = null;
    this.engineGain = null;
  }
}
