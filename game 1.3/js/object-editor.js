const TILE_SIZE = 32;
const SOURCE_TILE_SIZE = 16;
const SHEET_SCALE = 2;
const imageFiles = [
  "Alex.png", "Bouncer.png", "Deluxe Barn.png", "Festivals.png", "fall_outdoorsTileSheet.png",
  "fall_town.png", "houses.png", "samshowtiles.png", "spring_outdoorsTileSheet.png",
  "spring_town.png", "winter_beach.png", "winter_outdoorsTileSheet.png", "winter_town.png",
];
const sheetPaths = Object.fromEntries(imageFiles.map((fileName) => [fileName, `img/${fileName}`]));
const images = {};
const preview = document.getElementById("objectPreview");
const context = preview.getContext("2d");
const sheetCanvas = document.getElementById("sheetCanvas");
const sheetContext = sheetCanvas.getContext("2d");
let dragStart = null;
let anchorMode = false;

function loadSheet(fileName) {
  if (images[fileName]) return Promise.resolve(images[fileName]);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => { images[fileName] = image; resolve(image); };
    image.onerror = reject;
    image.src = sheetPaths[fileName];
  });
}

function populateSheetSelect() {
  const select = document.getElementById("sheetSelect");
  for (const fileName of imageFiles) {
    const option = document.createElement("option");
    option.value = fileName;
    option.textContent = fileName;
    select.append(option);
  }
  select.value = "spring_outdoorsTileSheet.png";
}

function sourceTilePoint(event) {
  const image = images[document.getElementById("sheetSelect").value];
  const rect = sheetCanvas.getBoundingClientRect();
  const columns = Math.floor(image.width / SOURCE_TILE_SIZE);
  const rows = Math.floor(image.height / SOURCE_TILE_SIZE);
  return {
    col: Math.max(0, Math.min(columns - 1, Math.floor((event.clientX - rect.left) / (SOURCE_TILE_SIZE * SHEET_SCALE)))),
    row: Math.max(0, Math.min(rows - 1, Math.floor((event.clientY - rect.top) / (SOURCE_TILE_SIZE * SHEET_SCALE)))),
  };
}

function renderSheet() {
  const image = images[document.getElementById("sheetSelect").value];
  if (!image) return;
  sheetCanvas.width = image.width * SHEET_SCALE;
  sheetCanvas.height = image.height * SHEET_SCALE;
  sheetContext.imageSmoothingEnabled = false;
  sheetContext.drawImage(image, 0, 0, sheetCanvas.width, sheetCanvas.height);
  sheetContext.strokeStyle = "rgba(255, 0, 0, .38)";
  sheetContext.lineWidth = 1;
  sheetContext.beginPath();
  for (let x = 0; x <= image.width / SOURCE_TILE_SIZE; x++) {
    sheetContext.moveTo(x * SOURCE_TILE_SIZE * SHEET_SCALE + .5, 0);
    sheetContext.lineTo(x * SOURCE_TILE_SIZE * SHEET_SCALE + .5, sheetCanvas.height);
  }
  for (let y = 0; y <= image.height / SOURCE_TILE_SIZE; y++) {
    sheetContext.moveTo(0, y * SOURCE_TILE_SIZE * SHEET_SCALE + .5);
    sheetContext.lineTo(sheetCanvas.width, y * SOURCE_TILE_SIZE * SHEET_SCALE + .5);
  }
  sheetContext.stroke();
  const left = Number(document.getElementById("sx").value) / SOURCE_TILE_SIZE;
  const top = Number(document.getElementById("sy").value) / SOURCE_TILE_SIZE;
  const width = Number(document.getElementById("sw").value) / SOURCE_TILE_SIZE;
  const height = Number(document.getElementById("sh").value) / SOURCE_TILE_SIZE;
  if (![left, top, width, height].every(Number.isInteger) || width < 1 || height < 1) return;
  sheetContext.fillStyle = "rgba(219, 104, 77, .22)";
  sheetContext.strokeStyle = "#db684d";
  sheetContext.lineWidth = 2;
  sheetContext.fillRect(left * SOURCE_TILE_SIZE * SHEET_SCALE, top * SOURCE_TILE_SIZE * SHEET_SCALE, width * SOURCE_TILE_SIZE * SHEET_SCALE, height * SOURCE_TILE_SIZE * SHEET_SCALE);
  sheetContext.strokeRect(left * SOURCE_TILE_SIZE * SHEET_SCALE + 1, top * SOURCE_TILE_SIZE * SHEET_SCALE + 1, width * SOURCE_TILE_SIZE * SHEET_SCALE - 2, height * SOURCE_TILE_SIZE * SHEET_SCALE - 2);
  const anchorCol = left + Number(document.getElementById("ax").value);
  const anchorRow = top + Number(document.getElementById("ay").value);
  if (anchorCol >= left && anchorCol < left + width && anchorRow >= top && anchorRow < top + height) {
    const centerX = (anchorCol + .5) * SOURCE_TILE_SIZE * SHEET_SCALE;
    const centerY = (anchorRow + .5) * SOURCE_TILE_SIZE * SHEET_SCALE;
    sheetContext.strokeStyle = "#24333a";
    sheetContext.lineWidth = 3;
    sheetContext.beginPath();
    sheetContext.moveTo(centerX - 9, centerY);
    sheetContext.lineTo(centerX + 9, centerY);
    sheetContext.moveTo(centerX, centerY - 9);
    sheetContext.lineTo(centerX, centerY + 9);
    sheetContext.stroke();
  }
}

