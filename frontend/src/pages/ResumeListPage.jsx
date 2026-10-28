import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { errMsg } from "../api/axios";
import { useDialog } from "../components/Dialog";
import useSeo from "../hooks/useSeo";
import { btn, btnLine, eyebrow, glass, sm } from "../utils/ui";

export default function ResumeListPage() {
  useSeo({
    title: "Resume builder – GenAI",
    description: "Build and edit your resumes.",
    path: "/app/resume",
    noindex: true,
  });

  const nav = useNavigate();
  const dialog = useDialog();
  const [resumes, setResumes] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/resumes")
      .then((r) => setResumes(r.data.resumes))
      .catch((e) => {
        setError(errMsg(e));
        setResumes([]);
      });
  }, []);

  const create = async () => {
    setBusy("new");
    setError("");
    try {
      const { data } = await api.post("/resumes", {});
      nav(`/app/resume/${data.resume._id}`);
    } catch (e) {
      setError(errMsg(e));
      setBusy("");
    }
  };

  const copy = async (id) => {
    setBusy(id);
    setError("");
    try {
      const { data } = await api.post(`/resumes/${id}/duplicate`);
      setResumes((l) => [data.resume, ...l]);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy("");
    }
  };

  const remove = async (r) => {
    if (
      !(await dialog.confirm({
        title: "Delete this resume?",
        message: `"${r.title}" will be deleted. This cannot be undone.`,
        confirmText: "Delete",
        danger: true,
      }))
    )
      return;
    setBusy(r._id);
    setError("");
    try {
      await api.delete(`/resumes/${r._id}`);
      setResumes((l) => l.filter((x) => x._id !== r._id));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="mx-auto max-w-[1000px]">
      <p className={eyebrow}>Resume builder</p>
      <div className="mt-2 mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl font-medium tracking-tight md:text-5xl">
          Your resumes
        </h1>
        <button className={btn} onClick={create} disabled={busy === "new"}>
          {busy === "new" ? "Creating…" : "+ New resume"}
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-pnk/40 bg-pnk/10 px-4 py-2 text-pnk">
          {error}
        </p>
      )}
      {resumes === null && <p className="text-mute">Loading…</p>}
      {resumes?.length === 0 && (
        <div className={`${glass} px-6 py-14 text-center`}>
          <p className="font-display text-2xl">No resumes yet</p>
          <p className="mt-2 text-mute">
            Create one, fill in the form, and download it as a PDF.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {resumes?.map((r) => (
          <article
            key={r._id}
            className={`${glass} flex flex-col p-5 transition-colors duration-300 hover:border-clay/40`}
          >
            <Link
              to={`/app/resume/${r._id}`}
              className="rounded-lg focus-visible:outline-2 focus-visible:outline-clay-hi"
            >
              <h2 className="truncate font-display text-2xl font-medium tracking-tight">
                {r.title}
              </h2>
              <p className="mt-1 font-mono text-[11px] tracking-widest text-mute uppercase">
                {r.template} · edited{" "}
                {new Date(r.updatedAt).toLocaleDateString(undefined, {
                  dateStyle: "medium",
                })}
              </p>
            </Link>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                to={`/app/resume/${r._id}`}
                className={`${btn} ${sm} no-underline`}
              >
                Open
              </Link>
              <button
                className={`${btnLine} ${sm}`}
                onClick={() => copy(r._id)}
                disabled={busy === r._id}
              >
                Duplicate
              </button>
              <button
                className={`${btnLine} ${sm} text-pnk`}
                onClick={() => remove(r)}
                disabled={busy === r._id}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
