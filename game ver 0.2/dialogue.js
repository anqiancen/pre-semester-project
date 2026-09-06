// ==================== 对话数据库 ====================
// 每个键 = 一段对话（按 NPC / 场景命名）。
// 一段对话 = 一串"页面"。页面有两种：
//   { text: "..." }                     —— 普通一句，按 Z 翻下一页
//   { text: "...", choices: [...] }     —— 带选项，选完跳到 next 指向的段
// 选项：{ label: "显示文字", next: "要跳到的段名" }（next 省略 = 对话结束）
// 每句开头的 "*" 是传说之下的标志。

const DIALOGUE = {
  spring_mayor: [
    { text: "* 这是一段对话测试。" },
    { text: "* 你看到了。" },
    {
      text: "* 现在是春天，想看看冬天什么样子吗？",
      choices: [
        { label: "是的", next: "spring_mayor_news" },
        { label: "...", next: "spring_mayor_bye" },
      ],
    },
  ],

  spring_mayor_news: [
    { text: "* 往东走吧。" },
    { text: "* 回见。" },
  ],

  spring_mayor_bye: [
    { text: "* ..." },
  ],

  winter_mayor: [
    { text: "* 这是一段对话测试。" },
    { text: "* 你看到了。" },
    {
      text: "* 现在是冬天，想看看春天什么样子吗？",
      choices: [
        { label: "是的", next: "winter_mayor_news" },
        { label: "...", next: "winter_mayor_bye" },
      ],
    },
  ],

  winter_mayor_news: [
    { text: "* 往西走吧。" },
    { text: "* 回见。" },
  ],

  winter_mayor_bye: [
    { text: "* ..." },
  ],
};
