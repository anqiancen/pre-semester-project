export default {
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
  spring_mayor_bye: [{ text: "* ..." }],
};