export default {
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
  winter_mayor_bye: [{ text: "* ..." }],
};