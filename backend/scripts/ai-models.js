// Run from the backend folder:  node scripts/ai-models.js
require("dotenv").config({ quiet: true });
require("dns").setServers(["1.1.1.1", "8.8.8.8"]);

const KEY = process.env.GEMINI_API_KEY;
const CURRENT = process.env.AI_MODEL;
const BASE = "https://generativelanguage.googleapis.com/v1beta";

const secs = (t) => ((Date.now() - t) / 1000).toFixed(1);

async function call(url, options, ms) {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
      signal: AbortSignal.timeout(ms),
    });
    return {
      ok: res.ok,
      status: res.status,
      secs: secs(start),
      body: res.ok ? await res.json() : (await res.text()).slice(0, 200),
    };
  } catch (err) {
    return {
      ok: false,
      status: "no answer",
      secs: secs(start),
      body: err.message,
    };
  }
}

(async () => {
  // 1) Can we reach Google at all? (a tiny request, no AI involved)
  const list = await call(`${BASE}/models?pageSize=200`, {}, 15000);
  console.log(
    `1) Reach Google + key check: ${list.ok ? "OK" : "FAILED"} (${list.status}) in ${list.secs}s`,
  );
  if (!list.ok)
    return console.log(
      "   ->",
      list.body,
      "\n   The problem is the connection or the key, not the model.",
    );

  // 2) Which models can this key actually use?
  const names = list.body.models
    .filter(
      (m) =>
        m.supportedGenerationMethods?.includes("generateContent") &&
        /flash/i.test(m.name),
    )
    .map((m) => m.name.replace("models/", ""));
  console.log(
    `2) Flash models available to this key (${names.length}):\n   ${names.join("\n   ")}`,
  );

  // 3) Try the current model and a few others at the same time (25 s limit each)
  const candidates = [...new Set([CURRENT, ...names.slice(0, 5)])];
  console.log("3) Quick test of each model:");
  const results = await Promise.all(
    candidates.map(async (name) => {
      const r = await call(
        `${BASE}/models/${name}:generateContent`,
        {
          method: "POST",
          body: JSON.stringify({
            contents: [
              { role: "user", parts: [{ text: "Say hello in 3 words." }] },
            ],
            generationConfig: { maxOutputTokens: 300 },
          }),
        },
        25000,
      );
      return `   ${name.padEnd(36)} ${r.ok ? "OK    " : "FAIL  "} ${r.secs}s ${r.ok ? "" : `(${r.status}) ${r.body}`}`;
    }),
  );
  console.log(results.join("\n"));
})();
