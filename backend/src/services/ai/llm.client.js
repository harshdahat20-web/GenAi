const env = require("../../config/env");
const logger = require("../../config/logger");
const ApiError = require("../../utils/ApiError");

// Use either `prompt` (one question) or `messages` (a conversation: [{ role: "user" | "assistant", text }])
const generateText = async ({ system, prompt, messages, maxTokens = 1000 }) => {
  try {
    const contents = messages
      ? messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.text }],
        }))
      : [{ role: "user", parts: [{ text: prompt }] }];

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${env.AI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents,
          generationConfig: { maxOutputTokens: maxTokens * 4 }, // extra room for the model's thinking tokens
        }),
        signal: AbortSignal.timeout(60000),
      },
    );

    if (!res.ok) {
      throw new Error(`Gemini API ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    const text = (data.candidates?.[0]?.content?.parts || [])
      .map((p) => p.text || "")
      .join("");

    if (!text) throw new Error("Empty response from model");

    return {
      text,
      usage: {
        inputTokens: data.usageMetadata?.promptTokenCount || 0,
        outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
      },
    };
  } catch (err) {
    logger.error({ err }, "LLM request failed");
    throw new ApiError(502, "AI service is unavailable. Please try again.");
  }
};

module.exports = { generateText };
