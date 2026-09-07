/* ============================================================
 * utils.js — 全局配置与工具（确定性随机/噪声/插值）
 * ============================================================ */
'use strict';
(function (global) {
  const SG = global.SG = global.SG || {};

  SG.Config = {
    SLOPE: 0.075,          // 雪道纵向坡度(每米下降)，恒定、平缓安全
    CAM_H: 1.55,           // 眼睛距雪面高度（保证永远在地面上方）
    CAMERA_FOV: 90,

    TERRAIN_W: 190,        // 地形宽度
    TERRAIN_D: 50,         // 地形分块长度
    CHUNK_BACK: 70,
    CHUNK_FRONT: 320,

    COURSE_HALF: 8.2,      // 可移动的半宽
    LANES: [-6.3, -3.15, 0, 3.15, 6.3],

    START_X: 0,
    START_Z: 40,

    START_SPEED: 13,       // m/s，自动滑行
    MAX_SPEED: 27,
    SPEED_RAMP: 0.018,     // 每米提升 m/s
    TURN_MAX: 9.5,         // 左右横移最大速度
    TURN_ACC: 0.55,

    JUMP_V: 6.6,           // 起跳初速度
    GRAVITY: 16,
    DUCK_SPEED: 0.78,      // 下蹲减速系数

    BOOST_TIME: 3.4,       // 加速道具持续时间
    BOOST_MULT: 1.55,

    LIVES: 3,
    LOOKAHEAD: 170,        // 生成/可见范围
  };

  const U = {
    TAU: Math.PI * 2,
    clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp(a, b, t) { return a + (b - a) * t; },
    smooth(t) { return t * t * (3 - 2 * t); },
    damp(a, b, l, dt) { return U.lerp(a, b, 1 - Math.exp(-l * dt)); },

    rng(seed) {
      let a = seed >>> 0;
      return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },

    hash2(ix, iz, s) {
      let n = (ix | 0) * 374761393 + (iz | 0) * 668265263 + ((s | 0) + 1013) * 1442695041;
      n = Math.imul(n ^ (n >>> 13), 1274126177);
      return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    },

    vnoise(x, z, s) {
      const xi = Math.floor(x), zi = Math.floor(z);
      const xf = x - xi, zf = z - zi;
      const u = U.smooth(xf), v = U.smooth(zf);
      const a = U.hash2(xi, zi, s), b = U.hash2(xi + 1, zi, s);
      const c = U.hash2(xi, zi + 1, s), d = U.hash2(xi + 1, zi + 1, s);
      const m = U.lerp(a, b, u);
      const n = U.lerp(c, d, u);
      return U.lerp(m, n, v);
    },

    pick(arr, r) {
      const rnd = r || Math.random;
      return arr[Math.min(arr.length - 1, Math.floor(rnd() * arr.length))];
    },

    // 命中判定用的近似圆半径（可视范围匹配用）
    rnd01(r) { return U.vnoise(r * 97.31, r * 13.7, 5); }
  };
  SG.Utils = U;
})(window);
