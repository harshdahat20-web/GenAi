// Run from the backend folder:  node scripts/ai-speed.js
require("dotenv").config({ quiet: true });
require("dns").setServers(["1.1.1.1", "8.8.8.8"]);

const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.AI_MODEL;

async function run(label, generationConfig) {
  const start = Date.now();
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: "Explain photosynthesis like I'm 12, in 3 short sentences.",
                },
              ],
            },
          ],
          generationConfig,
        }),
        signal: AbortSignal.timeout(90000),
      },
    );
    const secs = ((Date.now() - start) / 1000).toFixed(1);
    if (!res.ok)
      return console.log(
        `${label}: FAILED (${res.status}) after ${secs}s\n   ${(await res.text()).slice(0, 250)}`,
      );
    const u = (await res.json()).usageMetadata || {};
    console.log(
      `${label}: ${secs}s | thinking tokens: ${u.thoughtsTokenCount ?? "?"} | answer tokens: ${u.candidatesTokenCount ?? "?"}`,
    );
  } catch (err) {
    console.log(
      `${label}: ERROR after ${((Date.now() - start) / 1000).toFixed(1)}s -> ${err.message}`,
    );
  }
}

(async () => {
  console.log(`Model: ${MODEL}`);
  await run("default       ", { maxOutputTokens: 6000 });
  await run("thinking: low ", {
    maxOutputTokens: 6000,
    thinkingConfig: { thinkingLevel: "low" },
  });
})();