function selectSourceArea(start, end) {
  const left = Math.min(start.col, end.col);
  const top = Math.min(start.row, end.row);
  const width = Math.abs(start.col - end.col) + 1;
  const height = Math.abs(start.row - end.row) + 1;
  document.getElementById("sx").value = left * SOURCE_TILE_SIZE;
  document.getElementById("sy").value = top * SOURCE_TILE_SIZE;
  document.getElementById("sw").value = width * SOURCE_TILE_SIZE;
  document.getElementById("sh").value = height * SOURCE_TILE_SIZE;
  renderSheet();
  update();
}

function readConfig() {
  const name = document.getElementById("objectName").value.trim();
  const id = document.getElementById("objectId").value.trim();
  const sheet = document.getElementById("sheetSelect").value;
  const sx = Number(document.getElementById("sx").value);
  const sy = Number(document.getElementById("sy").value);
  const sw = Number(document.getElementById("sw").value);
  const sh = Number(document.getElementById("sh").value);
  const ax = Number(document.getElementById("ax").value);
  const ay = Number(document.getElementById("ay").value);
  const mask = document.getElementById("mask").value.trim().split(/\r?\n/);
  const image = images[sheet];
  const expectedWidth = sw / SOURCE_TILE_SIZE;
  const expectedHeight = sh / SOURCE_TILE_SIZE;

  if (!name) throw new Error("请填写物体名称。");
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(id)) throw new Error("英文 ID 必须以字母开头，只能包含字母、数字和下划线。");
  if (![sx, sy, sw, sh, ax, ay].every(Number.isInteger) || sx < 0 || sy < 0 || sw < 16 || sh < 16 || sw % 16 || sh % 16 || ax < 0 || ay < 0) throw new Error("坐标和尺寸必须是正整数，sw、sh 必须是 16 的倍数。");
  if (sx + sw > image.width || sy + sh > image.height) throw new Error("源图区域超出了当前图集尺寸。");
  if (mask.length !== expectedHeight || mask.some((line) => line.length !== expectedWidth || !/^[.#]+$/.test(line))) throw new Error(`遮罩必须是 ${expectedWidth} 列 × ${expectedHeight} 行，只能使用 # 和 .。`);
  return { id, label: name, sheet, sx, sy, sw, sh, ax, ay, mask };
}

function renderPreview(config) {
  const image = images[config.sheet];
  preview.width = config.sw * 2;
  preview.height = config.sh * 2;
  context.imageSmoothingEnabled = false;
  context.fillStyle = "#f8f8f2";
  context.fillRect(0, 0, preview.width, preview.height);
  context.drawImage(image, config.sx, config.sy, config.sw, config.sh, 0, 0, preview.width, preview.height);
  context.fillStyle = "rgba(219, 104, 77, .35)";
  context.strokeStyle = "rgba(173, 70, 54, .8)";
  for (let row = 0; row < config.mask.length; row++) {
    for (let col = 0; col < config.mask[row].length; col++) {
      if (config.mask[row][col] !== "#") continue;
      context.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      context.strokeRect(col * TILE_SIZE + .5, row * TILE_SIZE + .5, TILE_SIZE - 1, TILE_SIZE - 1);
    }
  }
}

function update() {
  const status = document.getElementById("formStatus");
  try {
    const config = readConfig();
    renderPreview(config);
    document.getElementById("codeOutput").value = JSON.stringify(config, null, 2);
    status.textContent = "配置已更新，可以复制并导入地图查看器。";
  } catch (error) {
    status.textContent = error.message;
  }
}

document.getElementById("sheetSelect").addEventListener("change", async (event) => {
  await loadSheet(event.target.value);
  renderSheet();
  update();
});
sheetCanvas.addEventListener("pointerdown", (event) => {
  const point = sourceTilePoint(event);
  if (anchorMode) {
    const left = Number(document.getElementById("sx").value) / SOURCE_TILE_SIZE;
    const top = Number(document.getElementById("sy").value) / SOURCE_TILE_SIZE;
    const width = Number(document.getElementById("sw").value) / SOURCE_TILE_SIZE;
    const height = Number(document.getElementById("sh").value) / SOURCE_TILE_SIZE;
    if (point.col < left || point.col >= left + width || point.row < top || point.row >= top + height) {
      document.getElementById("anchorHint").textContent = "锚点必须在当前物体选区内。";
      return;
    }
    document.getElementById("ax").value = point.col - left;
    document.getElementById("ay").value = point.row - top;
    anchorMode = false;
    document.getElementById("anchorButton").classList.remove("active");
    document.getElementById("anchorButton").textContent = "选择锚点";
    document.getElementById("anchorHint").textContent = `当前锚点：(${point.col - left}, ${point.row - top})。`;
    renderSheet();
    update();
    return;
  }
  dragStart = sourceTilePoint(event);
  sheetCanvas.setPointerCapture(event.pointerId);
  selectSourceArea(dragStart, dragStart);
});
sheetCanvas.addEventListener("pointermove", (event) => {
  if (dragStart) selectSourceArea(dragStart, sourceTilePoint(event));
});
sheetCanvas.addEventListener("pointerup", (event) => {
  if (dragStart) selectSourceArea(dragStart, sourceTilePoint(event));
  dragStart = null;
});
sheetCanvas.addEventListener("pointercancel", () => { dragStart = null; });
for (const id of ["sx", "sy", "sw", "sh"]) document.getElementById(id).addEventListener("input", renderSheet);
for (const id of ["ax", "ay"]) document.getElementById(id).addEventListener("input", renderSheet);
document.getElementById("anchorButton").addEventListener("click", () => {
  anchorMode = !anchorMode;
  document.getElementById("anchorButton").classList.toggle("active", anchorMode);
  document.getElementById("anchorButton").textContent = anchorMode ? "取消选择锚点" : "选择锚点";
  document.getElementById("anchorHint").textContent = anchorMode ? "请在当前物体选区内点击一个格子。" : "点击按钮后，在上方物体区域内选择锚点。";
});
document.getElementById("previewButton").addEventListener("click", update);
document.getElementById("copyButton").addEventListener("click", async () => {
  await navigator.clipboard.writeText(document.getElementById("codeOutput").value);
  document.getElementById("formStatus").textContent = "JSON 已复制到剪贴板。";
});

populateSheetSelect();
Promise.all(imageFiles.map(loadSheet)).then(() => {
  document.getElementById("assetStatus").textContent = "图集已就绪";
  renderSheet();
  update();
}).catch(() => {
  document.getElementById("assetStatus").textContent = "图集加载失败，请通过 HTTP 服务器打开";
});
