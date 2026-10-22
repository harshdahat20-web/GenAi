const { generateText } = require("./llm.client");
const { logUsage } = require("../usage.service");
const prompt = require("./prompts/review.prompt");

// "12| code": lets the AI point at exact lines
const numberLines = (code) =>
  code
    .split("\n")
    .map((line, i) => `${i + 1}| ${line}`)
    .join("\n");

const reviewCode = async (userId, { code, language, focus }) => {
  const { text, usage } = await generateText({
    system: prompt.system,
    prompt: prompt.buildPrompt({
      numbered: numberLines(code),
      language,
      focus,
    }),
    maxTokens: 2500,
  });
  await logUsage(userId, "code_review", usage);
  return { review: text.trim() };
};

module.exports = { reviewCode };
