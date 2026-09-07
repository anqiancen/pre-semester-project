/* ============================================================
 * main.js — 引导、渲染循环、输入与 UI 绑定
 * ============================================================ */
'use strict';
(function () {
  const $ = function (sel) { return document.querySelector(sel); };

  const renderer = new THREE.WebGLRenderer({ canvas: $('#game'), antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcfdff2);

  const camera = new THREE.PerspectiveCamera(
    SG.Config.CAMERA_FOV,
    window.innerWidth / window.innerHeight,
    0.05, 2600
  );

  // ---------- 模块 ----------
  SG.Terrain.init(scene);
  SG.Visuals.init(scene);
  SG.Props.init(scene, SG.Terrain, SG.Visuals);
  SG.Game.init(scene, camera);
  SG.Game.toMenu();

  // ---------- 键盘 ----------
  const CODE_MAP = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowDown: 'down', KeyS: 'down'
  };
  window.addEventListener('keydown', function (e) {
    const n = CODE_MAP[e.code];
    if (n) {
      e.preventDefault();
      if (!e.repeat) SG.Game.setKey(n, true);
      return;
    }
    if (e.code === 'Space') {
      e.preventDefault();
      if (!e.repeat) SG.Game.handleActionKey();
    } else if (e.code === 'KeyR') {
      if (!e.repeat) SG.Game.retry();
    } else if (e.code === 'KeyP') {
      if (!e.repeat) SG.Game.setPaused(SG.Game.state !== 'pause');
    } else if (e.code === 'KeyM') {
      if (!e.repeat) toggleMute();
    }
  });
  window.addEventListener('keyup', function (e) {
    const n = CODE_MAP[e.code];
    if (n) SG.Game.setKey(n, false);
  });
  window.addEventListener('blur', function () {
    SG.Game.setKey('left', false);
    SG.Game.setKey('right', false);
    SG.Game.setKey('down', false);
    SG.Game.setSteerTouch(0);
  });

  // 触摸转向
  $('#game').addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch') {
      SG.Audio.resume();
      SG.Game.setSteerTouch(e.clientX < window.innerWidth / 2 ? -1 : 1);
    }
  });
  window.addEventListener('pointerup', function (e) {
    if (e.pointerType === 'touch') SG.Game.setSteerTouch(0);
  });

  // ---------- UI ----------
  $('#overlayStart').addEventListener('pointerdown', function () { SG.Game.startRun(); });
  $('#btnRetry').addEventListener('click', function () { SG.Game.retry(); });
  $('#btnResume').addEventListener('click', function () { SG.Game.setPaused(false); });
  $('#btnPause').addEventListener('click', function () {
    SG.Game.setPaused(SG.Game.state !== 'pause');
  });
  const btnMute = $('#btnMute');
  function toggleMute() {
    const m = SG.Audio.toggleMute();
    btnMute.textContent = m ? '🔇' : '🔊';
  }
  btnMute.addEventListener('click', toggleMute);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && SG.Game.state === 'running') SG.Game.setPaused(true);
  });

  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ---------- 循环 ----------
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    SG.Game.update(dt);
    const speed = SG.Game.p ? SG.Game.p.speed : 0;
    SG.Visuals.update(camera, dt, speed);
    renderer.render(scene, camera);
  }
  animate();
})();
