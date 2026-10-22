import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { errMsg } from "../api/axios";
import { btn, input, panel, segBtn } from "../utils/ui";

export default function AuthModal({ onClose }) {
  const { authenticate } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const body = mode === "login" ? { email: form.email, password: form.password } : form;
      await authenticate(mode, body);
      nav("/app");
    } catch (err) { setError(errMsg(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(14,13,12,0.78)] p-4 backdrop-blur-lg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-label="Log in or sign up" className={`${panel} pop relative w-full max-w-[400px]`}>
        <button type="button" onClick={onClose} aria-label="Close" className="absolute top-3 right-4 cursor-pointer text-2xl leading-none text-mute transition-colors hover:text-ink">×</button>
        <h2 className="font-display text-3xl font-medium tracking-tight">Welcome to <span className="text-clay-hi italic">GenAI</span></h2>
        <p className="mt-1.5 text-mute">Log in or create an account to continue.</p>
        <div className="my-3.5 flex gap-1.5">
          <button type="button" className={segBtn(mode === "login")} onClick={() => setMode("login")}>Log in</button>
          <button type="button" className={segBtn(mode === "register")} onClick={() => setMode("register")}>Sign up</button>
        </div>
        {mode === "register" && <input className={input} placeholder="Name" value={form.name} onChange={set("name")} required minLength={2} autoComplete="name" />}
        <input className={input} type="email" placeholder="Email" value={form.email} onChange={set("email")} required autoComplete="email" />
        <input className={input} type="password" placeholder="Password (min 8 characters)" value={form.password} onChange={set("password")} required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} />
        <button className={`${btn} w-full`} disabled={busy}>{busy ? "Working…" : mode === "login" ? "Log in" : "Create account"}</button>
        {error && <p className="mt-2.5 text-sm text-pnk">{error}</p>}
      </form>
    </div>
  );
}
