import { T } from "../js/constants.js";

export default {
  // 地图基础设置：尺寸、默认出生点和朝向。
  width: 37,
  height: 17,
  spawn: { x: 0, y: 0, dir: 0 },

  // 地面图层：每个字符串是一行，每个字符对应一个地图格。
  tiles: [
  ".....................................",
  ".....................................",
  "........................00000000.....",
  "........................111111112....",
  "........................333..3334....",
  "........................333333556....",
  "........................555135336....",
  "........................3353353378...",
  "........................3355553339a..",
  "bcdefg1h3g333h333...33g33331333gij...",
  "kklgff113mno3h3h3...3333pqr31333s....",
  "tuvwxgh13yzAg333g3333g33BCD333336....",
  "...EFxh13GHIg33333g33333JKL3333MN....",
  "....EFx33g333333333113333hh3339OP....",
  ".....EFQQQQQQQQQQQQQQQQQQQQQQQRS.....",
  "......ETTTTTTTTTTTTTTTTTTTTTTTU......",
  ".......VVVVVVVVVVVVVVVVVVVVVVV......."
],
  // tileTypes 同时记录图片来源和该图块的阻挡属性。
  tileTypes: {
    "0": {"sheet":"ut_winter_scene.png","sx":100,"sy":460,"sw":20,"sh":20},
    "1": {"sheet":"ut_winter_scene.png","sx":20,"sy":0,"sw":20,"sh":20},
    "2": {"sheet":"ut_winter_scene.png","sx":120,"sy":460,"sw":20,"sh":20},
    "3": {"sheet":"ut_winter_scene.png","sx":0,"sy":0,"sw":20,"sh":20},
    "4": {"sheet":"ut_winter_scene.png","sx":120,"sy":480,"sw":20,"sh":20},
    "5": {"sheet":"ut_winter_scene.png","sx":0,"sy":0,"sw":20,"sh":20,"solid":true},
    "6": {"sheet":"ut_winter_scene.png","sx":120,"sy":480,"sw":20,"sh":20,"solid":true},
    "7": {"sheet":"ut_winter_scene.png","sx":100,"sy":440,"sw":20,"sh":20},
    "8": {"sheet":"ut_winter_scene.png","sx":160,"sy":460,"sw":20,"sh":20},
    "9": {"sheet":"ut_winter_scene.png","sx":80,"sy":580,"sw":20,"sh":20},
    "a": {"sheet":"ut_winter_scene.png","sx":0,"sy":140,"sw":20,"sh":20,"solid":true},
    "b": {"sheet":"ut_winter_scene.png","sx":80,"sy":180,"sw":20,"sh":20,"solid":true},
    "c": {"sheet":"ut_winter_scene.png","sx":100,"sy":180,"sw":20,"sh":20,"solid":true},
    "d": {"sheet":"ut_winter_scene.png","sx":20,"sy":100,"sw":20,"sh":20,"solid":true},
    "e": {"sheet":"ut_winter_scene.png","sx":40,"sy":100,"sw":20,"sh":20},
    "f": {"sheet":"ut_winter_scene.png","sx":20,"sy":500,"sw":20,"sh":20},
    "g": {"sheet":"ut_winter_scene.png","sx":40,"sy":0,"sw":20,"sh":20},
    "h": {"sheet":"ut_winter_scene.png","sx":60,"sy":0,"sw":20,"sh":20},
    "i": {"sheet":"ut_winter_scene.png","sx":0,"sy":460,"sw":20,"sh":20},
    "j": {"sheet":"ut_winter_scene.png","sx":40,"sy":560,"sw":20,"sh":20,"solid":true},
    "k": {"sheet":"ut_winter_scene.png","sx":80,"sy":200,"sw":20,"sh":20},
    "l": {"sheet":"ut_winter_scene.png","sx":100,"sy":200,"sw":20,"sh":20},
    "m": {"sheet":"ut_winter_scene.png","sx":60,"sy":340,"sw":20,"sh":20},
    "n": {"sheet":"ut_winter_scene.png","sx":80,"sy":340,"sw":20,"sh":20},
    "o": {"sheet":"ut_winter_scene.png","sx":100,"sy":340,"sw":20,"sh":20},
    "p": {"sheet":"ut_winter_scene.png","sx":60,"sy":80,"sw":20,"sh":20},
    "q": {"sheet":"ut_winter_scene.png","sx":80,"sy":80,"sw":20,"sh":20},
    "r": {"sheet":"ut_winter_scene.png","sx":100,"sy":80,"sw":20,"sh":20},
    "s": {"sheet":"ut_winter_scene.png","sx":0,"sy":120,"sw":20,"sh":20,"solid":true},
    "t": {"sheet":"ut_winter_scene.png","sx":100,"sy":140,"sw":20,"sh":20,"solid":true},
    "u": {"sheet":"ut_winter_scene.png","sx":120,"sy":240,"sw":20,"sh":20,"solid":true},
    "v": {"sheet":"ut_winter_scene.png","sx":20,"sy":140,"sw":20,"sh":20,"solid":true},
    "w": {"sheet":"ut_winter_scene.png","sx":40,"sy":140,"sw":20,"sh":20,"solid":true},
    "x": {"sheet":"ut_winter_scene.png","sx":20,"sy":520,"sw":20,"sh":20},
    "y": {"sheet":"ut_winter_scene.png","sx":60,"sy":360,"sw":20,"sh":20},
    "z": {"sheet":"ut_winter_scene.png","sx":80,"sy":360,"sw":20,"sh":20},
    "A": {"sheet":"ut_winter_scene.png","sx":100,"sy":360,"sw":20,"sh":20},
    "B": {"sheet":"ut_winter_scene.png","sx":60,"sy":100,"sw":20,"sh":20},
    "C": {"sheet":"ut_winter_scene.png","sx":80,"sy":100,"sw":20,"sh":20},
    "D": {"sheet":"ut_winter_scene.png","sx":100,"sy":100,"sw":20,"sh":20},
    "E": {"sheet":"ut_winter_scene.png","sx":20,"sy":560,"sw":20,"sh":20},
    "F": {"sheet":"ut_winter_scene.png","sx":20,"sy":540,"sw":20,"sh":20,"solid":true},
    "G": {"sheet":"ut_winter_scene.png","sx":60,"sy":380,"sw":20,"sh":20},
    "H": {"sheet":"ut_winter_scene.png","sx":80,"sy":380,"sw":20,"sh":20},
    "I": {"sheet":"ut_winter_scene.png","sx":100,"sy":380,"sw":20,"sh":20},
    "J": {"sheet":"ut_winter_scene.png","sx":60,"sy":120,"sw":20,"sh":20},
    "K": {"sheet":"ut_winter_scene.png","sx":80,"sy":120,"sw":20,"sh":20},
    "L": {"sheet":"ut_winter_scene.png","sx":100,"sy":120,"sw":20,"sh":20},
    "M": {"sheet":"ut_winter_scene.png","sx":100,"sy":500,"sw":20,"sh":20},
    "N": {"sheet":"ut_winter_scene.png","sx":120,"sy":500,"sw":20,"sh":20,"solid":true},
    "O": {"sheet":"ut_winter_scene.png","sx":80,"sy":600,"sw":20,"sh":20,"solid":true},
    "P": {"sheet":"ut_winter_scene.png","sx":120,"sy":520,"sw":20,"sh":20},
    "Q": {"sheet":"ut_winter_scene.png","sx":100,"sy":520,"sw":20,"sh":20,"solid":true},
    "R": {"sheet":"ut_winter_scene.png","sx":40,"sy":540,"sw":20,"sh":20,"solid":true},
    "S": {"sheet":"ut_winter_scene.png","sx":80,"sy":620,"sw":20,"sh":20},
    "T": {"sheet":"ut_winter_scene.png","sx":100,"sy":520,"sw":20,"sh":20},
    "U": {"sheet":"ut_winter_scene.png","sx":40,"sy":560,"sw":20,"sh":20},
    "V": {"sheet":"ut_winter_scene.png","sx":100,"sy":540,"sw":20,"sh":20},
  },

  // 静态物体定义与摆放：objectMap 中的字符指向 objectChars。
  objectTypes: {
    "Pine": {"sheet":"ut_winter_scene.png","sourceTileSize":20,"sx":0,"sy":340,"sw":60,"sh":120,"ax":0,"ay":5,"mask":["###","###","###","###","###","###"]},
    "Broken_house": {"sheet":"winter_town.png","sourceTileSize":16,"sx":0,"sy":512,"sw":112,"sh":128,"ax":0,"ay":7,"mask":[".......",".......",".......",".......",".......","#######","#######","#######"]},
    "Two_Trees": {"sheet":"ut_winter_scene.png","sourceTileSize":20,"sx":0,"sy":800,"sw":100,"sh":60,"ax":0,"ay":2,"mask":[".....",".....","#####"]},
    "Tower": {"sheet":"winter_outdoorsTileSheet.png","sourceTileSize":16,"sx":0,"sy":400,"sw":64,"sh":192,"ax":1,"ay":11,"mask":["....","....","....","....","....","....","....","....","....","....","####","####"]},
    "Snow_Block": {"sheet":"ut_winter_scene.png","sourceTileSize":20,"sx":60,"sy":60,"sw":20,"sh":20,"ax":0,"ay":0,"mask":["#"]},
  },
  objectMap: [
  ".....................................",
  ".....................................",
  ".....................................",
  ".....................................",
  ".....................................",
  ".....................................",
  "........................00...........",
  ".....................................",
  ".....................................",
  "....0................0...............",
  ".....................................",
  ".....................................",
  ".............................0.......",
  "..............00.............0.......",
  ".....................................",
  ".....................................",
  "....................................."
],
  objectChars: {
    "0": "Snow_Block",
  },
  // 需要自由坐标放置的大型物体可以写入 freeObjects。
  freeObjects: [
  {
    "type": "Pine",
    "col": 3,
    "row": 8
  },
  {
    "type": "Pine",
    "col": 6,
    "row": 8
  },
  {
    "type": "Pine",
    "col": 9,
    "row": 8
  },
  {
    "type": "Pine",
    "col": 12,
    "row": 8
  },
  {
    "type": "Pine",
    "col": 15,
    "row": 8
  },
  {
    "type": "Pine",
    "col": 18,
    "row": 8
  },
  {
    "type": "Pine",
    "col": 21,
    "row": 8
  },
  {
    "type": "Broken_house",
    "col": 14,
    "row": 10
  },
  {
    "type": "Pine",
    "col": 34,
    "row": 7
  },
  {
    "type": "Two_Trees",
    "col": 24,
    "row": 5
  },
  {
    "type": "Two_Trees",
    "col": 28,
    "row": 5
  },
  {
    "type": "Tower",
    "col": 27,
    "row": 8
  }
],

  // 引擎绘制所需的图片资源。游戏项目的 img/ 中必须存在这些文件。
  sheets: {
    "ut_winter_scene.png": "img/ut_winter_scene.png",
    "winter_town.png": "img/winter_town.png",
    "winter_outdoorsTileSheet.png": "img/winter_outdoorsTileSheet.png",
    "alex": "img/Alex.png",
  },

  // 编辑器暂不制作 NPC、传送点和其他实体。
  // 添加 NPC 时通常需要填写：kind、id、x、y、sheet、solid、dialogue。
  // 添加传送点时通常需要填写：kind: "warp"、x、y、to 和 spawn。
  // 对话内容仍需在 js/dialogues/ 中定义，并让 dialogue 字段引用对应 ID。
  entities: [],
};
