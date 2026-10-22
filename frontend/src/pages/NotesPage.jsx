import { useCallback, useEffect, useState } from "react";
import api, { errMsg } from "../api/axios";
import { useSpeech, canSpeak } from "../hooks/useSpeech";
import ChatPanel from "../components/ChatPanel";
import useSeo from "../hooks/useSeo";
import {
  btn,
  btnLine,
  glass,
  hint,
  input,
  panel,
  segBtn,
  sm,
} from "../utils/ui";

const TABS = [
  ["sum", "Summary"],
  ["fc", "Cards"],
  ["qz", "Quiz"],
  ["ch", "Chat"],
];
const OUT = "pop mt-3.5 border-t border-white/[0.13] pt-3";
const H3 = "mb-1.5 font-display text-[15px] font-semibold text-cya";

const parseTags = (s) =>
  [
    ...new Set(
      s
        .split(",")
        .map((t) => t.trim().slice(0, 30))
        .filter(Boolean),
    ),
  ].slice(0, 10);

const Chip = ({ on, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    className={`cursor-pointer rounded-full border px-2.5 py-0.5 text-xs focus-visible:outline-2 focus-visible:outline-cya ${on ? "border-cya bg-cya/10 text-cya" : "border-white/[0.13] text-mute hover:border-white/30"}`}
  >
    {children}
  </button>
);

function Flashcards({ cards }) {
  const [flip, setFlip] = useState({});
  return cards.map((c) => (
    <button
      key={c._id}
      onClick={() => setFlip({ ...flip, [c._id]: !flip[c._id] })}
      className={`mt-2.5 block w-full cursor-pointer rounded-xl border p-3.5 text-left text-ink focus-visible:outline-2 focus-visible:outline-cya ${flip[c._id] ? "border-cya bg-cya/[0.08]" : "border-white/[0.13] bg-white/[0.06]"}`}
    >
      <small className="text-amb">
        {flip[c._id] ? "Answer" : "Tap to flip"}
      </small>
      <div>{flip[c._id] ? c.answer : c.question}</div>
    </button>
  ));
}

function QuizRunner({ quiz }) {
  const qs = quiz.questions;
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState(null);

  if (i >= qs.length)
    return (
      <div className={OUT}>
        <h3 className={H3}>Done</h3>
        <p>
          You scored {score} of {qs.length}.
        </p>
        <button
          className={`${btnLine} ${sm} mt-3`}
          onClick={() => {
            setI(0);
            setScore(0);
            setPicked(null);
          }}
        >
          Try again
        </button>
      </div>
    );

  const q = qs[i];
  const pick = (oi) => {
    if (picked !== null) return;
    setPicked(oi);
    if (oi === q.correctIndex) setScore((s) => s + 1);
    setTimeout(() => {
      setI((n) => n + 1);
      setPicked(null);
    }, 1400);
  };

  return (
    <div className={OUT}>
      <p className="text-mute">
        Question {i + 1} of {qs.length}
      </p>
      <p>{q.question}</p>
      {q.options.map((o, oi) => {
        const state =
          picked === null
            ? "border-white/[0.13] bg-white/[0.06] hover:border-cya"
            : oi === q.correctIndex
              ? "border-ok bg-ok/[0.13]"
              : oi === picked
                ? "border-pnk bg-pnk/[0.13]"
                : "border-white/[0.13] bg-white/[0.06]";
        return (
          <button
            key={oi}
            disabled={picked !== null}
            onClick={() => pick(oi)}
            className={`mt-2 block w-full rounded-[10px] border p-[11px] text-left text-ink focus-visible:outline-2 focus-visible:outline-cya ${picked === null ? "cursor-pointer" : ""} ${state}`}
          >
            {o}
          </button>
        );
      })}
      {picked !== null && q.explanation && (
        <p className="mt-2 text-sm text-mute">{q.explanation}</p>
      )}
    </div>
  );
}

function NoteWorkspace({ note, onChange, onEdit, onDelete, onUsage }) {
  const [tab, setTab] = useState("sum");
  const [cards, setCards] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", tags: "" });
  const [stale, setStale] = useState(false); // summary is older than the note text
  const [quizzes, setQuizzes] = useState(null); // saved quizzes of this note
  const { activeId, speak, stop } = useSpeech();

  const loadCards = useCallback(
    () =>
      api
        .get(`/notes/${note._id}/flashcards`)
        .then((r) => setCards(r.data.cards))
        .catch((e) => setError(errMsg(e))),
    [note._id],
  );
  const loadQuizzes = useCallback(
    () =>
      api
        .get(`/notes/${note._id}/quizzes`)
        .then((r) => setQuizzes(r.data.quizzes))
        .catch((e) => setError(errMsg(e))),
    [note._id],
  );
  // Load saved items the first time their tab is opened
  useEffect(() => {
    if (tab === "fc" && cards === null) loadCards();
    if (tab === "qz" && quizzes === null) loadQuizzes();
  }, [tab, cards, quizzes, loadCards, loadQuizzes]);

  const run = async (label, fn) => {
    setError("");
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy("");
    }
  };
  const ai = (kind) =>
    run(kind, async () => {
      const { data } = await api.post(`/ai/notes/${note._id}/${kind}`, {
        count: kind === "quiz" ? 5 : 8,
      });
      if (kind === "summarize") {
        onChange(data.note);
        setStale(false);
      } else if (kind === "flashcards")
        await loadCards(); // shows the old cards plus the new ones
      else {
        setQuiz(data.quiz);
        await loadQuizzes();
      }
      onUsage();
    });
  const clearCards = () => {
    if (!window.confirm("Delete all flashcards of this note?")) return;
    run("clear", async () => {
      await api.delete(`/notes/${note._id}/flashcards`);
      setCards([]);
    });
  };
  const del = () =>
    run("delete", async () => {
      await api.delete(`/notes/${note._id}`);
      onDelete(note._id);
    });

  const startEdit = () => {
    setForm({
      title: note.title,
      content: note.content,
      tags: (note.tags || []).join(", "),
    });
    setError("");
    setEditing(true);
  };
  const saveEdit = (e) => {
    e.preventDefault();
    run("edit", async () => {
      const { data } = await api.patch(`/notes/${note._id}`, {
        title: form.title,
        content: form.content,
        tags: parseTags(form.tags),
      });
      if (note.summary && data.note.content !== note.content) setStale(true);
      onEdit(data.note);
      setEditing(false);
    });
  };

  if (editing)
    return (
      <form onSubmit={saveEdit}>
        <h2 className="mb-3 font-display text-xl font-semibold tracking-tight">
          Edit note
        </h2>
        {error && <p className="mb-3 text-sm text-pnk">{error}</p>}
        <input
          className={input}
          aria-label="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          maxLength={120}
        />
        <textarea
          className={`${input} min-h-[220px] resize-y`}
          aria-label="Content"
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          required
          maxLength={20000}
        />
        <input
          className={input}
          aria-label="Tags"
          placeholder="Tags, comma separated (optional)"
          value={form.tags}
          onChange={(e) => setForm({ ...form, tags: e.target.value })}
          maxLength={200}
        />
        <div className="flex gap-2">
          <button className={`${btn} flex-1`} disabled={busy === "edit"}>
            {busy === "edit" ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            className={btnLine}
            onClick={() => setEditing(false)}
            disabled={busy === "edit"}
          >
            Cancel
          </button>
        </div>
      </form>
    );

  return (
    <>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            {note.title}
          </h2>
          {note.tags?.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {note.tags.map((t) => (
                <span key={t} className="text-xs text-cya">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <button className={`${btnLine} ${sm}`} onClick={startEdit}>
            Edit
          </button>
          <button
            className={`${btnLine} ${sm} text-pnk`}
            onClick={del}
            disabled={busy === "delete"}
          >
            Delete
          </button>
        </div>
      </div>
      <div className="mb-3.5 flex gap-1.5">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            className={segBtn(tab === id)}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {error && <p className="mb-3 text-sm text-pnk">{error}</p>}

      {tab === "sum" && (
        <section>
          <p className="mb-3 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-[10px] border border-white/[0.13] bg-black/30 p-3 text-[15px] text-mute">
            {note.content}
          </p>
          <button
            className={`${btn} w-full`}
            onClick={() => ai("summarize")}
            disabled={!!busy}
          >
            {busy === "summarize" ? "Summarizing…" : "Summarize notes"}
          </button>
          {note.summary && (
            <div className={OUT}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <h3 className={`${H3} !mb-0`}>Summary</h3>
                {canSpeak && (
                  <button
                    className={`${btnLine} ${sm}`}
                    onClick={() =>
                      activeId === "summary"
                        ? stop()
                        : speak(note.summary, "summary")
                    }
                  >
                    {activeId === "summary" ? "■ Stop" : "▶ Read aloud"}
                  </button>
                )}
              </div>
              {stale && (
                <p className="mb-2 rounded-lg border border-amb/40 bg-amb/10 px-3 py-1.5 text-sm text-amb">
                  You changed this note. Tap "Summarize notes" to refresh the
                  summary.
                </p>
              )}
              <p className="whitespace-pre-wrap">{note.summary}</p>
            </div>
          )}
        </section>
      )}
      {tab === "fc" && (
        <section>
          <p className={hint}>Tap a card to flip it. Your cards are saved.</p>
          <button
            className={`${btn} w-full`}
            onClick={() => ai("flashcards")}
            disabled={!!busy}
          >
            {busy === "flashcards" ? "Generating…" : "Make flashcards"}
          </button>
          {cards === null && (
            <p className="mt-3 text-sm text-mute">Loading your saved cards…</p>
          )}
          {cards?.length === 0 && (
            <p className="mt-3 text-sm text-mute">
              No cards yet. Tap "Make flashcards".
            </p>
          )}
          {cards?.length > 0 && (
            <>
              <div className="mt-3.5 flex items-center justify-between gap-3">
                <span className="text-sm text-mute">
                  {cards.length} saved cards
                </span>
                <button
                  className={`${btnLine} ${sm} text-pnk`}
                  onClick={clearCards}
                  disabled={!!busy}
                >
                  Clear all
                </button>
              </div>
              <Flashcards cards={cards} />
            </>
          )}
        </section>
      )}
      {tab === "qz" && (
        <section>
          <p className={hint}>
            Pick the right answer for each question. Your quizzes are saved.
          </p>
          <button
            className={`${btn} w-full`}
            onClick={() => ai("quiz")}
            disabled={!!busy}
          >
            {busy === "quiz" ? "Generating…" : "Make a new quiz"}
          </button>
          {quizzes?.length > 0 && (
            <div className="mt-3.5">
              <h3 className={H3}>Saved quizzes</h3>
              <div className="flex flex-col gap-2">
                {quizzes.map((q) => (
                  <button
                    key={q._id}
                    onClick={() => setQuiz(q)}
                    className={`${glass} cursor-pointer !rounded-xl px-3 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-cya ${quiz?._id === q._id ? "!border-cya !bg-cya/10" : "hover:border-white/30"}`}
                  >
                    {new Date(q.createdAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}{" "}
                    · {q.questions.length} questions
                  </button>
                ))}
              </div>
            </div>
          )}
          {quiz && <QuizRunner key={quiz._id} quiz={quiz} />}
        </section>
      )}
      {tab === "ch" && <ChatPanel noteId={note._id} />}
    </>
  );
}

export default function NotesPage() {
  useSeo({
    title: "Your notes – GenAI",
    description: "Your private study notes.",
    path: "/app",
    noindex: true,
  });
  const [notes, setNotes] = useState([]);
  const [tags, setTags] = useState([]);
  const [sel, setSel] = useState(null);
  const [draft, setDraft] = useState({ title: "", content: "", tags: "" });
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [usage, setUsage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadUsage = useCallback(
    () =>
      api
        .get("/ai/usage")
        .then((r) => setUsage(r.data.usage))
        .catch(() => {}),
    [],
  );
  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  // Notes list: reloads (debounced) when the search, tag filter or refresh counter changes
  useEffect(() => {
    let off = false;
    const timer = setTimeout(() => {
      api
        .get("/notes", {
          params: {
            limit: 50,
            q: query || undefined,
            tag: activeTag || undefined,
          },
        })
        .then((r) => {
          if (!off) setNotes(r.data.notes);
        })
        .catch((e) => {
          if (!off) setError(errMsg(e));
        });
    }, 300);
    return () => {
      off = true;
      clearTimeout(timer);
    };
  }, [query, activeTag, refresh]);

  useEffect(() => {
    api
      .get("/notes/tags")
      .then((r) => setTags(r.data.tags))
      .catch(() => {});
  }, [refresh]);

  const createNote = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const { data } = await api.post("/notes", {
        title: draft.title,
        content: draft.content,
        tags: parseTags(draft.tags),
      });
      setDraft({ title: "", content: "", tags: "" });
      setSel(data.note);
      setRefresh((n) => n + 1);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };
  const onChange = (n) => {
    setSel(n);
    setNotes((list) => list.map((x) => (x._id === n._id ? n : x)));
  };
  const onDelete = () => {
    setSel(null);
    setRefresh((n) => n + 1);
  };
  const onEdit = (n) => {
    onChange(n);
    setRefresh((r) => r + 1);
  }; // also reloads the list and tag chips
  const filtered = query || activeTag;

  return (
    <div className="mx-auto max-w-[1100px]">
      <h1 className="sr-only">Notes</h1>
      {usage && (
        <p className="mb-4 text-[13px] text-mute">
          {usage.requests} AI calls ·{" "}
          {(usage.inputTokens + usage.outputTokens).toLocaleString()} tokens
          used
        </p>
      )}

      {error && (
        <p className="mb-3 rounded-xl border border-pnk/40 bg-pnk/10 px-4 py-2 text-pnk">
          {error}
        </p>
      )}

      <div className="grid items-start gap-4 md:grid-cols-[320px_1fr]">
        <aside className={panel}>
          <h2 className="mb-3 font-display text-base font-semibold">
            New note
          </h2>
          <form onSubmit={createNote}>
            <input
              className={input}
              placeholder="Title, e.g. Photosynthesis"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              required
              maxLength={120}
            />
            <textarea
              className={`${input} min-h-[110px] resize-y`}
              placeholder="Paste your notes here"
              value={draft.content}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              required
              maxLength={20000}
            />
            <input
              className={input}
              placeholder="Tags, comma separated (optional)"
              value={draft.tags}
              onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
              maxLength={200}
            />
            <button className={`${btn} w-full`} disabled={saving}>
              {saving ? "Saving…" : "Save note"}
            </button>
          </form>

          <h2 className="mt-6 mb-3 font-display text-base font-semibold">
            Your notes
          </h2>
          <input
            className={input}
            type="search"
            aria-label="Search notes"
            placeholder="Search notes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={100}
          />
          {tags.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <Chip
                  key={t.tag}
                  on={activeTag === t.tag}
                  onClick={() => setActiveTag(activeTag === t.tag ? "" : t.tag)}
                >
                  #{t.tag} {t.count}
                </Chip>
              ))}
            </div>
          )}
          <div className="flex max-h-[40vh] flex-col gap-2 overflow-y-auto">
            {notes.length === 0 && (
              <p className="text-sm text-mute">
                {filtered
                  ? "No notes match."
                  : "No notes yet. Save your first note above."}{" "}
                {filtered && (
                  <button
                    className="cursor-pointer text-cya underline"
                    onClick={() => {
                      setQuery("");
                      setActiveTag("");
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </p>
            )}
            {notes.map((n) => (
              <button
                key={n._id}
                onClick={() => setSel(n)}
                className={`${glass} cursor-pointer !rounded-xl px-3 py-2.5 text-left text-ink focus-visible:outline-2 focus-visible:outline-cya ${sel?._id === n._id ? "!border-cya !bg-cya/10" : "hover:border-white/30"}`}
              >
                <div>{n.title}</div>
                {n.tags?.length > 0 && (
                  <div className="mt-0.5 truncate text-xs text-cya">
                    {n.tags.map((t) => `#${t}`).join(" ")}
                  </div>
                )}
              </button>
            ))}
          </div>
        </aside>

        <main className={`${panel} min-h-[320px]`}>
          {sel ? (
            <NoteWorkspace
              key={sel._id}
              note={sel}
              onChange={onChange}
              onEdit={onEdit}
              onDelete={onDelete}
              onUsage={loadUsage}
            />
          ) : (
            <div className="grid min-h-[260px] place-items-center text-center text-mute">
              Select a note, or save a new one, to summarize it, make cards,
              take a quiz or chat.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
