import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import api, { errMsg } from "../api/axios";
import ResumePreview, { ResumeSheet } from "../components/ResumePreview";
import useSeo from "../hooks/useSeo";
import {
  BLANK,
  MAX_ITEMS,
  cleanBullets,
  fromServer,
  issueOf,
  parseSkills,
  toPayload,
} from "../utils/resumeForm";
import { btn, btnLine, glass, hint, input, segBtn, sm } from "../utils/ui";

const fld = input.replace("mb-2.5 ", ""); // inputs inside a Field get their spacing from the grid
const AI_TIMEOUT = { timeout: 90000 };

const Field = ({ label, className = "", children }) => (
  <label className={`block ${className}`}>
    <span className="mb-1 block text-xs text-mute">{label}</span>
    {children}
  </label>
);

const Card = ({ title, action, children }) => (
  <section className={`${glass} p-4 md:p-5`}>
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="font-display text-xl font-medium tracking-tight">
        {title}
      </h2>
      {action}
    </div>
    {children}
  </section>
);

function ItemTools({ index, count, onMove, onRemove }) {
  const b =
    "cursor-pointer rounded-md px-2 py-1 text-mute transition-colors hover:text-ink disabled:cursor-default disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-clay-hi";
  return (
    <div className="flex items-center">
      <button
        type="button"
        className={b}
        onClick={() => onMove(-1)}
        disabled={index === 0}
        aria-label="Move up"
      >
        ↑
      </button>
      <button
        type="button"
        className={b}
        onClick={() => onMove(1)}
        disabled={index === count - 1}
        aria-label="Move down"
      >
        ↓
      </button>
      <button
        type="button"
        className={`${b} hover:!text-pnk`}
        onClick={onRemove}
        aria-label="Remove this entry"
      >
        ×
      </button>
    </div>
  );
}

const STATUS = {
  saved: ["All changes saved", "text-mute"],
  dirty: ["Unsaved changes…", "text-mute"],
  saving: ["Saving…", "text-mute"],
  error: ["Not saved", "text-pnk"],
};

