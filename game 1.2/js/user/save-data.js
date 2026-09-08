// 新玩家第一次进入游戏时使用的存档结构。
export function createEmptySave() {
  return {
    version: 1,
    flags: {},
    collectedItems: {},
    npcStates: {},
    inventory: {},
  };
}