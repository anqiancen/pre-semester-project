import { startGame } from "./engine.js";
import map from "../maps/map2.js";
import dialogue from "./dialogues/map2.js";

startGame({ canvas: document.getElementById("g"), map, dialogue });