export default function ResumeEditorPage() {
  const { id } = useParams();
  const [draft, setDraft] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState("saved");
  const [saveError, setSaveError] = useState("");
  const [tab, setTab] = useState("edit"); // phones: edit or preview
  const [skillsText, setSkillsText] = useState("");
  const [notice, setNotice] = useState({}); // messages next to the AI buttons
  const [busy, setBusy] = useState("");
  const [undo, setUndo] = useState({}); // what to restore after an AI change
  const [targetRole, setTargetRole] = useState("");
  const [jobText, setJobText] = useState("");
  const [match, setMatch] = useState(null);

  const draftRef = useRef(null);
  const dirty = useRef(false);
  const version = useRef(0);
  const timer = useRef(null);
  const prevTitle = useRef("");
  draftRef.current = draft;

  useSeo({
    title: `${draft?.title || "Resume"} – GenAI`,
    description: "Edit your resume.",
    path: "/app/resume",
    noindex: true,
  });

  useEffect(() => {
    api
      .get(`/resumes/${id}`)
      .then((r) => {
        const d = fromServer(r.data.resume);
        setDraft(d);
        setSkillsText(d.skills.join(", "));
      })
      .catch((e) => setLoadError(errMsg(e)));
  }, [id]);

  // Saves right away (also used before AI calls, because the server reads the saved resume)
  const save = useCallback(async () => {
    clearTimeout(timer.current);
    const d = draftRef.current;
    if (!d || !dirty.current) return true;
    const issue = issueOf(d);
    if (issue) {
      setStatus("error");
      setSaveError(issue);
      return false;
    }
    const sent = version.current;
    setStatus("saving");
    setSaveError("");
    try {
      await api.patch(`/resumes/${id}`, toPayload(d));
      if (version.current === sent) {
        dirty.current = false;
        setStatus("saved");
      }
      return true;
    } catch (e) {
      setStatus("error");
      setSaveError(errMsg(e));
      return false;
    }
  }, [id]);

  // Every change goes through here: update the draft, then save after a short pause
  const edit = useCallback(
    (fn) => {
      setDraft((d) => fn(d));
      dirty.current = true;
      version.current += 1;
      setStatus("dirty");
      clearTimeout(timer.current);
      timer.current = setTimeout(save, 900);
    },
    [save],
  );

  // save when leaving the page, and warn before closing the tab with unsaved changes
  useEffect(() => {
    const warn = (e) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const before = () => {
      prevTitle.current = document.title;
      document.title = draftRef.current?.title || "Resume";
    };
    const after = () => {
      document.title = prevTitle.current;
    };
    addEventListener("beforeunload", warn);
    addEventListener("beforeprint", before);
    addEventListener("afterprint", after);
    return () => {
      removeEventListener("beforeunload", warn);
      removeEventListener("beforeprint", before);
      removeEventListener("afterprint", after);
      save();
    };
  }, [save]);

  const setTop = (key, value) => edit((d) => ({ ...d, [key]: value }));
  const setPersonal = (key, value) =>
    edit((d) => ({ ...d, personal: { ...d.personal, [key]: value } }));
  const setItem = (section, k, patch) =>
    edit((d) => ({
      ...d,
      [section]: d[section].map((i) => (i._k === k ? { ...i, ...patch } : i)),
    }));
  const addItem = (section) =>
    edit((d) =>
      d[section].length >= MAX_ITEMS[section]
        ? d
        : { ...d, [section]: [...d[section], BLANK[section]()] },
    );
  const removeItem = (section, k) =>
    edit((d) => ({ ...d, [section]: d[section].filter((i) => i._k !== k) }));
  const moveItem = (section, k, dir) =>
    edit((d) => {
      const list = [...d[section]];
      const from = list.findIndex((i) => i._k === k);
      const to = from + dir;
      if (to < 0 || to >= list.length) return d;
      [list[from], list[to]] = [list[to], list[from]];
      return { ...d, [section]: list };
    });
  const say = (key, text) => setNotice((n) => ({ ...n, [key]: text }));

  const improve = async (section, item) => {
    const bullets = cleanBullets(item.bullets).slice(0, 8);
    if (!bullets.length)
      return say(item._k, "Write at least one bullet point first.");
    setBusy(item._k);
    say(item._k, "");
    try {
      const { data } = await api.post(
        "/resumes/improve",
        {
          bullets,
          role: item.role || item.name || undefined,
          company: item.company || undefined,
        },
        AI_TIMEOUT,
      );
      setUndo((u) => ({ ...u, [item._k]: item.bullets }));
      setItem(section, item._k, { bullets: data.bullets });
      say(
        item._k,
        "Done. Check the numbers in [brackets] and fill in the real ones.",
      );
    } catch (e) {
      say(item._k, errMsg(e));
    } finally {
      setBusy("");
    }
  };
  const undoImprove = (section, item) => {
    setItem(section, item._k, { bullets: undo[item._k] });
    setUndo((u) => {
      const n = { ...u };
      delete n[item._k];
      return n;
    });
    say(item._k, "");
  };

  const writeSummary = async () => {
    setBusy("summary");
    say("summary", "");
    try {
      if (!(await save())) {
        say(
          "summary",
          "Fix the problem shown at the top first, then try again.",
        );
        return;
      }
      const { data } = await api.post(
        `/resumes/${id}/summary`,
        { targetRole: targetRole.trim() || undefined },
        AI_TIMEOUT,
      );
      setUndo((u) => ({ ...u, summary: draftRef.current.personal.summary }));
      setPersonal("summary", data.summary);
      say(
        "summary",
        "Done. Read it and edit anything that is not true for you.",
      );
    } catch (e) {
      say("summary", errMsg(e));
    } finally {
      setBusy("");
    }
  };
  const undoSummary = () => {
    setPersonal("summary", undo.summary ?? "");
    setUndo((u) => {
      const n = { ...u };
      delete n.summary;
      return n;
    });
    say("summary", "");
  };

  const runMatch = async () => {
    const jd = jobText.trim();
    if (jd.length < 50)
      return say(
        "match",
        "Paste the full job description (at least 50 characters).",
      );
    if (jd.length > 6000)
      return say(
        "match",
        "The job description is too long (max 6000 characters).",
      );
    setBusy("match");
    say("match", "");
    setMatch(null);
    try {
      if (!(await save())) {
        say("match", "Fix the problem shown at the top first, then try again.");
        return;
      }
      const { data } = await api.post(
        `/resumes/${id}/match`,
        { jobDescription: jd },
        AI_TIMEOUT,
      );
      setMatch(data);
    } catch (e) {
      say("match", errMsg(e));
    } finally {
      setBusy("");
    }
  };

  if (loadError)
    return (
      <div className="mx-auto max-w-[600px] text-center">
        <p className="text-pnk">{loadError}</p>
        <Link
          to="/app/resume"
          className={`${btn} mt-5 inline-block no-underline`}
        >
          Back to your resumes
        </Link>
      </div>
    );
  if (!draft) return <p className="text-mute">Loading…</p>;

  const [statusText, statusColor] = STATUS[status];
  const printRoot = document.getElementById("print-root");

  const bulletsField = (section, item) => (
    <div className="mt-3">
      <Field label="Bullet points (one per line, up to 8)">
        <textarea
          className={`${fld} min-h-[110px] resize-y`}
          value={item.bullets.join("\n")}
          onChange={(e) =>
            setItem(section, item._k, { bullets: e.target.value.split("\n") })
          }
        />
      </Field>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={`${btnLine} ${sm}`}
          onClick={() => improve(section, item)}
          disabled={busy === item._k}
        >
          {busy === item._k ? "Improving…" : "Improve with AI"}
        </button>
        {undo[item._k] && (
          <button
            type="button"
            className="cursor-pointer text-sm text-clay-hi underline"
            onClick={() => undoImprove(section, item)}
          >
            Undo
          </button>
        )}
        {notice[item._k] && (
          <span className="text-sm text-mute" role="status">
            {notice[item._k]}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link to="/app/resume" className="text-sm text-mute hover:text-ink">
          ← All resumes
        </Link>
        <span className={`ml-auto text-sm ${statusColor}`} role="status">
          {statusText}
          {status === "error" && saveError ? `: ${saveError}` : ""}
        </span>
        <button className={`${btn} ${sm}`} onClick={() => window.print()}>
          Download PDF
        </button>
      </div>

      <div
        className="mb-4 flex gap-1.5 lg:hidden"
        role="group"
        aria-label="View"
      >
        <button
          className={segBtn(tab === "edit")}
          onClick={() => setTab("edit")}
          aria-pressed={tab === "edit"}
        >
          Edit
        </button>
        <button
          className={segBtn(tab === "preview")}
          onClick={() => setTab("preview")}
          aria-pressed={tab === "preview"}
        >
          Preview
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div
          className={`${tab === "edit" ? "flex" : "hidden"} min-w-0 flex-col gap-4 lg:flex`}
        >
          <Card title="Resume">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <Field label="Title (only you see this, and it names the PDF)">
                <input
                  className={fld}
                  value={draft.title}
                  maxLength={80}
                  onChange={(e) => setTop("title", e.target.value)}
                />
              </Field>
              <div className="flex gap-1.5" role="group" aria-label="Template">
                <button
                  className={segBtn(draft.template === "classic")}
                  onClick={() => setTop("template", "classic")}
                  aria-pressed={draft.template === "classic"}
                >
                  Classic
                </button>
                <button
                  className={segBtn(draft.template === "modern")}
                  onClick={() => setTop("template", "modern")}
                  aria-pressed={draft.template === "modern"}
                >
                  Modern
                </button>
              </div>
            </div>
          </Card>

          <Card title="About you">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name">
                <input
                  className={fld}
                  value={draft.personal.name}
                  maxLength={80}
                  autoComplete="name"
                  onChange={(e) => setPersonal("name", e.target.value)}
                />
              </Field>
              <Field label="Email">
                <input
                  className={fld}
                  type="email"
                  value={draft.personal.email}
                  maxLength={120}
                  autoComplete="email"
                  onChange={(e) => setPersonal("email", e.target.value)}
                />
              </Field>
              <Field label="Phone">
                <input
                  className={fld}
                  value={draft.personal.phone}
                  maxLength={30}
                  autoComplete="tel"
                  onChange={(e) => setPersonal("phone", e.target.value)}
                />
              </Field>
              <Field label="Location">
                <input
                  className={fld}
                  value={draft.personal.location}
                  maxLength={80}
                  onChange={(e) => setPersonal("location", e.target.value)}
                />
              </Field>
              <Field
                label="Links (one per line, up to 5)"
                className="sm:col-span-2"
              >
                <textarea
                  className={`${fld} min-h-[72px] resize-y`}
                  value={draft.personal.links.join("\n")}
                  placeholder="github.com/you&#10;linkedin.com/in/you"
                  onChange={(e) =>
                    setPersonal("links", e.target.value.split("\n"))
                  }
                />
              </Field>
            </div>
          </Card>

          <Card title="Summary">
            <Field
              label={`Two or three sentences about you (${draft.personal.summary.length}/600)`}
            >
              <textarea
                className={`${fld} min-h-[96px] resize-y`}
                value={draft.personal.summary}
                maxLength={600}
                onChange={(e) => setPersonal("summary", e.target.value)}
              />
            </Field>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                className={`${fld} !w-48`}
                placeholder="Target role (optional)"
                aria-label="Target role"
                value={targetRole}
                maxLength={80}
                onChange={(e) => setTargetRole(e.target.value)}
              />
              <button
                type="button"
                className={`${btnLine} ${sm}`}
                onClick={writeSummary}
                disabled={busy === "summary"}
              >
                {busy === "summary" ? "Writing…" : "Write with AI"}
              </button>
              {undo.summary !== undefined && (
                <button
                  type="button"
                  className="cursor-pointer text-sm text-clay-hi underline"
                  onClick={undoSummary}
                >
                  Undo
                </button>
              )}
            </div>
            {notice.summary && (
              <p className="mt-2 text-sm text-mute" role="status">
                {notice.summary}
              </p>
            )}
          </Card>

          <Card
            title="Experience"
            action={
              draft.experience.length < MAX_ITEMS.experience && (
                <button
                  type="button"
                  className={`${btnLine} ${sm}`}
                  onClick={() => addItem("experience")}
                >
                  + Add
                </button>
              )
            }
          >
            {draft.experience.length === 0 && (
              <p className={hint}>
                Jobs, internships or volunteering. Tap "+ Add".
              </p>
            )}
            <div className="flex flex-col gap-4">
              {draft.experience.map((e, i) => (
                <div
                  key={e._k}
                  className="rounded-xl border border-white/10 bg-black/20 p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-[11px] tracking-widest text-mute uppercase">
                      Entry {i + 1}
                    </span>
                    <ItemTools
                      index={i}
                      count={draft.experience.length}
                      onMove={(dir) => moveItem("experience", e._k, dir)}
                      onRemove={() => removeItem("experience", e._k)}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Role">
                      <input
                        className={fld}
                        value={e.role}
                        maxLength={80}
                        onChange={(ev) =>
                          setItem("experience", e._k, { role: ev.target.value })
                        }
                      />
                    </Field>
                    <Field label="Company">
                      <input
                        className={fld}
                        value={e.company}
                        maxLength={80}
                        onChange={(ev) =>
                          setItem("experience", e._k, {
                            company: ev.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Location">
                      <input
                        className={fld}
                        value={e.location}
                        maxLength={80}
                        onChange={(ev) =>
                          setItem("experience", e._k, {
                            location: ev.target.value,
                          })
                        }
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Start">
                        <input
                          className={fld}
                          value={e.start}
                          maxLength={20}
                          placeholder="Jun 2024"
                          onChange={(ev) =>
                            setItem("experience", e._k, {
                              start: ev.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="End">
                        <input
                          className={`${fld} disabled:opacity-40`}
                          value={e.end}
                          maxLength={20}
                          placeholder="Aug 2024"
                          disabled={e.current}
                          onChange={(ev) =>
                            setItem("experience", e._k, {
                              end: ev.target.value,
                            })
                          }
                        />
                      </Field>
                    </div>
                  </div>
                  <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-mute">
                    <input
                      type="checkbox"
                      className="size-4 accent-clay"
                      checked={e.current}
                      onChange={(ev) =>
                        setItem("experience", e._k, {
                          current: ev.target.checked,
                        })
                      }
                    />
                    I currently work here
                  </label>
                  {bulletsField("experience", e)}
                </div>
              ))}
            </div>
          </Card>

          <Card
            title="Projects"
            action={
              draft.projects.length < MAX_ITEMS.projects && (
                <button
                  type="button"
                  className={`${btnLine} ${sm}`}
                  onClick={() => addItem("projects")}
                >
                  + Add
                </button>
              )
            }
          >
            {draft.projects.length === 0 && (
              <p className={hint}>
                Projects you built, which matter a lot when you have little work
                experience.
              </p>
            )}
            <div className="flex flex-col gap-4">
              {draft.projects.map((p, i) => (
                <div
                  key={p._k}
                  className="rounded-xl border border-white/10 bg-black/20 p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-[11px] tracking-widest text-mute uppercase">
                      Project {i + 1}
                    </span>
                    <ItemTools
                      index={i}
                      count={draft.projects.length}
                      onMove={(dir) => moveItem("projects", p._k, dir)}
                      onRemove={() => removeItem("projects", p._k)}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Name">
                      <input
                        className={fld}
                        value={p.name}
                        maxLength={80}
                        onChange={(ev) =>
                          setItem("projects", p._k, { name: ev.target.value })
                        }
                      />
                    </Field>
                    <Field label="Link">
                      <input
                        className={fld}
                        value={p.link}
                        maxLength={200}
                        onChange={(ev) =>
                          setItem("projects", p._k, { link: ev.target.value })
                        }
                      />
                    </Field>
                    <Field
                      label="One-line description"
                      className="sm:col-span-2"
                    >
                      <input
                        className={fld}
                        value={p.description}
                        maxLength={300}
                        onChange={(ev) =>
                          setItem("projects", p._k, {
                            description: ev.target.value,
                          })
                        }
                      />
                    </Field>
                  </div>
                  {bulletsField("projects", p)}
                </div>
              ))}
            </div>
          </Card>

          <Card
            title="Education"
            action={
              draft.education.length < MAX_ITEMS.education && (
                <button
                  type="button"
                  className={`${btnLine} ${sm}`}
                  onClick={() => addItem("education")}
                >
                  + Add
                </button>
              )
            }
          >
            {draft.education.length === 0 && (
              <p className={hint}>
                Your degree, school or course. Tap "+ Add".
              </p>
            )}
            <div className="flex flex-col gap-4">
              {draft.education.map((e, i) => (
                <div
                  key={e._k}
                  className="rounded-xl border border-white/10 bg-black/20 p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-[11px] tracking-widest text-mute uppercase">
                      Entry {i + 1}
                    </span>
                    <ItemTools
                      index={i}
                      count={draft.education.length}
                      onMove={(dir) => moveItem("education", e._k, dir)}
                      onRemove={() => removeItem("education", e._k)}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Degree or course">
                      <input
                        className={fld}
                        value={e.degree}
                        maxLength={100}
                        onChange={(ev) =>
                          setItem("education", e._k, {
                            degree: ev.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="School">
                      <input
                        className={fld}
                        value={e.school}
                        maxLength={100}
                        onChange={(ev) =>
                          setItem("education", e._k, {
                            school: ev.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Location">
                      <input
                        className={fld}
                        value={e.location}
                        maxLength={80}
                        onChange={(ev) =>
                          setItem("education", e._k, {
                            location: ev.target.value,
                          })
                        }
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Start">
                        <input
                          className={fld}
                          value={e.start}
                          maxLength={20}
                          onChange={(ev) =>
                            setItem("education", e._k, {
                              start: ev.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="End">
                        <input
                          className={fld}
                          value={e.end}
                          maxLength={20}
                          onChange={(ev) =>
                            setItem("education", e._k, { end: ev.target.value })
                          }
                        />
                      </Field>
                    </div>
                    <Field
                      label="Details (grade, achievements)"
                      className="sm:col-span-2"
                    >
                      <input
                        className={fld}
                        value={e.details}
                        maxLength={300}
                        onChange={(ev) =>
                          setItem("education", e._k, {
                            details: ev.target.value,
                          })
                        }
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Skills">
            <Field label="Separate with commas (up to 40)">
              <input
                className={fld}
                value={skillsText}
                maxLength={1200}
                placeholder="React, Node.js, SQL"
                onChange={(e) => {
                  setSkillsText(e.target.value);
                  edit((d) => ({ ...d, skills: parseSkills(e.target.value) }));
                }}
              />
            </Field>
          </Card>

          <Card title="Match a job">
            <p className={hint}>
              Paste a job description. You get a keyword match score and the
              keywords your resume is missing. Only add the ones that are true
              for you.
            </p>
            <textarea
              className={`${fld} min-h-[120px] w-full resize-y`}
              aria-label="Job description"
              value={jobText}
              maxLength={6000}
              placeholder="Paste the job description here…"
              onChange={(e) => setJobText(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className={`${btn} ${sm}`}
                onClick={runMatch}
                disabled={busy === "match"}
              >
                {busy === "match" ? "Checking…" : "Check match"}
              </button>
              <span className="text-xs text-mute">{jobText.length} / 6000</span>
              {notice.match && (
                <span className="text-sm text-pnk" role="status">
                  {notice.match}
                </span>
              )}
            </div>

            {match && (
              <div className="pop mt-4 border-t border-white/10 pt-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-display text-3xl font-medium">
                    {match.score}%
                  </p>
                  <p
                    className={`text-sm ${match.score >= 70 ? "text-ok" : match.score >= 40 ? "text-amb" : "text-pnk"}`}
                  >
                    {match.score >= 70
                      ? "Strong keyword match"
                      : match.score >= 40
                        ? "Partial keyword match"
                        : "Low keyword match"}
                  </p>
                </div>
                <div
                  className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"
                  role="progressbar"
                  aria-label="Keyword match"
                  aria-valuenow={match.score}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-clay transition-all duration-700"
                    style={{ width: `${match.score}%` }}
                  />
                </div>
                {match.resumeChars < 200 && (
                  <p className="mt-3 rounded-lg border border-amb/40 bg-amb/10 px-3 py-2 text-sm text-amb">
                    Your resume has very little text yet, so most keywords
                    cannot match. Add experience, projects and skills first,
                    then check again.
                  </p>
                )}
                {match.matched.length > 0 && (
                  <>
                    <p className="mt-4 mb-1.5 text-xs text-mute">
                      In your resume
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {match.matched.map((k) => (
                        <span
                          key={k}
                          className="rounded-full border border-ok/40 bg-ok/10 px-2.5 py-0.5 text-sm text-ok"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </>
                )}
                {match.missing.length > 0 && (
                  <>
                    <p className="mt-4 mb-1.5 text-xs text-mute">Not found</p>
                    <div className="flex flex-wrap gap-1.5">
                      {match.missing.map((k) => (
                        <span
                          key={k}
                          className="rounded-full border border-clay/40 bg-clay/10 px-2.5 py-0.5 text-sm text-clay-hi"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </>
                )}
                {match.suggestions.length > 0 && (
                  <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-mute">
                    {match.suggestions.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                )}
                <p className="mt-4 text-xs text-mute/80">
                  This counts keywords. It is a useful hint, not the score a
                  real hiring system gives.
                </p>
              </div>
            )}
          </Card>
        </div>

        <div
          className={`${tab === "preview" ? "block" : "hidden"} min-w-0 lg:sticky lg:top-6 lg:block lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto`}
        >
          <ResumePreview resume={draft} />
          <p className="mt-3 text-xs text-mute">
            To get a PDF, tap "Download PDF", choose "Save as PDF" as the
            printer and turn off "Headers and footers".
          </p>
        </div>
      </div>

      {printRoot &&
        createPortal(<ResumeSheet resume={draft} fluid />, printRoot)}
    </div>
  );
}
