import { startGame } from "./engine.js";
import map from "../maps/map1.js";
import dialogue from "./dialogues/map1.js";

startGame({ canvas: document.getElementById("g"), map, dialogue });