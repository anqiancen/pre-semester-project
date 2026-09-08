import {
  ANIM, DEFAULT_SOURCE_TILE_SIZE, FONT, HEADROOM, MARGIN, S, SPEED, T,
  VIEW_H, VIEW_W,
} from "./constants.js";

export function startGame({ canvas, map, dialogue }) {
  const g = canvas;
  g.width = VIEW_W;
  g.height = VIEW_H;

  const c = g.getContext("2d");
  c.imageSmoothingEnabled = false;

  const img = {};
  const names = Object.keys(map.sheets);
  let loaded = 0;

  const objects = buildObjects(map);
  const entities = map.entities;
  const keys = {};
  const just = {};
  let px = map.spawn.x;
  let py = map.spawn.y;
  let dir = map.spawn.dir;
  let frame = 0;
  let animTime = 0;
  let camX = 0;
  let camY = 0;
  let state = "play";
  let currentDialogue = null;
  let page = 0;
  let choiceIdx = 0;
  let last = 0;

  const spawnQ = new URLSearchParams(location.search);
  if (spawnQ.has("x")) {
    px = parseFloat(spawnQ.get("x"));
    py = parseFloat(spawnQ.get("y"));
    dir = parseInt(spawnQ.get("dir") || "0", 10);
  }

  function buildObjects(mapData) {
    const result = [];
    for (let y = 0; y < mapData.objectMap.length; y++) {
      for (let x = 0; x < mapData.objectMap[y].length; x++) {
        const type = mapData.objectChars[mapData.objectMap[y][x]];
        if (type) result.push(makeObject(type, x, y));
      }
    }
    for (const object of mapData.freeObjects) {
      result.push(makeObject(object.type, object.col, object.row));
    }
    return result;
  }

  function makeObject(type, col, row) {
    return Object.assign({ col, row }, map.objectTypes[type]);
  }

  function updateCamera() {
    camX = px + S / 2 - VIEW_W / 2;
    camY = py + S / 2 - VIEW_H / 2;
    camX = Math.max(-MARGIN * T, Math.min(camX, map.width * T - VIEW_W + MARGIN * T));
    camY = Math.max(-HEADROOM * T, Math.min(camY, map.height * T - VIEW_H + MARGIN * T));
  }

  function draw() {
    updateCamera();
    c.fillStyle = "#000";
    c.fillRect(0, 0, VIEW_W, VIEW_H);
    c.save();
    c.translate(-camX, -camY);

    for (let y = 0; y < map.tiles.length; y++) {
      for (let x = 0; x < map.tiles[y].length; x++) {
        const tile = map.tiles[y][x];
        const tileInfo = map.tileTypes[tile];
        if (tileInfo) {
          const sourceWidth = tileInfo.sw ?? DEFAULT_SOURCE_TILE_SIZE;
          const sourceHeight = tileInfo.sh ?? DEFAULT_SOURCE_TILE_SIZE;
          const sourceX = tileInfo.sx ?? tileInfo.col * DEFAULT_SOURCE_TILE_SIZE;
          const sourceY = tileInfo.sy ?? tileInfo.row * DEFAULT_SOURCE_TILE_SIZE;
          c.drawImage(
            img[tileInfo.sheet], sourceX, sourceY, sourceWidth, sourceHeight,
            x * T, y * T, T, T,
          );
        }
      }
    }

    drawActors();
    if (state === "play") drawPrompts();
    c.restore();
    if (state === "talk") drawDialogue();
  }

  function drawPlayer() {
    const scale = T / DEFAULT_SOURCE_TILE_SIZE;
    const width = DEFAULT_SOURCE_TILE_SIZE * scale;
    const height = DEFAULT_SOURCE_TILE_SIZE * 2 * scale;
    c.drawImage(
      img.alex, frame * DEFAULT_SOURCE_TILE_SIZE, dir * DEFAULT_SOURCE_TILE_SIZE * 2,
      DEFAULT_SOURCE_TILE_SIZE, DEFAULT_SOURCE_TILE_SIZE * 2,
      px + S / 2 - width / 2, py + S - height, width, height,
    );
  }

  function drawObject(object) {
    const scale = T / DEFAULT_SOURCE_TILE_SIZE;
    const dx = (object.col - object.ax) * T;
    const dy = (object.row - object.ay) * T;
    c.drawImage(
      img[object.sheet], object.sx, object.sy, object.sw, object.sh,
      dx, dy, object.sw * scale, object.sh * scale,
    );
  }

  function drawEntity(entity) {
    if (!entity.sheet) return;
    const scale = T / DEFAULT_SOURCE_TILE_SIZE;
    const width = DEFAULT_SOURCE_TILE_SIZE * scale;
    const height = DEFAULT_SOURCE_TILE_SIZE * 2 * scale;
    c.drawImage(
      img[entity.sheet], 0, 0, DEFAULT_SOURCE_TILE_SIZE, DEFAULT_SOURCE_TILE_SIZE * 2,
      entity.x + S / 2 - width / 2, entity.y + S - height, width, height,
    );
  }

  function drawPrompt(entity) {
    const scale = T / DEFAULT_SOURCE_TILE_SIZE;
    const headTop = entity.y + S - DEFAULT_SOURCE_TILE_SIZE * 2 * scale;
    const textX = entity.x + S / 2;
    const textY = headTop - 8;
    const label = entity.prompt ? `▶ [Z] ${entity.prompt}` : "▼ [Z]";

    c.font = `bold 13px ${FONT}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    const width = Math.max(44, c.measureText(label).width + 12);
    c.fillStyle = "rgba(0,0,0,0.7)";
    c.fillRect(textX - width / 2, textY - 8, width, 16);
    c.fillStyle = "#ffe14d";
    c.fillText(label, textX, textY + 1);
    c.textAlign = "left";
    c.textBaseline = "alphabetic";
  }

  function drawPrompts() {
    const entity = entityInFront();
    if (entity) drawPrompt(entity);
  }

  function drawActors() {
    const actors = [];
    for (const object of objects) {
      actors.push({
        footY: (object.row - object.ay) * T + object.sh * (T / DEFAULT_SOURCE_TILE_SIZE),
        kind: "object", object,
      });
    }
    for (const entity of entities) {
      actors.push({ footY: entity.y + S, kind: "entity", entity });
    }
    actors.push({ footY: py + S, kind: "player" });
    actors.sort((a, b) => a.footY - b.footY);

    for (const actor of actors) {
      if (actor.kind === "player") drawPlayer();
      else if (actor.kind === "entity") drawEntity(actor.entity);
      else drawObject(actor.object);
    }
  }

  function solidInObject(gridX, gridY) {
    for (const object of objects) {
      const footprintX = gridX - (object.col - object.ax);
      const footprintY = gridY - (object.row - object.ay);
      if (object.mask[footprintY] && object.mask[footprintY][footprintX] === "#") return true;
    }
    return false;
  }

  function solidInEntity(x, y) {
    for (const entity of entities) {
      if (!entity.solid) continue;
      if (x >= entity.x && x < entity.x + S && y >= entity.y && y < entity.y + S) return true;
    }
    return false;
  }

  function solidAt(x, y) {
    const gridX = Math.floor(x / T);
    const gridY = Math.floor(y / T);
    if (!map.tiles[gridY] || !map.tiles[gridY][gridX]) return true;
    const tileInfo = map.tileTypes[map.tiles[gridY][gridX]];
    if (tileInfo && tileInfo.solid) return true;
    if (solidInObject(gridX, gridY)) return true;
    if (solidInEntity(x, y)) return true;
    return false;
  }

  function hitsWall(x, y) {
    return solidAt(x, y) || solidAt(x + S, y) ||
      solidAt(x, y + S) || solidAt(x + S, y + S);
  }

  function entityInFront() {
    const centerX = Math.floor((px + S / 2) / T);
    const centerY = Math.floor((py + S / 2) / T);
    const frontX = centerX + (dir === 1) - (dir === 3);
    const frontY = centerY + (dir === 0) - (dir === 2);
    for (const entity of entities) {
      const entityX = Math.floor((entity.x + S / 2) / T);
      const entityY = Math.floor((entity.y + S / 2) / T);
      if (entityX === frontX && entityY === frontY && (entity.dialogue || entity.to)) return entity;
    }
    return null;
  }

  function startDialogue(entity) {
    currentDialogue = dialogue[entity.dialogue];
    page = 0;
    choiceIdx = 0;
    state = "talk";
  }

  function interact() {
    const entity = entityInFront();
    if (!entity) return;
    if (entity.to) {
      const spawn = entity.spawn || { x: 0, y: 0, dir: 0 };
      location.href = `${entity.to}?x=${Math.round(spawn.x)}&y=${Math.round(spawn.y)}&dir=${spawn.dir || 0}`;
    } else if (entity.dialogue) {
      startDialogue(entity);
    }
  }

  function talkUpdate() {
    const currentPage = currentDialogue[page];
    if (currentPage.choices) {
      const count = currentPage.choices.length;
      if (pressed("ArrowUp") || pressed("KeyW")) choiceIdx = (choiceIdx - 1 + count) % count;
      if (pressed("ArrowDown") || pressed("KeyS")) choiceIdx = (choiceIdx + 1) % count;
      if (pressed("KeyZ") || pressed("Enter")) {
        const next = currentPage.choices[choiceIdx].next;
        if (next) {
          currentDialogue = dialogue[next];
          page = 0;
          choiceIdx = 0;
        } else {
          state = "play";
        }
      }
      if (pressed("KeyX") || pressed("ShiftLeft")) state = "play";
    } else if (pressed("KeyZ") || pressed("Enter")) {
      page++;
      if (page >= currentDialogue.length) state = "play";
    }
  }

  function drawDialogue() {
    const currentPage = currentDialogue[page];
    const boxX = 16;
    const boxY = VIEW_H - 120;
    const boxWidth = VIEW_W - 32;
    const boxHeight = 104;
    c.fillStyle = "rgba(0,0,0,0.85)";
    c.fillRect(boxX, boxY, boxWidth, boxHeight);
    c.strokeStyle = "#fff";
    c.strokeRect(boxX, boxY, boxWidth, boxHeight);
    c.fillStyle = "#fff";
    c.font = `16px ${FONT}`;

    if (currentPage.choices) {
      c.fillText(currentPage.text, boxX + 16, boxY + 26);
      for (let i = 0; i < currentPage.choices.length; i++) {
        const marker = i === choiceIdx ? "▶ " : "    ";
        c.fillText(marker + currentPage.choices[i].label, boxX + 16, boxY + 56 + i * 24);
      }
    } else {
      c.fillText(currentPage.text, boxX + 16, boxY + 34);
      c.fillText("▼ Z", boxX + boxWidth - 48, boxY + boxHeight - 18);
    }
  }

  function pressed(code) {
    return just[code];
  }

  function update(time) {
    const dt = Math.min((time - last) / 1000, 0.05);
    last = time;

    if (state === "talk") {
      talkUpdate();
      draw();
      clearJustPressed();
      requestAnimationFrame(update);
      return;
    }

    let velocityX = 0;
    let velocityY = 0;
    if (keys.ArrowLeft || keys.KeyA) velocityX = -1;
    if (keys.ArrowRight || keys.KeyD) velocityX = 1;
    if (keys.ArrowUp || keys.KeyW) velocityY = -1;
    if (keys.ArrowDown || keys.KeyS) velocityY = 1;
    if (velocityX && velocityY) {
      velocityX *= 0.707;
      velocityY *= 0.707;
    }

    const moving = velocityX !== 0 || velocityY !== 0;
    if (moving) {
      if (velocityX > 0) dir = 1;
      else if (velocityX < 0) dir = 3;
      else if (velocityY > 0) dir = 0;
      else if (velocityY < 0) dir = 2;
      animTime += dt;
      frame = Math.floor(animTime / ANIM) % 4;
    } else {
      animTime = 0;
      frame = 0;
    }

    px += velocityX * SPEED * dt;
    if (hitsWall(px, py)) px -= velocityX * SPEED * dt;
    py += velocityY * SPEED * dt;
    if (hitsWall(px, py)) py -= velocityY * SPEED * dt;

    const centerX = Math.floor((px + S / 2) / T);
    const centerY = Math.floor((py + S / 2) / T);
    const doorType = map.tiles[centerY]?.[centerX];
    const door = map.doors?.[doorType];
    if (door) {
      const spawn = door.spawn;
      const query = spawn
        ? `?x=${Math.round(spawn.x)}&y=${Math.round(spawn.y)}&dir=${spawn.dir || 0}`
        : "";
      location.href = door.to + query;
    }
    if (pressed("KeyZ") || pressed("Enter")) interact();

    draw();
    clearJustPressed();
    requestAnimationFrame(update);
  }

  function clearJustPressed() {
    for (const key in just) just[key] = false;
  }

  document.addEventListener("keydown", event => {
    keys[event.code] = true;
    just[event.code] = true;
    if (event.code.startsWith("Arrow")) event.preventDefault();
  });
  document.addEventListener("keyup", event => {
    keys[event.code] = false;
  });

  const bgm = new Audio(map.bgm);
  bgm.loop = true;
  bgm.volume = 0.6;
  bgm.play().catch(() => {});
  document.addEventListener("keydown", () => bgm.play().catch(() => {}), { once: true });

  for (const name of names) {
    img[name] = new Image();
    img[name].onload = () => {
      loaded++;
      if (loaded === names.length) {
        draw();
        requestAnimationFrame(update);
      }
    };
    img[name].src = map.sheets[name];
  }
}