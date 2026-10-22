import { useEffect, useState } from "react";
import api, { errMsg } from "../api/axios";
import { glass } from "../utils/ui";

const LABEL = {
  summarize: "Summaries",
  flashcards: "Flashcards",
  quiz: "Quizzes",
  chat: "Note chat messages",
  assistant: "AI chat messages",
  code_review: "Code reviews",
  resume: "Resume AI",
};
const TOTALS = [
  ["notes", "Notes", "#d97757"],
  ["flashcards", "Flashcards", "#6a9bcc"],
  ["quizzes", "Quizzes", "#8fa86f"],
];
const H3 = "mb-3 font-display text-[15px] font-semibold text-cya";
const day = (d) =>
  new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" });

export default function StatsPanel() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/stats")
      .then((r) => setStats(r.data.stats))
      .catch((e) => setError(errMsg(e)));
  }, []);

  if (error) return <p className="text-pnk">{error}</p>;
  if (!stats) return <p className="text-mute">Loading stats…</p>;

  const max = Math.max(1, ...stats.last7Days.map((d) => d.requests));
  const week = stats.last7Days.reduce((s, d) => s + d.requests, 0);

  return (
    <div className="pop space-y-6">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        {TOTALS.map(([key, label, color]) => (
          <div
            key={key}
            className={`${glass} border-t-[3px] p-4`}
            style={{ borderTopColor: color }}
          >
            <div className="font-display text-3xl font-bold" style={{ color }}>
              {stats.totals[key]}
            </div>
            <div className="text-sm text-mute">{label}</div>
          </div>
        ))}
      </div>

      <section>
        <h3 className={H3}>AI activity, last 7 days ({week} calls)</h3>
        <div
          role="img"
          aria-label={`AI calls per day: ${stats.last7Days.map((d) => `${day(d.date)} ${d.requests}`).join(", ")}`}
          className="flex h-44 items-stretch gap-2"
        >
          {stats.last7Days.map((d) => (
            <div
              key={d.date}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
            >
              <span className="text-xs text-mute">{d.requests}</span>
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-md bg-[linear-gradient(180deg,#f0a98a,#d97757)]"
                  style={{
                    height: `${Math.max(3, (d.requests / max) * 100)}%`,
                    opacity: d.requests ? 1 : 0.25,
                  }}
                />
              </div>
              <span className="text-xs text-mute">{day(d.date)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <h3 className={H3}>Usage by feature</h3>
          {stats.byFeature.length === 0 && (
            <p className="text-sm text-mute">No AI usage yet.</p>
          )}
          <ul className="space-y-2">
            {stats.byFeature.map((f) => (
              <li
                key={f.feature}
                className={`${glass} !rounded-xl flex items-center justify-between px-3.5 py-2.5`}
              >
                <span>{LABEL[f.feature] || f.feature}</span>
                <span className="text-sm text-mute">
                  {f.requests} calls ·{" "}
                  {(f.inputTokens + f.outputTokens).toLocaleString()} tokens
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className={H3}>Top tags</h3>
          {stats.topTags.length === 0 && (
            <p className="text-sm text-mute">
              Add tags to your notes to see them here.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {stats.topTags.map((t) => (
              <span
                key={t.tag}
                className="rounded-full border border-white/[0.13] bg-white/[0.06] px-3 py-1 text-sm"
              >
                #{t.tag} <span className="text-mute">{t.count}</span>
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
