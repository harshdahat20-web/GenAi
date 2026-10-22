import { useEffect, useRef, useState } from "react";
import api, { errMsg } from "../api/axios";
import Markdown from "../components/Markdown";
import useSeo from "../hooks/useSeo";
import { btn, btnLine, eyebrow, panel, sm } from "../utils/ui";

const LANGS = [
  "Auto-detect",
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "C",
  "C++",
  "C#",
  "Go",
  "PHP",
  "SQL",
  "HTML/CSS",
];
const FOCUS = [
  ["bugs", "Bugs"],
  ["security", "Security"],
  ["performance", "Performance"],
  ["readability", "Readability"],
  ["tests", "Tests"],
];
const MAX_CHARS = 8000;
const MAX_LINES = 400;

const EXAMPLE = `function getAverage(numbers) {
  let total = 0;
  for (let i = 0; i <= numbers.length; i++) {
    total += numbers[i];
  }
  return total / numbers.length;
}

app.get("/user", (req, res) => {
  db.query("SELECT * FROM users WHERE id = " + req.query.id, (err, rows) => {
    res.send(rows);
  });
});`;

const field =
  "rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-ink transition-colors focus:border-clay/70 focus-visible:outline-2 focus-visible:outline-clay-hi";

export default function ReviewPage() {
  useSeo({
    title: "Code review – GenAI",
    description: "Paste your code and get an AI code review.",
    path: "/app/review",
    noindex: true,
  });

  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("Auto-detect");
  const [focus, setFocus] = useState([]); // nothing selected = review everything
  const [review, setReview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const resultRef = useRef(null);

  const lines = code ? code.split("\n").length : 0;
  const tooLong = code.length > MAX_CHARS || lines > MAX_LINES;
  const canSubmit = code.trim().length >= 5 && !tooLong && !busy;

  useEffect(() => {
    if (review)
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [review]);

  const toggle = (id) =>
    setFocus((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError("");
    setReview("");
    try {
      const { data } = await api.post(
        "/review",
        {
          code,
          language: language === "Auto-detect" ? undefined : language,
          focus: focus.length ? focus : undefined,
        },
        { timeout: 90000 },
      );
      setReview(data.review);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(review);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="mx-auto max-w-[900px]">
      <p className={eyebrow}>AI code review</p>
      <h1 className="mt-2 font-display text-4xl font-medium tracking-tight md:text-5xl">
        Review my code
      </h1>
      <p className="mt-3 mb-6 max-w-[40em] text-mute">
        Paste a function or a file. You get the bugs, the risks and a cleaner
        version, with line numbers. Code only, no chat.
      </p>

      <form onSubmit={submit} className={panel}>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-mute">
            Language
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={field}
            >
              {LANGS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label="What to look for"
          >
            {FOCUS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                aria-pressed={focus.includes(id)}
                className={`cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-clay-hi ${focus.includes(id) ? "border-clay/60 bg-clay/15 text-clay-hi" : "border-white/10 text-mute hover:text-ink"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="mb-3 text-xs text-mute">
          Nothing selected means everything is reviewed.
        </p>

        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          aria-label="Code to review"
          placeholder="Paste your code here…"
          className={`${field} min-h-[280px] w-full resize-y font-mono text-sm leading-relaxed`}
        />

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className={tooLong ? "text-pnk" : "text-mute"}>
            {lines} / {MAX_LINES} lines · {code.length.toLocaleString()} /{" "}
            {MAX_CHARS.toLocaleString()} characters
          </span>
          <span className="flex gap-2">
            <button
              type="button"
              className={`${btnLine} ${sm}`}
              onClick={() => setCode(EXAMPLE)}
            >
              Try an example
            </button>
            {code && (
              <button
                type="button"
                className={`${btnLine} ${sm}`}
                onClick={() => {
                  setCode("");
                  setReview("");
                  setError("");
                }}
              >
                Clear
              </button>
            )}
          </span>
        </div>

        <button className={`${btn} mt-4 w-full`} disabled={!canSubmit}>
          {busy ? "Reviewing…" : "Review my code"}
        </button>
        {busy && (
          <p className="mt-3 text-center text-sm text-mute" role="status">
            Reading your code. This can take up to a minute.
          </p>
        )}
        {error && <p className="mt-3 text-sm text-pnk">{error}</p>}
      </form>

      {review && (
        <section
          ref={resultRef}
          className={`${panel} pop mt-6 scroll-mt-6`}
          aria-label="Review result"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-medium tracking-tight">
              Review
            </h2>
            <button className={`${btnLine} ${sm}`} onClick={copy}>
              {copied ? "Copied" : "Copy review"}
            </button>
          </div>
          <Markdown>{review}</Markdown>
          <p className="mt-5 border-t border-white/10 pt-3 text-xs text-mute/80">
            AI can miss things or be wrong. Treat this as a second opinion and
            test any change.
          </p>
        </section>
      )}
    </div>
  );
}
