import { getCurrentUser, getSave, saveGame } from "./storage.js";

const userEmail = getCurrentUser();
let saveData = userEmail ? getSave(userEmail) : null;

function writeSave() {
  if (userEmail) saveGame(userEmail, saveData);
}

export function getFlag(name) {
  return Boolean(saveData?.flags[name]);
}

export function setFlag(name, value = true) {
  if (!saveData) return;
  saveData.flags[name] = value;
  writeSave();
}

export function getNpcState(npcId) {
  if (!saveData) return {};
  return saveData.npcStates[npcId] || {};
}

export function addNpcTalk(npcId) {
  if (!saveData) return 0;
  const state = getNpcState(npcId);
  state.talkCount = (state.talkCount || 0) + 1;
  saveData.npcStates[npcId] = state;
  writeSave();
  return state.talkCount;
}

export function isCollected(itemId) {
  return Boolean(saveData?.collectedItems[itemId]);
}

export function collectItem(worldItemId, itemId) {
  if (!saveData || isCollected(worldItemId)) return false;
  saveData.collectedItems[worldItemId] = true;
  addItem(itemId);
  writeSave();
  return true;
}

export function hasItem(itemId) {
  return (saveData?.inventory[itemId] || 0) > 0;
}

export function addItem(itemId, amount = 1) {
  if (!saveData) return;
  saveData.inventory[itemId] = (saveData.inventory[itemId] || 0) + amount;
  writeSave();
}

export function removeItem(itemId, amount = 1) {
  if (!hasItem(itemId) || !saveData) return false;
  saveData.inventory[itemId] -= amount;
  if (saveData.inventory[itemId] <= 0) delete saveData.inventory[itemId];
  writeSave();
  return true;
}