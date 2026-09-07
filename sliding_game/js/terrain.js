/* ============================================================
 * terrain.js — 安全的下坡雪道（坡度恒定 + 超长缓波）
 * 保证第一人称相机始终在雪面之上，杜绝穿地。
 * ============================================================ */
'use strict';
(function (global) {
  const SG = global.SG;
  const C = SG.Config;
  const U = SG.Utils;

  const T = {
    seed: 20240101,
    group: null,
    chunks: [],
    mat: null,
    D: C.TERRAIN_D,

    heightAt(x, z) {
      const s = this.seed;
      let y = -z * C.SLOPE;
      y += Math.sin(z * 0.0042 + (s % 17)) * 0.7;   // ~1500m 柔和长波
      y += Math.sin(z * 0.0013 + (s % 29)) * 0.5;
      const ax = Math.abs(x);
      if (ax > 84) {
        const d = ax - 84;
        y += d * d * 0.004;                          // 极远视觉边界
      }
      return y;
    },

    gradAt(x, z) {
      const e = 1.5;
      return {
        hx: (this.heightAt(x + e, z) - this.heightAt(x - e, z)) / (2 * e),
        hz: (this.heightAt(x, z + e) - this.heightAt(x, z - e)) / (2 * e)
      };
    },

    normalAt(x, z) {
      const g = this.gradAt(x, z);
      const inv = 1 / Math.sqrt(g.hx * g.hx + 1 + g.hz * g.hz);
      return { x: g.hx * inv, y: -inv, z: g.hz * inv };
    },

    makeSnowTexture() {
      const size = 256;
      const cv = document.createElement('canvas');
      cv.width = cv.height = size;
      const g = cv.getContext('2d');
      g.fillStyle = '#f4f9fd';
      g.fillRect(0, 0, size, size);
      const img = g.getImageData(0, 0, size, size);
      const px = img.data;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const i = (y * size + x) * 4;
          const n = (U.vnoise(x * 0.55, y * 0.55, 11) - 0.5) * 14;
          const grid = Math.sin((x + y) * 0.18) * 5;
          const band = Math.sin(x * 0.32) * 4;
          const c = U.clamp(244 + n + grid + band, 226, 252);
          px[i] = c; px[i + 1] = c + 1; px[i + 2] = c + 4; px[i + 3] = 255;
        }
      }
      for (let k = 0; k < 260; k++) {
        const x = (Math.random() * size) | 0;
        const y = (Math.random() * size) | 0;
        const i = (y * size + x) * 4;
        px[i] = 252; px[i + 1] = 254; px[i + 2] = 255;
      }
      g.putImageData(img, 0, 0);
      const tex = new THREE.CanvasTexture(cv);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(14, 6);
      tex.anisotropy = 4;
      return tex;
    },

    makeChunkGeometry() {
      const W = C.TERRAIN_W, D = this.D;
      const segW = 54, segD = 20;
      const hw = W / 2, hd = D / 2;
      const cols = segW + 1;
      const pos = new Float32Array(cols * (segD + 1) * 3);
      const nor = new Float32Array(cols * (segD + 1) * 3);
      const uv = new Float32Array(cols * (segD + 1) * 2);
      const idx = [];
      let p = 0, q = 0;
      for (let iz = 0; iz <= segD; iz++) {
        const z = -hd + (iz / segD) * D;
        for (let ix = 0; ix <= segW; ix++) {
          const x = -hw + (ix / segW) * W;
          pos[p++] = x; pos[p++] = 0; pos[p++] = z;
          nor[p++] = 0; nor[p++] = 1; nor[p++] = 0;
          uv[q++] = ix / segW; uv[q++] = iz / segD;
        }
      }
      for (let iz = 0; iz < segD; iz++) {
        for (let ix = 0; ix < segW; ix++) {
          const a = iz * cols + ix, b = a + 1;
          const c = a + cols, d = c + 1;
          idx.push(a, c, b, b, c, d);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.setIndex(idx);
      return geo;
    },

    init(scene) {
      this.group = new THREE.Group();
      scene.add(this.group);
      this.mat = new THREE.MeshStandardMaterial({
        map: this.makeSnowTexture(),
        color: 0xfbfdff,
        roughness: 0.94,
        metalness: 0
      });
      const N = Math.ceil((C.CHUNK_BACK + C.CHUNK_FRONT) / this.D) + 1;
      for (let i = 0; i < N; i++) {
        const geo = this.makeChunkGeometry();
        const mesh = new THREE.Mesh(geo, this.mat);
        mesh.receiveShadow = true;
        this.group.add(mesh);
        this.chunks.push({
          mesh,
          posAttr: geo.attributes.position,
          norAttr: geo.attributes.normal,
          layout: geo.attributes.position.array.slice(),
          base: 0
        });
      }
    },

    refreshChunk(ch, base) {
      const layout = ch.layout;
      const pos = ch.posAttr.array;
      const nor = ch.norAttr.array;
      const n = pos.length / 3;
      let i3 = 0;
      for (let v = 0; v < n; v++, i3 += 3) {
        const lx = layout[i3];
        const lz = layout[i3 + 2];
        const wz = base + lz;
        pos[i3] = lx; pos[i3 + 1] = this.heightAt(lx, wz); pos[i3 + 2] = lz;
        const nm = this.normalAt(lx, wz);
        nor[i3] = nm.x; nor[i3 + 1] = nm.y; nor[i3 + 2] = nm.z;
      }
      ch.posAttr.needsUpdate = true;
      ch.norAttr.needsUpdate = true;
      ch.mesh.position.z = base;
      ch.base = base;
    },

    reset(z0, seedVal) {
      this.seed = seedVal || 20240101;
      const start = z0 - C.CHUNK_BACK;
      for (let i = 0; i < this.chunks.length; i++) {
        this.refreshChunk(this.chunks[i], start + this.D / 2 + i * this.D);
      }
    },

    update(playerZ) {
      let changed = true;
      while (changed) {
        changed = false;
        let minBase = Infinity, maxBase = -Infinity, iMin = 0;
        for (let i = 0; i < this.chunks.length; i++) {
          const b = this.chunks[i].base;
          if (b < minBase) { minBase = b; iMin = i; }
          if (b > maxBase) maxBase = b;
        }
        if (maxBase + this.D / 2 >= playerZ + C.CHUNK_FRONT) break;
        if (minBase + this.D / 2 > playerZ - C.CHUNK_BACK + 4) break;
        this.refreshChunk(this.chunks[iMin], maxBase + this.D);
        changed = true;
      }
    }
  };

  SG.Terrain = T;
})(window);
