/* ============================================================
 * visuals.js — 天空/光照/雪粒子 + 所有低多边形模型工厂
 * ============================================================ */
'use strict';
(function (global) {
  const SG = global.SG;
  const U = SG.Utils;

  const V = {
    scene: null,
    skyGroup: null,
    sunLight: null,

    snowPoints: null, snowPos: null, snowCount: 0,
    burstGeo: null, burstPos: null, burstCol: null,
    burstLife: null, burstVel: null, burstMax: 600, burstCursor: 0,

    geoms: {}, mats: {},

    init(scene) {
      this.scene = scene;
      this.buildLights();
      this.buildSky();
      this.buildSnow();
      this.buildBursts();
    },

    buildLights() {
      this.scene.add(new THREE.HemisphereLight(0xd5ebff, 0x8fb0c8, 0.9));
      const sun = new THREE.DirectionalLight(0xfff4de, 1.35);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      const cam = sun.shadow.camera;
      cam.left = -60; cam.right = 60; cam.top = 55; cam.bottom = -55;
      cam.near = 20; cam.far = 260;
      sun.shadow.bias = -0.0005;
      sun.shadow.normalBias = 0.4;
      this.scene.add(sun);
      const t = new THREE.Object3D();
      this.scene.add(t);
      sun.target = t;
      this.sunLight = sun;
      this.sunLightTarget = t;
    },

    makeGlowTexture() {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 64;
      const g = cv.getContext('2d');
      const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(0.4, 'rgba(255,255,255,0.6)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(cv);
    },

    buildSky() {
      this.scene.fog = new THREE.Fog(0xdfeef7, 70, 430);
      this.skyGroup = new THREE.Group();

      // 渐变天空穹顶
      const cv = document.createElement('canvas');
      cv.width = 32; cv.height = 256;
      const g = cv.getContext('2d');
      const grad = g.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, '#2f7fc9');
      grad.addColorStop(0.4, '#86c2ef');
      grad.addColorStop(0.7, '#cfe6f6');
      grad.addColorStop(1, '#edf7fc');
      g.fillStyle = grad;
      g.fillRect(0, 0, 32, 256);
      const domeTex = new THREE.CanvasTexture(cv);
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(1300, 24, 16),
        new THREE.MeshBasicMaterial({ map: domeTex, side: THREE.BackSide, fog: false, depthWrite: false })
      );
      this.skyGroup.add(dome);

      // 太阳光晕
      const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.makeGlowTexture(), color: 0xfff3cf,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false
      }));
      sunSprite.scale.set(300, 300, 1);
      sunSprite.position.set(-620, 900, -700);
      this.skyGroup.add(sunSprite);

      // 远山剪影（低多边形锥体，附在相机 → 永远在地平线）
      const mountMatA = new THREE.MeshBasicMaterial({ color: 0xc2dff2, fog: false });
      const mountMatB = new THREE.MeshBasicMaterial({ color: 0xaacdea, fog: false });
      const snowConeMat = new THREE.MeshBasicMaterial({ color: 0xf6fcff, fog: false });
      const mRng = U.rng(2024);
      for (let i = 0; i < 26; i++) {
        const ang = mRng() * U.TAU;
        const rad = 850 + mRng() * 450;
        const h = 90 + mRng() * 190;
        const r = 55 + mRng() * 75;
        const mat = mRng() < 0.5 ? mountMatA : mountMatB;
        const mtn = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), mat);
        mtn.position.set(Math.cos(ang) * rad, -18 + h * 0.5, Math.sin(ang) * rad);
        this.skyGroup.add(mtn);
        if (mRng() < 0.7) {
          const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.22, h * 0.24, 4), snowConeMat);
          cap.position.set(mtn.position.x, -18 + h * 0.9, mtn.position.z);
          this.skyGroup.add(cap);
        }
      }

      // 漂移低多边形云
      const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, fog: true });
      const cRng = U.rng(99);
      for (let i = 0; i < 9; i++) {
        const cloud = new THREE.Group();
        const n = 2 + Math.floor(cRng() * 3);
        for (let j = 0; j < n; j++) {
          const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), cloudMat);
          const s = 26 + cRng() * 55;
          puff.scale.set(s * (1 + cRng()), s * 0.3, s * (0.7 + cRng()));
          puff.position.set((cRng() - 0.5) * s * 2.4, (cRng() - 0.5) * s * 0.3, (cRng() - 0.5) * s * 1.5);
          cloud.add(puff);
        }
        const ang = cRng() * U.TAU;
        const rad = 620 + cRng() * 640;
        cloud.position.set(Math.cos(ang) * rad, 160 + cRng() * 460, Math.sin(ang) * rad);
        this.skyGroup.add(cloud);
      }
      this.scene.add(this.skyGroup);
    },

    /* ---------- 飘雪 ---------- */
    buildSnow() {
      this.snowCount = 600;
      const pos = new Float32Array(this.snowCount * 3);
      this.snowPos = pos;
      for (let i = 0; i < this.snowCount; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 70;
        pos[i * 3 + 1] = Math.random() * 28 - 2;
        pos[i * 3 + 2] = 10 + Math.random() * 120;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        color: 0xffffff, size: 0.5, map: this.makeGlowTexture(),
        transparent: true, opacity: 0.8, depthWrite: false, sizeAttenuation: true
      });
      this.snowPoints = new THREE.Points(geo, mat);
      this.snowPoints.frustumCulled = false;
      this.scene.add(this.snowPoints);
    },

    updateSnow(dt, camX, camY, camZ) {
      const pos = this.snowPos;
      const fall = 1.1 * dt;
      for (let i = 0; i < this.snowCount; i++) {
        const i3 = i * 3;
        pos[i3 + 1] -= fall;
        pos[i3] += Math.sin(pos[i3 + 2] * 0.4 + i) * dt * 0.6;
        if (pos[i3 + 2] < camZ - 22 || pos[i3 + 1] < camY - 34 || pos[i3 + 1] > camY + 42) {
          pos[i3] = camX + (Math.random() - 0.5) * 56;
          pos[i3 + 1] = camY + 2 + Math.random() * 36;
          pos[i3 + 2] = camZ + 8 + Math.random() * 60;
        }
      }
      this.snowPoints.geometry.attributes.position.needsUpdate = true;
    },

    /* ---------- 粒子爆发 ---------- */
    buildBursts() {
      this.burstPos = new Float32Array(this.burstMax * 3);
      this.burstCol = new Float32Array(this.burstMax * 3);
      this.burstVel = new Float32Array(this.burstMax * 3);
      this.burstLife = new Float32Array(this.burstMax);
      for (let i = 0; i < this.burstMax; i++) {
        this.burstLife[i] = 0;
        this.burstPos[i * 3 + 1] = -99999;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(this.burstPos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(this.burstCol, 3));
      const mat = new THREE.PointsMaterial({
        size: 0.9, map: this.makeGlowTexture(), vertexColors: true,
        transparent: true, opacity: 0.95, depthWrite: false, sizeAttenuation: true
      });
      this.burstGeo = geo;
      this.burstPoints = new THREE.Points(geo, mat);
      this.burstPoints.frustumCulled = false;
      this.scene.add(this.burstPoints);
    },

    spawnBurst(x, y, z, color, count, power) {
      color = color || 0xffffff;
      const cr = ((color >> 16) & 255) / 255;
      const cg = ((color >> 8) & 255) / 255;
      const cb = (color & 255) / 255;
      for (let k = 0; k < count; k++) {
        const i = this.burstCursor;
        this.burstCursor = (this.burstCursor + 1) % this.burstMax;
        const ang = Math.random() * U.TAU;
        const el = Math.acos(1 - Math.random() * 2);
        const sp = (0.3 + Math.random()) * (power || 5);
        this.burstVel[i * 3] = Math.sin(el) * Math.cos(ang) * sp;
        this.burstVel[i * 3 + 1] = Math.cos(el) * sp * 0.8 + 1.2;
        this.burstVel[i * 3 + 2] = Math.sin(el) * Math.sin(ang) * sp;
        this.burstPos[i * 3] = x;
        this.burstPos[i * 3 + 1] = y;
        this.burstPos[i * 3 + 2] = z;
        this.burstCol[i * 3] = cr; this.burstCol[i * 3 + 1] = cg; this.burstCol[i * 3 + 2] = cb;
        this.burstLife[i] = 0.5 + Math.random() * 0.55;
      }
    },

    updateBursts(dt) {
      const pos = this.burstPos, vel = this.burstVel, life = this.burstLife;
      for (let i = 0; i < this.burstMax; i++) {
        if (life[i] <= 0) continue;
        life[i] -= dt;
        if (life[i] <= 0) { pos[i * 3 + 1] = -99999; continue; }
        pos[i * 3] += vel[i * 3] * dt;
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        vel[i * 3 + 1] -= 10 * dt;
        vel[i * 3] *= (1 - 1.4 * dt);
        vel[i * 3 + 2] *= (1 - 1.4 * dt);
      }
      this.burstGeo.attributes.position.needsUpdate = true;
    },

    update(cam, dt, speed) {
      if (this.skyGroup) this.skyGroup.position.copy(cam.position);
      if (this.sunLight) {
        this.sunLight.position.set(cam.position.x + 55, cam.position.y + 130, cam.position.z + 105);
        this.sunLightTarget.position.set(cam.position.x, cam.position.y, cam.position.z + 25);
      }
      if (this.snowPoints) this.updateSnow(dt, cam.position.x, cam.position.y, cam.position.z);
      this.updateBursts(dt);
    },

    /* ---------- 低多边形模型缓存 ---------- */
    ensure() {
      if (this.geoms.treeCone) return;
      const G = this.geoms, M = this.mats;
      M.trunk = new THREE.MeshLambertMaterial({ color: 0x7a5233 });
      G.treeCone = new THREE.ConeGeometry(1, 1, 7);
      M.greens = [0x2f9e57, 0x37b06a, 0x45b877, 0x24874c].map(function (c) {
        return new THREE.MeshLambertMaterial({ color: c });
      });
      M.snow = new THREE.MeshLambertMaterial({ color: 0xffffff });
      G.snowCap = new THREE.ConeGeometry(0.5, 0.45, 5);
      G.rock = new THREE.IcosahedronGeometry(1, 0);
      M.rock = new THREE.MeshLambertMaterial({ color: 0x9aa3ad, flatShading: true });
      M.mound = new THREE.MeshLambertMaterial({ color: 0xf6fbfe });
      M.moundHi = new THREE.MeshLambertMaterial({ color: 0xffffff });
      G.post = new THREE.CylinderGeometry(0.07, 0.09, 1.1, 6);
      M.post = new THREE.MeshLambertMaterial({ color: 0x8a5a32 });
      G.rail = new THREE.BoxGeometry(2.1, 0.13, 0.08);
      M.railRed = new THREE.MeshLambertMaterial({ color: 0xe2554d });
      M.railDark = new THREE.MeshLambertMaterial({ color: 0x6d3f2a });
      G.coin = new THREE.CylinderGeometry(0.42, 0.42, 0.07, 10);
      M.coin = new THREE.MeshStandardMaterial({
        color: 0xffc94d, emissive: 0x7a4d00, emissiveIntensity: 0.5,
        roughness: 0.3, metalness: 0.7
      });
      G.bolt = buildBolt();
      M.bolt = new THREE.MeshStandardMaterial({
        color: 0xffe27a, emissive: 0xffa800, emissiveIntensity: 1,
        roughness: 0.4, side: THREE.DoubleSide
      });
      M.shieldMat = new THREE.MeshStandardMaterial({
        color: 0x6fd7ff, emissive: 0x1d7bb8, emissiveIntensity: 0.6,
        transparent: true, opacity: 0.55, roughness: 0.2
      });
      G.shield = new THREE.IcosahedronGeometry(0.42, 1);
    },

    ensureNature() {
      this.ensure();                 // 先确保基础材质（含 snow/mound）就绪
      if (this.geoms.treeGrad) return;
      const G = this.geoms, M = this.mats;
      // 积雪云杉：3 个绿色系渐变锥（基部深绿 → 梢头落雪白）
      G.treeGrad = [];
      const bases = [0x2c5e3d, 0x356a49, 0x21553a];
      for (let v = 0; v < 3; v++) G.treeGrad.push(buildGradCone(bases[v]));
      M.treeGrad = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
      G.trunkBark = new THREE.CylinderGeometry(0.1, 0.17, 1.6, 6);
      M.bark = new THREE.MeshLambertMaterial({ color: 0x6a4a30 });
      M.bark2 = new THREE.MeshLambertMaterial({ color: 0x543a26 });
      G.snowPuff = new THREE.IcosahedronGeometry(0.28, 1);
      // 远景雪山
      G.mtnCone = new THREE.ConeGeometry(1, 1, 7);
      M.mtnBodyA = new THREE.MeshLambertMaterial({ color: 0x8aaecf });
      M.mtnBodyB = new THREE.MeshLambertMaterial({ color: 0x6f94bd });
      M.mtnSnow = new THREE.MeshLambertMaterial({ color: 0xf2f8fd });
    },

    makeMountain(scale) {
      this.ensureNature();
      const g = new THREE.Group();
      const r = Math.random();
      const body = new THREE.Mesh(this.geoms.mtnCone, r < 0.5 ? this.mats.mtnBodyA : this.mats.mtnBodyB);
      const h = 1.0 + r * 0.55;
      body.scale.set(1 + r * 0.25, h, 1 + r * 0.25);
      body.position.y = h * 0.5;
      g.add(body);
      // 山顶雪盖 + 侧峰
      const snow = new THREE.Mesh(this.geoms.mtnCone, this.mats.mtnSnow);
      snow.scale.set(0.42, h * 0.3, 0.42);
      snow.position.y = h * 0.85;
      g.add(snow);
      const side = new THREE.Mesh(this.geoms.mtnCone, this.mats.mtnBodyA);
      const sh = h * (0.45 + r * 0.25);
      side.scale.set(0.62, sh, 0.62);
      side.position.set(0.7 + r * 0.35, sh * 0.5, 0);
      g.add(side);
      const snow2 = new THREE.Mesh(this.geoms.mtnCone, this.mats.mtnSnow);
      snow2.scale.set(0.3, sh * 0.3, 0.3);
      snow2.position.set(side.position.x, sh * 0.82, 0);
      g.add(snow2);
      // 雪坡底座
      const base = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 5), this.mats.mound);
      base.scale.set(2.1 + r, 0.28, 1.8 + r);
      base.position.y = 0.2;
      g.add(base);
      if (scale) g.scale.setScalar(scale);
      return g;
    },

    makeTree(variant, scale) {
      this.ensureNature();
      const g = new THREE.Group();
      const rnd = Math.random;
      // 树干（略向后仰，带树皮色差）
      const trunk = new THREE.Mesh(this.geoms.trunkBark,
        rnd() < 0.5 ? this.mats.bark : this.mats.bark2);
      trunk.position.y = 0.72;
      trunk.rotation.z = (rnd() - 0.5) * 0.05;
      g.add(trunk);

      // 5 层圆锥树冠：自带“由绿转雪白”的顶点色渐变，每层旋转/椭圆化 → 枝桠错落感
      let bottom = 0.1;
      for (let i = 0; i < 5; i++) {
        const rBase = Math.max(0.14, 1.08 - i * 0.15);
        const cone = new THREE.Mesh(this.geoms.treeGrad[variant % 3], this.mats.treeGrad);
        const kx = 0.82 + rnd() * 0.36;
        const kz = 0.82 + rnd() * 0.36;
        cone.scale.set(rBase * kx, 1.0, rBase * kz);
        cone.rotation.y = rnd() * U.TAU;
        cone.position.y = bottom + 0.5;
        g.add(cone);
        bottom += 0.5;
      }
      // 树顶积雪
      const puff = new THREE.Mesh(this.geoms.snowPuff, this.mats.snow);
      puff.scale.set(0.85, 0.5, 0.85);
      puff.position.y = bottom + 0.25;
      g.add(puff);
      const puff2 = new THREE.Mesh(this.geoms.snowPuff, this.mats.snow);
      puff2.position.set(0.18, bottom + 0.62, 0);
      puff2.scale.set(0.55, 0.5, 0.55);
      g.add(puff2);

      if (scale) g.scale.setScalar(scale);
      g.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
      return g;
    },

    makeRock(scale) {
      this.ensure();
      const g = new THREE.Group();
      const m = new THREE.Mesh(this.geoms.rock, this.mats.rock);
      const sy = 0.8 + Math.random() * 0.3;
      m.scale.set(1.1 + Math.random() * 0.3, sy, 1 + Math.random() * 0.3);
      m.position.y = sy - 0.12;                 // 底部略埋入雪中 → 稳稳落地
      g.add(m);
      const cap = new THREE.Mesh(this.geoms.snowCap, this.mats.snow);
      cap.scale.setScalar(0.5 + Math.random() * 0.3);
      cap.position.y = m.position.y + sy * 0.6 + 0.05;
      g.add(cap);
      if (scale) g.scale.setScalar(scale);
      g.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
      return g;
    },

    makeMound(scale) {
      this.ensure();
      const g = new THREE.Group();
      const sy = 0.48 + Math.random() * 0.14;
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 9, 6), this.mats.mound);
      m.scale.set(1.15, sy, 0.95);
      m.position.y = sy - 0.06;                 // 雪堆底部刚好贴住雪面
      g.add(m);
      const h2 = new THREE.Mesh(new THREE.SphereGeometry(0.6, 6, 4), this.mats.moundHi);
      h2.scale.set(0.75, sy * 0.55, 0.65);
      h2.position.set(-0.25, m.position.y + sy * 0.7, 0.1);
      g.add(h2);
      if (scale) g.scale.setScalar(scale);
      g.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
      return g;
    },

    makeFence(scale) {
      this.ensure();
      const g = new THREE.Group();
      for (let s = -1; s <= 1; s += 2) {
        const post = new THREE.Mesh(this.geoms.post, this.mats.post);
        post.position.set(s * 0.95, 0.55, 0);
        g.add(post);
      }
      const rail = new THREE.Mesh(this.geoms.rail, this.mats.railRed);
      rail.position.y = 0.78;
      const rail2 = new THREE.Mesh(this.geoms.rail, this.mats.railDark);
      rail2.position.y = 0.42;
      g.add(rail, rail2);
      if (scale) g.scale.setScalar(scale);
      g.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
      return g;
    },

    makeCoin() {
      this.ensure();
      const g = new THREE.Group();
      const coin = new THREE.Mesh(this.geoms.coin, this.mats.coin);
      coin.rotation.x = Math.PI / 2;    // 金币平面面向玩家
      g.add(coin);
      return g;
    },

    makeBoost() {
      this.ensure();
      const g = new THREE.Group();
      g.add(new THREE.Mesh(this.geoms.bolt, this.mats.bolt));
      return g;
    },

    makeShield() {
      this.ensure();
      const g = new THREE.Group();
      const inner = new THREE.Mesh(this.geoms.shield, this.mats.shieldMat);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 6, 14),
        new THREE.MeshLambertMaterial({ color: 0x9fe7ff, emissive: 0x1188c8, emissiveIntensity: 0.7 }));
      g.add(inner, ring);
      return g;
    },

    /* 画面下方的滑雪板 + 雪靴 */
    makeSkiRig() {
      const g = new THREE.Group();
      const boardMat = new THREE.MeshStandardMaterial({ color: 0xff5349, roughness: 0.3, metalness: 0.4 });
      const bootMat = new THREE.MeshLambertMaterial({ color: 0x2b3440 });
      for (let s = 0; s < 2; s++) {
        const side = s === 0 ? -1 : 1;
        const ski = new THREE.Group();
        const board = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 2.6), boardMat);
        board.position.set(0, 0.05, 1.9);           // 板身伸向脚下前方
        const nose = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.55), boardMat);
        nose.position.set(0, 0.1, 3.15);
        nose.rotation.x = -0.5;                     // 板头微微上翘
        const boot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.5), bootMat);
        boot.position.set(0, 0.22, 1.5);
        boot.rotation.x = 0.08;
        ski.add(board, nose, boot);
        ski.position.x = side * 0.42;
        g.add(ski);
      }
      return g;
    },
  };

  function buildBolt() {
    const shape = new THREE.Shape();
    shape.moveTo(0.12, 1.6);
    shape.lineTo(0.72, 1.5);
    shape.lineTo(0.02, 0.6);
    shape.lineTo(0.58, 0.5);
    shape.lineTo(-0.55, -1.6);
    shape.lineTo(-0.12, -1.0);
    shape.lineTo(-0.72, -0.95);
    shape.lineTo(0.12, 0.4);
    shape.lineTo(-0.5, 0.42);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false, steps: 1 });
    geo.center();
    return geo;
  }

  // 云杉渐变锥：基部深绿，向上逐渐覆盖白雪（顶点色烘焙，实例缩放后依然正确）
  function buildGradCone(baseHex) {
    const geo = new THREE.ConeGeometry(1, 1, 8);
    const pos = geo.attributes.position.array;
    const colors = new Float32Array(pos.length);
    const base = new THREE.Color(baseHex);
    const snow = new THREE.Color(0xf2f7fc);
    const c = new THREE.Color();
    for (let i = 0; i < pos.length; i += 3) {
      const t = Math.pow(pos[i + 1] + 0.5, 1.35);       // 0=底部 → 1=锥顶
      const k = U.clamp((t - 0.42) * 1.9, 0, 1);
      c.copy(base).lerp(snow, k);
      const n = (U.hash2(i, baseHex & 255, 3) - 0.5) * 0.09;
      c.r = U.clamp(c.r + n, 0, 1);
      c.g = U.clamp(c.g + n, 0, 1);
      c.b = U.clamp(c.b + n, 0, 1);
      colors[i] = c.r; colors[i + 1] = c.g; colors[i + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }

  SG.Visuals = V;
})(window);
