import { startGame } from "./engine.js";
import map from "../maps/map1.js";
import dialogue from "./dialogues/map1.js";
import { requireCurrentUser } from "./user/storage.js";

if (requireCurrentUser()) {
	startGame({ canvas: document.getElementById("g"), map, dialogue });
}