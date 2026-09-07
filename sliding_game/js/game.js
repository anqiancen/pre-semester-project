/* ============================================================
 * game.js — 状态机、玩家物理、碰撞结算、计分、第一人称摄像机
 * 关键点：相机高度 = 雪面 + CAM_H + 跳跃高度，永不穿地。
 * ============================================================ */
'use strict';
(function (global) {
  const SG = global.SG;
  const C = SG.Config;
  const U = SG.Utils;

  const G = {
    state: 'menu',
    camera: null,
    p: null,
    keys: {},
    steerTouch: 0,

    score: 0, dist: 0, coins: 0,
    lives: C.LIVES, shield: 0,
    boostT: 0, invulnT: 0,
    time: 0, crashT: 0, shakeT: 0,
    lastZ: 0, runSeed: 0,

    skiRig: null,
    flashEls: null,

    init(scene, camera) {
      this.camera = camera;
      camera.rotation.order = 'YXZ';
      this.skiRig = SG.Visuals.makeSkiRig();
      scene.add(this.skiRig);
      this.dom = {
        hud: q('#hud'),
        start: q('#overlayStart'),
        pause: q('#overlayPause'),
        over: q('#overlayOver'),
        score: q('#score'), dst: q('#dst'), spd: q('#spd'),
        lives: q('#lives'), shield: q('#shieldBadge'), boost: q('#boostBadge'),
        flashRed: q('#flashRed'), flashShield: q('#flashShield'), flashSlow: q('#flashSlow'),
        resScore: q('#resScore'), resDist: q('#resDist'),
        resCoins: q('#resCoins'), resBest: q('#resBest'),
        goFlash: q('#goFlash')
      };
      this.flashEls = {
        red: this.dom.flashRed, cyan: this.dom.flashShield, slow: this.dom.flashSlow
      };
    },

    /* ---------- 玩家 ---------- */
    basePlayer() {
      return {
        x: C.START_X, z: C.START_Z,
        vx: 0, vy: 0, air: 0, duck: 0,
        speed: C.START_SPEED, camY: 0
      };
    },

    resetWorld(seed) {
      SG.Terrain.reset(C.START_Z, seed);
      SG.Props.reset(C.START_Z, seed);
      this.p = this.basePlayer();
    },

    toMenu() {
      this.state = 'menu';
      const seed = (Math.random() * 0x7fffffff) | 0;
      this.runSeed = seed;
      SG.Props.noSpawn = true;
      this.resetWorld(seed);
      this.p.speed = 7;
      this.lastZ = this.p.z;
      show(this.dom.hud, false);
      show(this.dom.start, true);
      show(this.dom.over, false);
      show(this.dom.pause, false);
    },

    startRun() {
      this.state = 'running';
      const seed = (Math.random() * 0x7fffffff) | 0;
      this.runSeed = seed;
      SG.Props.noSpawn = false;
      SG.Terrain.reset(C.START_Z, seed);
      SG.Props.reset(C.START_Z, seed);
      this.p = this.basePlayer();
      this.p.speed = C.START_SPEED;
      const ground = SG.Terrain.heightAt(this.p.x, this.p.z);
      this.p.camY = ground + C.CAM_H;

      this.score = 0; this.dist = 0; this.coins = 0;
      this.lives = C.LIVES; this.shield = 0;
      this.boostT = 0; this.invulnT = 0; this.crashT = 0;
      this.time = 0; this.lastZ = this.p.z;

      show(this.dom.hud, true);
      show(this.dom.start, false);
      show(this.dom.over, false);
      show(this.dom.pause, false);

      const f = this.dom.goFlash;
      show(f, false);
      void f.offsetWidth;
      show(f, true);
      setTimeout(() => show(f, false), 1150);

      SG.Audio.resume();
      SG.Audio.go();
      this.updateHud();
    },

    toOver() {
      this.state = 'over';
      const bestScore = bestGet('ski3d_bestScore');
      if (this.score > bestScore) bestSet('ski3d_bestScore', Math.floor(this.score));
      const dom = this.dom;
      dom.resScore.textContent = Math.floor(this.score);
      dom.resDist.textContent = Math.floor(this.dist) + ' m';
      dom.resCoins.textContent = this.coins;
      dom.resBest.textContent = Math.max(bestScore, this.score);
      show(dom.hud, false);
      show(dom.over, true);
      SG.Audio.gameover();
    },

    setPaused(v) {
      if (v && this.state === 'running') {
        this.state = 'pause';
        show(this.dom.pause, true);
        SG.Audio.setWind(0, false);
      } else if (!v && this.state === 'pause') {
        this.state = 'running';
        show(this.dom.pause, false);
      }
    },

    /* ---------- 主循环 ---------- */
    update(dt) {
      if (dt <= 0) return;
      this.time += dt;
      switch (this.state) {
        case 'menu': this.menuStep(dt); break;
        case 'running': this.runStep(dt); break;
        case 'crash': this.crashStep(dt); break;
        case 'pause':
        case 'over':
          SG.Audio.setWind(0, false);
          break;
      }
    },

    menuStep(dt) {
      const p = this.p;
      p.z += p.speed * dt;
      p.speed = 7 + Math.sin(this.time * 0.6) * 1.2;
      this.p.x = Math.sin(this.time * 0.2) * 2.5;
      SG.Terrain.update(p.z);
      SG.Props.update(p, dt, this.time);
      this.updateCamera(dt);
      SG.Audio.setWind(3, false);
    },

    runStep(dt) {
      const p = this.p;
      const k = this.keys;

      // 横向控制：带惯性
      const steer = U.clamp((k.left ? 1 : 0) - (k.right ? 1 : 0) + this.steerTouch, -1, 1);
      p.vx = U.damp(p.vx, steer * C.TURN_MAX, 4.2, dt);
      p.x += p.vx * dt;
      const half = C.COURSE_HALF;
      if (p.x > half) { p.x = half; p.vx = 0; }
      if (p.x < -half) { p.x = -half; p.vx = 0; }

      // 自动速度 = 基础(随距离) + 加速道具 + 下蹲减速
      const base = U.clamp(C.START_SPEED + this.dist * C.SPEED_RAMP, C.START_SPEED, C.MAX_SPEED);
      let spd = base;
      const boosting = this.boostT > 0;
      if (boosting) spd = Math.min(C.MAX_SPEED * C.BOOST_MULT, spd * C.BOOST_MULT);
      const ducking = k.down === true;
      p.duck = ducking ? 1 : 0;
      if (ducking) spd *= C.DUCK_SPEED;
      p.speed = spd;
      p.z += spd * dt;

      // 跳跃物理（相对雪面高度 air）
      if (p.air > 0) {
        p.vy -= C.GRAVITY * dt;
        p.air += p.vy * dt;
        if (p.air <= 0) {
          p.air = 0; p.vy = 0;
          SG.Audio.land();
          SG.Visuals.spawnBurst(p.x, SG.Terrain.heightAt(p.x, p.z) + 0.2, p.z, 0xffffff, 6, 2);
        }
      }

      // 计时器
      if (this.boostT > 0) this.boostT -= dt;
      if (this.invulnT > 0) this.invulnT -= dt;
      if (this.shakeT > 0) this.shakeT -= dt;

      // 世界/物体
      SG.Terrain.update(p.z);
      SG.Props.update(p, dt, this.time);
      if (SG.Props.hit) { this.onHit(SG.Props.hit); }

      const hits = SG.Props.collected;
      for (let i = 0; i < hits.length; i++) this.onPickup(hits[i]);

      // 计分（距离）
      this.score += (p.z - this.lastZ) * 2;
      this.lastZ = p.z;
      this.dist = Math.max(0, p.z - C.START_Z);

      this.updateCamera(dt);
      this.updateHud();
      SG.Audio.setWind(p.speed, boosting);
    },

    onPickup(h) {
      const py = h.y + 1.55;    // 道具实际漂浮高度
      if (h.kind === 'coin') {
        this.coins++;
        this.score += 50;
        SG.Visuals.spawnBurst(h.x, py, h.z, 0xffd75f, 8, 2.6);
        SG.Audio.coin(this.coins);
      } else if (h.kind === 'boost') {
        this.boostT = C.BOOST_TIME;
        this.score += 100;
        SG.Visuals.spawnBurst(h.x, py, h.z, 0x7ce0ff, 18, 4);
        SG.Audio.boost();
        runFlash(this.flashEls.slow);
      } else if (h.kind === 'shield') {
        if (this.shield < 1) {
          this.shield = 1;
        } else {
          this.score += 100;
        }
        SG.Visuals.spawnBurst(h.x, py, h.z, 0x9fe7ff, 16, 4);
        SG.Audio.shieldPick();
        runFlash(this.flashEls.cyan);
      }
    },

    onHit(ob) {
      if (this.state !== 'running' || this.invulnT > 0) return;
      const p = this.p;
      // 护盾：抵消一次
      if (this.shield > 0) {
        this.shield--;
        SG.Visuals.spawnBurst(ob.x, ob.y + 0.8, ob.z, 0x9fe7ff, 26, 5);
        SG.Audio.shieldBreak();
        runFlash(this.flashEls.cyan);
        SG.Props.destroyHit();
        p.speed = Math.max(8, p.speed * 0.6);
        this.invulnT = 0.6;
        this.updateHud();
        return;
      }
      // 生命值
      this.lives--;
      SG.Visuals.spawnBurst(ob.x, ob.y + 0.8, ob.z, 0xffffff, 34, 7);
      SG.Visuals.spawnBurst(ob.x, ob.y + 0.5, ob.z, 0xd93a3a, 12, 4);
      SG.Props.destroyHit();
      if (this.lives <= 0) {
        this.state = 'crash';
        this.crashT = 0;
        p.spinDir = Math.random() < 0.5 ? -1 : 1;
        SG.Audio.hurt();
        runFlash(this.flashEls.red);
        SG.Audio.setWind(0, false);
        return;
      }
      this.shakeT = 0.55;
      this.invulnT = 1.35;
      this.boostT = 0;
      p.speed = Math.max(8, p.speed * 0.5);
      SG.Audio.hurt();
      runFlash(this.flashEls.red);
    },

    crashStep(dt) {
      const p = this.p;
      this.crashT += dt;
      p.speed = Math.max(0, p.speed - 42 * dt);
      p.z += p.speed * dt;
      SG.Terrain.update(p.z);
      SG.Props.update(p, dt, this.time);
      this.updateCamera(dt);

      const ratio = Math.min(1, this.crashT / 1.5);
      const shake = (1 - ratio) * 0.4;
      const cam = this.camera;
      const hy = SG.Terrain.heightAt(p.x, p.z);
      p.camY = U.damp(p.camY, hy + C.CAM_H * (1 - ratio * 0.4), 5, dt);
      cam.position.set(p.x + (Math.random() - 0.5) * shake * 1.8,
        p.camY,
        p.z + (Math.random() - 0.5) * shake * 1.8);
      cam.rotation.y = Math.PI + (Math.random() - 0.5) * shake * 2.2;
      cam.rotation.x = -p.pitch + (Math.random() - 0.5) * shake * 1.6;
      cam.rotation.z = p.spinDir * (Math.sin(this.crashT * 11) * shake + ratio * 0.75);

      if (this.crashT > 1.5) this.toOver();
    },

    updateCamera(dt) {
      const p = this.p;
      const hy = SG.Terrain.heightAt(p.x, p.z);
      const eye = hy + C.CAM_H + p.air - p.duck * 0.24;
      // 平滑跟随雪面 → 永不穿地
      p.camY = p.camY === 0 ? eye : U.damp(p.camY, eye, 10, dt);

      // 俯仰：坡度 + 少量下视 + 速度感
      const farH = SG.Terrain.heightAt(p.x, p.z + 45);
      const slopePitch = U.clamp(Math.atan((hy - farH) / 45), -0.2, 0.3);
      p.pitch = U.damp(p.pitch || slopePitch, slopePitch + 0.02 + p.speed * 0.0006, 6, dt);

      // 侧倾与左右横移带来的视角扫动
      const rollTarget = -p.vx * 0.008 - p.duck * 0.06;
      const shake = this.shakeT > 0 ? Math.sin(this.time * 46) * 0.05 * (this.shakeT / 0.55) : 0;
      p.roll = U.damp(p.roll || 0, rollTarget, 6, dt);

      const cam = this.camera;
      cam.position.set(p.x + p.vx * 0.06, p.camY + shake * 0.3, p.z + shake * 0.2);
      cam.rotation.set(-p.pitch + shake * 0.4, Math.PI, p.roll + shake);

      // 双板 + 雪靴（世界坐标 → 精确贴合雪面，跳起时随之抬起）
      const rig = this.skiRig;
      if (rig) {
        const gy = SG.Terrain.gradAt(p.x, p.z);
        rig.position.set(p.x, hy + p.air + 0.04, p.z);
        rig.rotation.set(Math.atan(-gy.hz), 0, -Math.atan(gy.hx) * 0.5);
        rig.visible = this.state !== 'over';
      }
    },

    /* ---------- HUD ---------- */
    updateHud() {
      const p = this.p;
      const d = this.dom;
      d.score.textContent = Math.floor(this.score);
      d.dst.textContent = Math.floor(this.dist);
      d.spd.textContent = Math.round(p.speed * 3.6);
      // 生命（❤ / 💔）
      let h = '';
      for (let i = 0; i < C.LIVES; i++) {
        h += i < this.lives ? '❤️' : '💔';
      }
      d.lives.textContent = h;
      // 护盾/加速 徽章
      show(d.shield, this.shield > 0);
      d.shield.textContent = '🛡 ×' + this.shield;
      show(d.boost, this.boostT > 0);
      d.boost.textContent = '⚡ ' + this.boostT.toFixed(1) + 's';
    },

    doJump() {
      if (this.state !== 'running') return;
      const p = this.p;
      if (p.air <= 0.001) {
        p.vy = C.JUMP_V;
        p.air = 0.01;
        SG.Audio.jump();
      }
    },

    setKey(name, down) { this.keys[name] = down; },
    setSteerTouch(v) { this.steerTouch = U.clamp(v, -1, 1); },

    handleActionKey() {
      if (this.state === 'menu' || this.state === 'over') this.startRun();
      else if (this.state === 'pause') this.setPaused(false);
      else if (this.state === 'running') this.doJump();
    },

    retry() {
      if (this.state === 'over' || this.state === 'menu') this.startRun();
    },
  };

  /* ---------- 局部工具 ---------- */
  function q(sel) { return document.querySelector(sel); }
  function show(el, on) {
    if (!el) return;
    if (on) el.classList.remove('hidden');
    else el.classList.add('hidden');
  }
  function runFlash(el) {
    if (!el) return;
    el.classList.remove('hidden');
    void el.offsetWidth;
    el.classList.add('hidden');
    void el.offsetWidth;
    el.classList.remove('hidden');
    setTimeout(function () { el.classList.add('hidden'); }, 600);
  }
  function bestGet(key) {
    try { return +(localStorage.getItem(key) || 0); } catch (e) { return 0; }
  }
  function bestSet(key, val) {
    try { localStorage.setItem(key, String(val)); } catch (e) { /* ignore */ }
  }

  SG.Game = G;
})(window);
