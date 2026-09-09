import { startGame } from "./engine.js?v=10";
import { T } from "./constants.js";
import map from "../maps/Sami_Village.js";
import dialogue from "./dialogues/sami-village.js";

const samiVillageMap = {
  ...map,
  spawn: { x: 3 * T + 4, y: 10 * T + 4, dir: 0 },
  sheets: {
    ...map.sheets,
    sami_npc: "img/ClothesTherapyCharacters.png",
    typhon: "img/Typhon.png",
    sami_map: "img/Sami_Map.png",
  },
};

const runtime = {
  typhonTalkComplete: false,
  mapCollected: false,
};

const samiMap = {
  id: "sami_map",
  kind: "item",
  x: 16 * T,
  y: 13 * T,
  sheet: "sami_map",
  sx: 0,
  sy: 0,
  sw: 174,
  sh: 174,
  displayWidth: T,
  displayHeight: T,
  solid: true,
  prompt: "拾取萨米地图",
  collect() {
    runtime.mapCollected = true;
    typhon.dialogue = "sami_typhon2";
  },
};

const typhon = {
  id: "typhon",
  kind: "npc",
  x: 32 * T,
  y: 8 * T,
  sheet: "typhon",
  sx: 2113,
  sy: 0,
  sw: 704,
  sh: 1366,
  solid: true,
  dialogue: "sami_typhon1",
  onDialogueComplete() {
    if (runtime.typhonTalkComplete || runtime.mapCollected) return;
    runtime.typhonTalkComplete = true;
    samiVillageMap.entities.push(samiMap);
  },
};

samiVillageMap.entities = [
  {
    id: "sami_guide",
    kind: "npc",
    x: 13 * T,
    y: 10 * T,
    sheet: "sami_npc",
    solid: true,
    dialogue: "sami_NPC1.1",
  },
  {
    id: "sami_wanderer",
    kind: "npc",
    x: 24 * T,
    y: 8 * T,
    sheet: "sami_npc",
    sx: 0,
    sy: 4 * 16,
    sw: 16,
    sh: 32,
    solid: true,
    promptText: "三年前也有队外来人，从这片土地走出去，再也没有回来。",
  },
  typhon,
];
startGame({ canvas: document.getElementById("g"), map: samiVillageMap, dialogue });
