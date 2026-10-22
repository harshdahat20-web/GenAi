import { useEffect, useRef, useState } from "react";
import api, { errMsg } from "../api/axios";
import Markdown from "../components/Markdown";
import useSeo from "../hooks/useSeo";
import { useSpeech, canListen, canSpeak } from "../hooks/useSpeech";
import { btn, btnLine, eyebrow, panel, segBtn } from "../utils/ui";

const IDEAS = {
  chat: [
    "Explain photosynthesis like I'm 12",
    "Make me a 5-day plan to learn Python basics",
    "What is the difference between TCP and UDP?",
  ],
  math: [
    "Solve 2x + 5 = 17",
    "Find the derivative of x^3 · sin(x)",
    "A train goes 120 km in 1.5 hours. What is its speed in m/s?",
  ],
};

const MIC_ERRORS = {
  "not-allowed":
    "Microphone is blocked. Allow it in your browser's site settings.",
  "no-speech": "I didn't hear anything. Try again.",
  "audio-capture": "No microphone found.",
};

export default function ChatPage() {
  useSeo({
    title: "AI Chat – GenAI",
    description: "Chat with the AI assistant and solve maths problems.",
    path: "/app/chat",
    noindex: true,
  });

  const [chats, setChats] = useState([]);
  const [activeId, setActiveId] = useState(null); // null = a new chat that is not saved yet
  const [messages, setMessages] = useState([]);
  const [mode, setMode] = useState("chat");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [error, setError] = useState("");
  const [showList, setShowList] = useState(true); // on phones: chat list or conversation
  const scrollRef = useRef(null);
  const openRef = useRef(null); // the chat the user is looking at right now (ignores late answers for another chat)
  const {
    activeId: speakingId,
    listening,
    speak,
    stop,
    listen,
    stopListening,
  } = useSpeech();

  useEffect(() => {
    api
      .get("/chats")
      .then((r) => setChats(r.data.chats))
      .catch((e) => setError(errMsg(e)));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  const openChat = async (id) => {
    stop();
    setError("");
    setShowList(false);
    openRef.current = id;
    setActiveId(id);
    setMessages([]);
    setLoadingChat(true);
    try {
      const { data } = await api.get(`/chats/${id}`);
      if (openRef.current !== id) return;
      setMessages(data.chat.messages);
      setMode(data.chat.mode);
    } catch (e) {
      if (openRef.current === id) setError(errMsg(e));
    } finally {
      if (openRef.current === id) setLoadingChat(false);
    }
  };

  const newChat = () => {
    stop();
    setError("");
    setShowList(false);
    openRef.current = null;
    setActiveId(null);
    setMessages([]);
    setMode("chat");
  };

  const changeMode = async (m) => {
    setMode(m);
    if (!activeId) return;
    try {
      await api.patch(`/chats/${activeId}`, { mode: m });
      setChats((l) =>
        l.map((c) => (c._id === activeId ? { ...c, mode: m } : c)),
      );
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const send = async (e) => {
    e?.preventDefault();
    const msg = text.trim();
    if (!msg || sending) return;
    setError("");
    setSending(true);
    setText("");
    const temp = { _id: `tmp-${Date.now()}`, role: "user", text: msg };
    setMessages((m) => [...m, temp]);
    let id = activeId;
    try {
      if (!id) {
        // first message of a new chat: create it now
        const { data } = await api.post("/chats", { mode });
        id = data.chat._id;
        openRef.current = id;
        setActiveId(id);
        setChats((l) => [
          {
            _id: id,
            title: data.chat.title,
            mode,
            messageCount: 0,
            updatedAt: data.chat.updatedAt,
          },
          ...l,
        ]);
      }
      const { data } = await api.post(`/chats/${id}/messages`, {
        message: msg,
      });
      if (openRef.current === id)
        setMessages((m) => [
          ...m.filter((x) => x._id !== temp._id),
          ...data.messages,
        ]);
      setChats((l) => {
        const cur = l.find((c) => c._id === id);
        return [
          {
            ...cur,
            title: data.title,
            messageCount: (cur?.messageCount || 0) + 2,
            updatedAt: new Date().toISOString(),
          },
          ...l.filter((c) => c._id !== id),
        ];
      });
    } catch (err) {
      if (openRef.current === id || !id) {
        setMessages((m) => m.filter((x) => x._id !== temp._id));
        setText(msg);
      }
      setError(errMsg(err));
    } finally {
      setSending(false);
    }
  };

  const rename = async (chat) => {
    const title = window.prompt("Rename chat", chat.title)?.trim();
    if (!title || title === chat.title) return;
    try {
      await api.patch(`/chats/${chat._id}`, { title });
      setChats((l) => l.map((c) => (c._id === chat._id ? { ...c, title } : c)));
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const remove = async (chat) => {
    if (!window.confirm(`Delete "${chat.title}"?`)) return;
    try {
      await api.delete(`/chats/${chat._id}`);
      setChats((l) => l.filter((c) => c._id !== chat._id));
      if (chat._id === activeId) {
        stop();
        openRef.current = null;
        setActiveId(null);
        setMessages([]);
        setShowList(true);
      }
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const toggleMic = () => {
    if (listening) return stopListening();
    stop();
    setError("");
    listen(
      (t) => setText((prev) => (prev ? prev + " " : "") + t),
      (code) => setError(MIC_ERRORS[code] || "Voice input failed. Try again."),
    );
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const title = chats.find((c) => c._id === activeId)?.title || "New chat";
  const empty = messages.length === 0 && !loadingChat;
  const small =
    "cursor-pointer rounded-md px-1.5 py-0.5 text-mute transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-clay-hi";

  return (
    <div className="mx-auto flex h-[calc(100dvh-13rem)] max-w-[1180px] gap-4 md:h-[calc(100dvh-5.5rem)]">
      {/* chat list */}
      <aside
        className={`${panel} !p-3 ${showList ? "flex" : "hidden"} w-full flex-col md:flex md:w-72 md:shrink-0`}
      >
        <button className={`${btn} w-full`} onClick={newChat}>
          + New chat
        </button>
        <div className="mt-3 flex-1 overflow-y-auto">
          {chats.length === 0 && (
            <p className="px-2 py-3 text-sm text-mute">
              No chats yet. Start a new one.
            </p>
          )}
          {chats.map((c) => (
            <div
              key={c._id}
              className={`group flex items-center rounded-xl border pr-1 transition-colors ${c._id === activeId ? "border-clay/40 bg-clay/15" : "border-transparent hover:bg-white/[0.05]"}`}
            >
              <button
                onClick={() => openChat(c._id)}
                className="min-w-0 flex-1 cursor-pointer px-3 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-clay-hi"
              >
                <span className="block truncate text-[15px]">{c.title}</span>
                <span className="font-mono text-[10px] tracking-widest text-mute uppercase">
                  {c.mode === "math" ? "Maths" : "Chat"}
                </span>
              </button>
              <span className="flex opacity-100 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                <button
                  className={small}
                  onClick={() => rename(c)}
                  aria-label={`Rename ${c.title}`}
                >
                  ✎
                </button>
                <button
                  className={`${small} hover:!text-pnk`}
                  onClick={() => remove(c)}
                  aria-label={`Delete ${c.title}`}
                >
                  ×
                </button>
              </span>
            </div>
          ))}
        </div>
      </aside>

      {/* conversation */}
      <section
        className={`${panel} !p-0 ${showList ? "hidden" : "flex"} min-w-0 flex-1 flex-col md:flex`}
        aria-label="Conversation"
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <button
            className="cursor-pointer text-mute hover:text-ink md:hidden"
            onClick={() => setShowList(true)}
            aria-label="Back to chats"
          >
            ←
          </button>
          <h1 className="min-w-0 flex-1 truncate font-display text-xl font-medium tracking-tight">
            {title}
          </h1>
          <div className="flex w-44 gap-1" role="group" aria-label="Mode">
            <button
              className={segBtn(mode === "chat")}
              onClick={() => changeMode("chat")}
              aria-pressed={mode === "chat"}
            >
              Chat
            </button>
            <button
              className={segBtn(mode === "math")}
              onClick={() => changeMode("math")}
              aria-pressed={mode === "math"}
            >
              Maths
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5">
          {loadingChat && <p className="text-sm text-mute">Loading chat…</p>}
          {empty && (
            <div className="mx-auto mt-6 max-w-[34rem] text-center md:mt-14">
              <p className={eyebrow}>
                {mode === "math" ? "Maths tutor" : "AI assistant"}
              </p>
              <h2 className="mt-3 font-display text-4xl font-medium tracking-tight md:text-5xl">
                {mode === "math"
                  ? "What shall we solve?"
                  : "What can I help with?"}
              </h2>
              <p className="mt-3 text-mute">
                {mode === "math"
                  ? "You get the steps, not just the answer."
                  : "Ask anything: homework, ideas, explanations."}
              </p>
              <div className="mt-7 flex flex-col gap-2">
                {IDEAS[mode].map((idea) => (
                  <button
                    key={idea}
                    onClick={() => setText(idea)}
                    className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-[15px] text-mute transition-all duration-300 hover:border-clay/40 hover:text-ink focus-visible:outline-2 focus-visible:outline-clay-hi"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mx-auto flex max-w-[46rem] flex-col gap-5">
            {messages.map((m) =>
              m.role === "user" ? (
                <div
                  key={m._id}
                  className="pop max-w-[85%] self-end whitespace-pre-wrap rounded-2xl border border-clay/30 bg-clay/15 px-4 py-2.5"
                >
                  {m.text}
                </div>
              ) : (
                <div key={m._id} className="pop">
                  <Markdown>{m.text}</Markdown>
                  {canSpeak && (
                    <button
                      type="button"
                      onClick={() =>
                        speakingId === m._id ? stop() : speak(m.text, m._id)
                      }
                      className="mt-1 cursor-pointer font-mono text-xs text-clay-hi focus-visible:outline-2 focus-visible:outline-clay-hi"
                    >
                      {speakingId === m._id ? "■ Stop" : "▶ Listen"}
                    </button>
                  )}
                </div>
              ),
            )}
            {sending && (
              <div
                className="flex gap-1.5 py-2"
                role="status"
                aria-label="Thinking"
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="size-2 animate-pulse rounded-full bg-clay"
                    style={{ animationDelay: `${i * 160}ms` }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-white/10 p-3 md:p-4">
          {error && (
            <p className="mx-auto mb-2 max-w-[46rem] text-sm text-pnk">
              {error}
            </p>
          )}
          <form
            onSubmit={send}
            className="mx-auto flex max-w-[46rem] items-end gap-2"
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              maxLength={4000}
              aria-label="Your message"
              placeholder={
                listening
                  ? "Listening…"
                  : mode === "math"
                    ? "Type a maths problem…"
                    : "Message the AI…"
              }
              className="field-sizing-content max-h-40 min-h-12 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-ink placeholder:text-mute/60 transition-colors focus:border-clay/70 focus-visible:outline-2 focus-visible:outline-clay-hi"
            />
            {canListen && (
              <button
                type="button"
                onClick={toggleMic}
                aria-pressed={listening}
                aria-label={listening ? "Stop listening" : "Speak your message"}
                className={`${btnLine} !h-12 !px-4 ${listening ? "!border-pnk text-pnk animate-pulse" : ""}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                </svg>
              </button>
            )}
            <button
              className={`${btn} !h-12`}
              disabled={sending || !text.trim()}
            >
              Send
            </button>
          </form>
          <p className="mx-auto mt-2 hidden max-w-[46rem] text-xs text-mute/70 md:block">
            Enter to send · Shift+Enter for a new line · AI can make mistakes,
            so double-check important answers.
          </p>
        </div>
      </section>
    </div>
  );
}
