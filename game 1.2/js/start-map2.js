import { startGame } from "./engine.js";
import map from "../maps/map2.js";
import dialogue from "./dialogues/map2.js";
import { requireCurrentUser } from "./user/storage.js";

if (requireCurrentUser()) {
	startGame({ canvas: document.getElementById("g"), map, dialogue });
}