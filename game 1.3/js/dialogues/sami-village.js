export default {
  "sami_NPC1.1": [
    {
      speaker: "我",
      text: "",
      choices: [
        { label: "请问前往冰原是往这个方向走吗？", next: "sami_NPC1.2" },
      ],
    },
  ],
  "sami_NPC1.2": [
    { speaker: "他", text: "北方的风雪会吃掉外来人的意志，不要轻易向北。" },
    { speaker: "他", text: "提丰刚回营地，她最懂北边的冰原，但她不会轻易给外人引路。" },
    { speaker: "旁白", text: "（他缩了缩肩膀，目光避开北方雪原，下颌紧绷，语气带着疲惫的告诫）" },
  ],
  sami_typhon1: [
    { speaker: "旁白", text: "（在边境营地，你找到了萨米猎人提丰。她在小木屋外的木墩上，蹲坐着打磨箭矢。她并未停下手上活计，目光淡淡掠过你们，投向远处灰白群山。）" },
    { speaker: "旁白", text: "（你顺着她的视线眺望过去。狂风穿过森林，树冠发出低沉而漫长的声响，像有什么庞大的生命正蛰伏在雪幕之后吞吐呼吸。）" },
    {
      speaker: "我",
      text: "",
      choices: [
        { label: "我们想向北前往冰原，真诚的希望请你作为我们的向导。", next: "sami_typhon1.1" },
      ],
    },
  ],
  "sami_typhon1.1": [
    { speaker: "提丰", text: "风不允许你们继续前进。" },
    {
      speaker: "我",
      text: "",
      choices: [
        { label: "所以你们不让我们进去？", next: "sami_typhon1.2" },
      ],
    },
  ],
  "sami_typhon1.2": [
    { speaker: "提丰", text: "不是我们。是萨米。她要保护她的子民。" },
    { speaker: "提丰", text: "找到必要的物资。我在那里等你们。" },
    { speaker: "旁白", text: "（找到遗失的萨米地图。）" },
  ],
  sami_typhon2: [
    { speaker: "旁白", text: "（提丰没有半句多余的解释，默然将猎弓攀上肩头，目光落向那条林间通路。）" },
    { speaker: "提丰", text: "走吧。萨米认可了你们。" },
    {
      speaker: "我",
      text: "",
      choices: [
        { label: "前进", next: "sami_typhon2.1" },
        { label: "再等等" },
      ],
    },
  ],
  // 后续接入另一张地图或独立游戏时，从这个对话节点之后连接。
  "sami_typhon2.1": [
    { speaker: "旁白", text: "（你紧随提丰踏上小径。残雪覆着冻土，沿途林木一路向北逐步疏落。透过树木间隙，辽阔冰原的惨白轮廓在前方缓缓浮现，道路直通向那片未知的冰雪旷野。）", to: "mini_games/i_wanna_summer/index.html" },
  ],
};