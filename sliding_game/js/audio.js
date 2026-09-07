/* ============================================================
 * audio.js — 纯 WebAudio 合成音效（风声/金币/护盾/撞击/跳跃等）
 * ============================================================ */
'use strict';
(function (global) {
  const SG = global.SG;

  const A = {
    ctx: null, master: null, muted: false,
    windGain: null, windFilter: null, ready: false,

    init() {
      if (this.ready) return;
      try {
        const AC = global.AudioContext || global.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.85;
        this.master.connect(this.ctx.destination);

        const len = this.ctx.sampleRate * 2;
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource();
        src.buffer = buf; src.loop = true;
        this.windFilter = this.ctx.createBiquadFilter();
        this.windFilter.type = 'bandpass';
        this.windFilter.frequency.value = 480;
        this.windFilter.Q.value = 0.6;
        this.windGain = this.ctx.createGain();
        this.windGain.gain.value = 0;
        src.connect(this.windFilter); this.windFilter.connect(this.windGain);
        this.windGain.connect(this.master);
        src.start();
        this.ready = true;
      } catch (e) { /* 静默 */ }
    },

    resume() {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    toggleMute() {
      this.muted = !this.muted;
      if (this.master) this.master.gain.value = this.muted ? 0 : 0.85;
      return this.muted;
    },

    setWind(speed, boost) {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      const k = U.clamp((speed - 6) / 24, 0, 1) * (boost ? 1.3 : 1);
      this.windGain.gain.setTargetAtTime(Math.min(0.5, k * 0.4), t, 0.1);
      this.windFilter.frequency.setTargetAtTime(330 + k * 950, t, 0.12);
    },

    env(g, t0, peak, dur) {
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    },

    tone(freq, t0, dur, type, vol, slideTo) {
      if (!this.ready) return;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      g.connect(this.master); o.connect(g);
      this.env(g, t0, vol || 0.18, dur);
      o.start(t0); o.stop(t0 + dur + 0.05);
    },

    click() { if (this.ready) this.tone(660, this.ctx.currentTime, 0.07, 'triangle', 0.1, 320); },
    go() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      this.tone(523, t, 0.1, 'square', 0.09);
      this.tone(784, t + 0.12, 0.14, 'square', 0.1);
      this.tone(1046, t + 0.25, 0.3, 'square', 0.12);
    },
    coin(n) {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      const f = 900 + Math.min(n, 24) * 30;
      this.tone(f, t, 0.09, 'triangle', 0.16);
      this.tone(f * 1.5, t + 0.06, 0.18, 'sine', 0.12);
    },
    boost() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      this.tone(300, t, 0.6, 'sawtooth', 0.14, 900);
    },
    shieldPick() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      this.tone(420, t, 0.14, 'sine', 0.18, 640);
      this.tone(640, t + 0.1, 0.2, 'sine', 0.16, 860);
    },
    shieldBreak() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      this.tone(1200, t, 0.3, 'square', 0.12, 240);
    },
    hurt() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      this.tone(140, t, 0.5, 'sine', 0.4, 50);
      this.tone(90, t, 0.4, 'triangle', 0.3, 40);
    },
    jump() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      this.tone(240, t, 0.12, 'sine', 0.08, 520);
    },
    land() {
      if (!this.ready) return;
      this.tone(180, this.ctx.currentTime, 0.08, 'sine', 0.09, 90);
    },
    gameover() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      this.tone(392, t, 0.3, 'square', 0.1);
      this.tone(330, t + 0.28, 0.3, 'square', 0.1);
      this.tone(262, t + 0.56, 0.7, 'square', 0.12);
    }
  };
  const U = SG.Utils;
  SG.Audio = A;
})(window);
