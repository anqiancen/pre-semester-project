/* ============================================================
 * props.js — 障碍/道具对象池 + 公平生成器 + 两侧雪场装饰
 * ============================================================ */
'use strict';
(function (global) {
  const SG = global.SG;
  const C = SG.Config;
  const U = SG.Utils;

  const OB_DEF = {
    tree:  { r: 1.0,  jump: false, f: 'makeTree' },
    rock:  { r: 0.95, jump: false, f: 'makeRock' },
    mound: { r: 1.05, jump: true,  f: 'makeMound' },
    fence: { r: 1.08, jump: true,  f: 'makeFence' }
  };

  const P = {
    scene: null, terrain: null, visuals: null, root: null,
    noSpawn: false,
    rng: null, startZ: 0, cursorZ: 0,
    obstacles: [], pickups: [],
    freePools: { tree: [], rock: [], mound: [], fence: [], coin: [], boost: [], shield: [] },
    // 两侧装饰：近处森林带 → 外围森林 → 混交林/大石 → 雪山
    decorBands: [],
    nearL: [], nearR: [], outL: [], outR: [], mixArr: [], mtnArr: [],

    init(scene, terrain, visuals) {
      this.scene = scene;
      this.terrain = terrain;
      this.visuals = visuals;
      this.root = new THREE.Group();
      scene.add(this.root);

      // side: 0=左右随机
      const bands = [
        { list: this.nearL, side: -1, sp: 9,  x0: 10.6, x1: 13.8, kind: 'trees',    tmin: 0.8, tmax: 1.6, back: 30, front: 170 },
        { list: this.nearR, side:  1, sp: 9,  x0: 10.6, x1: 13.8, kind: 'trees',    tmin: 0.8, tmax: 1.6, back: 30, front: 170 },
        { list: this.outL,  side: -1, sp: 16, x0: 14.8, x1: 20.5, kind: 'trees',    tmin: 1.1, tmax: 2.1, back: 30, front: 170 },
        { list: this.outR,  side:  1, sp: 16, x0: 14.8, x1: 20.5, kind: 'trees',    tmin: 1.1, tmax: 2.1, back: 30, front: 170 },
        { list: this.mixArr, side: 0, sp: 24, x0: 26,   x1: 52,   kind: 'mixed',    tmin: 1.2, tmax: 2.9, back: 24, front: 150 },
        { list: this.mtnArr, side: 0, sp: 38, x0: 46,   x1: 82,   kind: 'mountain', tmin: 4.0, tmax: 8.5, back: 18, front: 140 }
      ];
      for (let bi = 0; bi < bands.length; bi++) {
        const b = bands[bi];
        const n = Math.ceil((b.back + b.front) / b.sp) + 3;
        for (let i = 0; i < n; i++) b.list.push(this.makeSlot(b, i));
        this.decorBands.push(b);
      }
    },

    makeSlot(band, idx) {
      const r = this.rng ? this.rng() : Math.random();
      const range = band.tmax - band.tmin;
      let kind, scale;
      if (band.kind === 'trees') {
        kind = 'tree';
        scale = band.tmin + (r * 100) % range;
      } else if (band.kind === 'mountain') {
        kind = 'mountain';
        scale = band.tmin + (r * 71) % range;
      } else { // mixed：树/岩/雪堆/大岩
        const rr = (r * 997) % 1;
        if (rr < 0.5) { kind = 'tree'; scale = band.tmin + (rr * 10) % range; }
        else if (rr < 0.75) { kind = 'rock'; scale = band.tmin + (rr * 10) % (range * 0.7); }
        else if (rr < 0.9) { kind = 'mound'; scale = band.tmin + (rr * 10) % (range * 0.6); }
        else { kind = 'rock'; scale = band.tmin * 1.7; }
      }
      let group = this.makeDeco(kind, scale);

      // x 坐标（side=0 时左右随机）
      let sign = band.side === 0 ? (r < 0.5 ? -1 : 1) : band.side;
      const xo = band.x0 + ((r * 1000) % 1000) / 1000 * (band.x1 - band.x0);
      const jitter = (((r * 7919) % 1000) / 1000 - 0.5) * 0.8;
      group.userData.xOff = sign * (xo + jitter);

      const o = { group: group, z: null, rotY: (r * 65537) % U.TAU };
      group.visible = false;
      group.rotation.y = o.rotY;
      // 只有贴近雪道两侧的树才投射阴影，远处森林/雪山不开阴影保性能
      const nearShadow = Math.abs(group.userData.xOff) < 22;
      group.traverse(function (m) {
        if (m.isMesh) {
          m.castShadow = nearShadow;
          m.receiveShadow = false;
        }
      });
      this.root.add(group);
      return o;
    },

    makeDeco(kind, scale) {
      const v = Math.floor(Math.random() * 4);
      if (kind === 'rock') return this.visuals.makeRock(scale);
      if (kind === 'mound') return this.visuals.makeMound(scale);
      if (kind === 'mountain') return this.visuals.makeMountain(scale);
      return this.visuals.makeTree(v, scale);
    },

    slideRows(zPlayer) {
      for (let bi = 0; bi < this.decorBands.length; bi++) {
        const b = this.decorBands[bi];
        this.slideArr(b.list, b.sp, zPlayer, b.back, b.front);
      }
    },

    // 滚动窗口：新行出现时，只把“身后最远的一棵”移到最前排，其余完全不动
    slideArr(arr, sp, zPlayer, back, front) {
      const firstIdx = Math.floor((zPlayer - back) / sp);
      if (arr[0].z === null) {
        for (let i = 0; i < arr.length; i++) {
          arr[i].z = (firstIdx + i) * sp;
          this.placeSlot(arr[i]);
        }
        return;
      }
      let guard = 0;
      while (guard++ < 6) {
        let maxZ = -1e9, maxI = -1, minZ = 1e9, minI = -1;
        for (let i = 0; i < arr.length; i++) {
          const z = arr[i].z;
          if (z > maxZ) { maxZ = z; maxI = i; }
          if (z < minZ) { minZ = z; minI = i; }
        }
        if (maxZ + sp > zPlayer + front) break;     // 最前方已够远
        if (minZ > zPlayer - back + sp * 0.5) break; // 身后还没有“退出窗口”的行
        arr[minI].z = maxZ + sp;
        this.placeSlot(arr[minI]);
      }
    },

    placeSlot(o) {
      const h = this.terrain.heightAt(o.group.userData.xOff, o.z);
      o.group.position.set(o.group.userData.xOff, h, o.z);
      o.group.visible = true;
    },

    /* ---------- 对象池 ---------- */
    alloc(kind) {
      const pool = this.freePools[kind];
      if (pool && pool.length) {
        const it = pool.pop();
        it.group.visible = true;
        return it;
      }
      let group;
      if (OB_DEF[kind]) {
        group = this.visuals[OB_DEF[kind].f](Math.floor(Math.random() * 4),
          kind === 'fence' ? 1 : 0.85 + Math.random() * 0.55);
      } else if (kind === 'coin') group = this.visuals.makeCoin();
      else if (kind === 'boost') group = this.visuals.makeBoost();
      else if (kind === 'shield') group = this.visuals.makeShield();
      this.root.add(group);
      const it = { kind: kind, group: group, x: 0, y: 0, z: 0, phase: Math.random() * U.TAU };
      if (OB_DEF[kind]) it.r = OB_DEF[kind].r;
      return it;
    },

    free(kind, it) {
      it.group.visible = false;
      this.freePools[kind].push(it);
    },

    /* ---------- 生成器 ---------- */
    reset(startZ, seed) {
      for (let i = this.obstacles.length - 1; i >= 0; i--) this.free(this.obstacles[i].kind, this.obstacles[i]);
      this.obstacles.length = 0;
      for (let i = this.pickups.length - 1; i >= 0; i--) this.free(this.pickups[i].kind, this.pickups[i]);
      this.pickups.length = 0;
      this.rng = U.rng((seed ^ 0x9e3779b9) >>> 0);
      this.startZ = startZ;
      this.cursorZ = startZ + 70;
      for (let bi = 0; bi < this.decorBands.length; bi++) {
        const arr = this.decorBands[bi].list;
        for (let i = 0; i < arr.length; i++) arr[i].z = null;
      }
      this.slideRows(startZ);
    },

    ensureAhead(playerZ) {
      const LIMIT = playerZ + C.LOOKAHEAD;
      let guard = 0;
      while (this.cursorZ < LIMIT && guard++ < 10) {
        this.generateUnit(this.cursorZ);
        // 每个障碍单元后大多跟着一段奖励（金币弧 / 道具），保证密度
        if (this.cursorZ < LIMIT && this.rng() < 0.85) this.generatePickupRun(this.cursorZ);
        // 长间隔里偶尔再补一段金币
        if (this.cursorZ < LIMIT && this.rng() < 0.3) this.generatePickupRun(this.cursorZ);
      }
    },

    // 随机混洗数组的索引工具
    generateUnit(z0) {
      const r = this.rng;
      const d = U.clamp((z0 - this.startZ) / 2400, 0, 1);
      const lanes = C.LANES;
      // 选一条被占用排
      const blockedCount = 1 + Math.floor(r() * (1 + d * 2));
      const perm = lanes.map(function (x, i) { return i; });
      for (let i = perm.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        const t = perm[i]; perm[i] = perm[j]; perm[j] = t;
      }
      const blocked = perm.slice(0, blockedCount);
      const rowZ = z0 + 8;
      for (let k = 0; k < blocked.length; k++) {
        const roll = r();
        let kind = 'tree';
        if (roll < 0.28) kind = 'rock';
        else if (roll < 0.5) kind = 'mound';
        else if (roll < 0.7) kind = 'fence';
        const it = this.alloc(kind);
        this.placeObstacle(it, lanes[blocked[k]] + (r() - 0.5) * 0.5, rowZ);
        this.obstacles.push(it);
      }

      // 第二排（错位弯道）
      let nextZ = rowZ + 30;
      if (r() < 0.32 + d * 0.2) {
        const rowZ2 = rowZ + 16 + r() * 8;
        const open = {};
        for (let k = 0; k < Math.max(2, lanes.length - blockedCount); k++) open[perm[k]] = true;
        for (let li = 0; li < lanes.length; li++) {
          if (open[li] || r() < 0.5) continue;
          const it = this.alloc(r() < 0.55 ? 'rock' : 'fence');
          this.placeObstacle(it, lanes[li] + (r() - 0.5) * 0.5, rowZ2);
          this.obstacles.push(it);
        }
        nextZ = rowZ2 + 22;
      }
      const gap = U.lerp(46, 27, d) + r() * 15;
      this.cursorZ = nextZ + gap;
    },

    placeObstacle(it, x, z) {
      const h = this.terrain.heightAt(x, z);
      it.x = x; it.z = z; it.y = h;
      it.group.position.set(x, h, z);
      it.group.rotation.y = Math.random() * U.TAU;
      return it;
    },

    generatePickupRun(z0) {
      const r = this.rng;
      const lanes = C.LANES;
      if (r() < 0.25) {
        // 单个道具：闪电加速 / 护盾
        const kind = r() < 0.5 ? 'boost' : 'shield';
        const it = this.alloc(kind);
        const lane = lanes[Math.floor(r() * lanes.length)];
        const h = this.terrain.heightAt(lane, z0 + 10);
        it.x = lane; it.z = z0 + 10; it.y = h;
        it.group.position.set(lane, h + 1.7, z0 + 10);
        this.pickups.push(it);
        // 两侧配少量金币
        if (r() < 0.7) {
          for (let s = -1; s <= 1; s += 2) {
            const c = this.alloc('coin');
            const cx = lane + s * 1.9;
            const cz = z0 + 10 + (r() - 0.5) * 6;
            const ch = this.terrain.heightAt(cx, cz);
            c.x = cx; c.z = cz; c.y = ch;
            c.group.position.set(cx, ch + 1.5, cz);
            this.pickups.push(c);
          }
        }
        this.cursorZ = z0 + 34 + r() * 12;
      } else {
        const n = 5 + Math.floor(r() * 5);          // 5~9 枚
        const xA = lanes[Math.floor(r() * lanes.length)];
        const xB = lanes[Math.floor(r() * lanes.length)];
        for (let i = 0; i < n; i++) {
          const t = n === 1 ? 0.5 : i / (n - 1);
          const x = U.lerp(xA, xB, U.smooth(t));
          const z = z0 + 10 + i * 3.4;
          const h = this.terrain.heightAt(x, z);
          const it = this.alloc('coin');
          it.x = x; it.z = z; it.y = h;
          it.group.position.set(x, h + 1.5, z);
          this.pickups.push(it);
        }
        this.cursorZ = z0 + 12 + n * 3.4 + 16 + r() * 8;
      }
    },

    /* ---------- 每帧更新 ---------- */
    update(player, dt, time) {
      const pz = player.z;
      if (!this.noSpawn) this.ensureAhead(pz);
      this.collected = [];

      // 回收身后的障碍/道具
      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        if (this.obstacles[i].z < pz - 26) {
          this.free(this.obstacles[i].kind, this.obstacles[i]);
          this.obstacles.splice(i, 1);
        }
      }
      for (let i = this.pickups.length - 1; i >= 0; i--) {
        const pk = this.pickups[i];
        // 收集判定（金币/加速/护盾）
        const dx = Math.abs(pk.x - player.x);
        const dz = pk.z - pz;
        if (dx < 1.35 && dz > -0.6 && dz < 2.2) {
          this.collected.push({ kind: pk.kind, x: pk.x, y: pk.y, z: pk.z });
          this.free(pk.kind, pk);
          this.pickups.splice(i, 1);
          continue;
        }
        if (pk.z < pz - 26) {
          this.free(pk.kind, pk);
          this.pickups.splice(i, 1);
          continue;
        }
        // 动画
        const bobY = pk.y + 0.5 + Math.sin(time * 2.2 + pk.phase) * 0.14;
        if (pk.kind === 'coin') {
          pk.group.position.y = bobY;
          pk.group.rotation.y += dt * 4.2;
        } else if (pk.kind === 'boost') {
          pk.group.position.y = bobY;
          pk.group.rotation.y = Math.sin(time * 1.6 + pk.phase) * 0.5;
        } else if (pk.kind === 'shield') {
          pk.group.position.y = bobY;
          pk.group.rotation.y += dt * 2.4;
        }
      }

      // 障碍碰撞
      this.hit = null;
      for (let i = 0; i < this.obstacles.length; i++) {
        const ob = this.obstacles[i];
        const dz = ob.z - pz;
        if (dz < 2.6 && dz > -0.5) {
          const dx = Math.abs(ob.x - player.x);
          const reach = ob.r + 0.55;
          if (dx < reach) {
            const low = OB_DEF[ob.kind].jump;      // 雪堆/栅栏可跳过
            if (!(low && player.air > 0.72)) {
              this.hit = ob;
              break;
            }
          }
        }
      }
      this.slideRows(pz);
    },

    // 命中后被移除（护盾吸收 / 撞毁），避免连续触发
    destroyHit() {
      if (!this.hit) return;
      const ob = this.hit;
      const idx = this.obstacles.indexOf(ob);
      if (idx >= 0) this.obstacles.splice(idx, 1);
      this.free(ob.kind, ob);
      this.hit = null;
    },
  };

  SG.Props = P;
})(window);
