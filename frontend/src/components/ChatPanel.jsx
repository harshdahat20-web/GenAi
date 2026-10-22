import { useEffect, useRef, useState } from "react";
import api, { errMsg } from "../api/axios";
import { useSpeech, canListen, canSpeak } from "../hooks/useSpeech";
import { btn, btnLine, hint, input } from "../utils/ui";

const MIC_ERRORS = {
  "not-allowed": "Microphone is blocked. Allow it in your browser's site settings.",
  "no-speech": "I didn't hear anything. Try again.",
  "audio-capture": "No microphone found.",
};

export default function ChatPanel({ noteId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [autoRead, setAutoRead] = useState(false);
  const endRef = useRef(null);
  const { activeId, listening, speak, stop, listen, stopListening } = useSpeech();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, busy]);

  const send = async (e) => {
    e.preventDefault();
    const msg = text.trim();
    if (!msg || busy) return;
    const history = messages.slice(-6);
    const replyIndex = messages.length + 1;
    setMessages([...messages, { role: "user", text: msg }]);
    setText(""); setError(""); setBusy(true);
    try {
      const { data } = await api.post(`/ai/notes/${noteId}/chat`, { message: msg, history });
      setMessages((m) => [...m, { role: "assistant", text: data.reply }]);
      if (autoRead) speak(data.reply, replyIndex);
    } catch (err) { setError(errMsg(err)); }
    finally { setBusy(false); }
  };

  const toggleMic = () => {
    if (listening) return stopListening();
    stop();
    setError("");
    listen(
      (t) => setText((prev) => (prev ? prev + " " : "") + t),
      (code) => setError(MIC_ERRORS[code] || "Voice input failed. Try again.")
    );
  };

  const bubble = "max-w-[88%] whitespace-pre-wrap rounded-2xl border px-3.5 py-2.5";
  const bot = "self-start border-white/10 bg-white/[0.04]";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className={`${hint} !mb-0`}>Ask anything about this note.</p>
        {canSpeak && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-mute">
            <input type="checkbox" className="size-4 accent-clay" checked={autoRead} onChange={(e) => { setAutoRead(e.target.checked); if (!e.target.checked) stop(); }} />
            Read answers aloud
          </label>
        )}
      </div>

      <div className="mb-2.5 flex max-h-[44vh] flex-col gap-2 overflow-y-auto">
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className={`${bubble} pop self-end border-clay/40 bg-clay/15`}>{m.text}</div>
          ) : (
            <div key={i} className={`${bubble} ${bot} pop`}>
              {m.text}
              {canSpeak && (
                <button type="button" onClick={() => (activeId === i ? stop() : speak(m.text, i))}
                  className="mt-1.5 block cursor-pointer font-mono text-xs text-clay-hi focus-visible:outline-2 focus-visible:outline-clay-hi">
                  {activeId === i ? "■ Stop" : "▶ Listen"}
                </button>
              )}
            </div>
          )
        )}
        {busy && <div className={`${bubble} ${bot} animate-pulse text-mute`}>Thinking…</div>}
        <div ref={endRef} />
      </div>

      {error && <p className="mb-2 text-sm text-pnk">{error}</p>}

      <form onSubmit={send} className="flex gap-2">
        <input className={`${input} !mb-0`} value={text} onChange={(e) => setText(e.target.value)}
          placeholder={listening ? "Listening…" : "Type or speak your question"} maxLength={1000} aria-label="Your question" />
        {canListen && (
          <button type="button" onClick={toggleMic} aria-label={listening ? "Stop listening" : "Speak your question"} aria-pressed={listening}
            className={`${btnLine} px-4 ${listening ? "!border-pnk text-pnk animate-pulse" : ""}`}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          </button>
        )}
        <button className={`${btn} px-5`} disabled={busy || !text.trim()}>Send</button>
      </form>
    </div>
  );
}
