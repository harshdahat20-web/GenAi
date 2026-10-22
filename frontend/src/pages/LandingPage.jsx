import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthModal from "../components/AuthModal";
import Logo from "../components/Logo";
import useSeo from "../hooks/useSeo";
import useReveal from "../hooks/useReveal";
import { btn, btnLine, eyebrow, glass, sm } from "../utils/ui";

const FEATURES = [
  ["01", "Summaries", "Long notes shrink to the key points in seconds, so you can revise faster.", "M4 6h16M4 12h16M4 18h10"],
  ["02", "Flashcards", "Turn a note into question-and-answer cards. Tap a card to flip it.", "M3 8h14v12H3zM7 4h14v12"],
  ["03", "Quizzes", "Answer short multiple-choice questions and see your score at the end.", "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"],
  ["04", "Chat with your note", "Ask questions and get answers that come from your own material. Speak them, too.", "M4 5h16v11H9l-5 4z"],
];
const STEPS = [
  ["Paste your notes", "Copy them from anywhere and save them with a title and tags."],
  ["Pick a mode", "Summary, flashcards, quiz or chat. Switch any time."],
  ["Start learning", "Study, test yourself, and ask follow-up questions out loud or in text."],
];
const FAQ = [
  ["Can I use it for free?", "Yes. You can create an account and start using it without paying."],
  ["Are my notes private?", "Every account only sees its own notes. To make summaries, cards and answers, the text of the note you choose is sent to an AI model."],
  ["What can I make from one note?", "A short summary, flashcards, a multiple-choice quiz, and a chat that answers questions using only that note."],
  ["Can it read answers to me?", "Yes. Summaries and chat answers can be read aloud, and you can dictate questions in browsers that support it, such as Chrome and Edge."],
];

const h2 = "font-display text-[clamp(30px,4.6vw,54px)] leading-[1.05] font-medium tracking-[-0.025em]";
const wrap = "mx-auto max-w-[1180px] px-5 md:px-8";

export default function LandingPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const enter = () => (user ? nav("/app") : setOpen(true));

  useSeo({
    title: "GenAI – AI Study Assistant: Summaries, Flashcards & Quizzes",
    description: "Paste your notes and GenAI makes a summary, flashcards, a quiz and a chat that knows your material. Listen with voice. Built for students.",
    path: "/",
  });
  useReveal();

  return (
    <div className="page">
      <header className={`${wrap} flex items-center justify-between py-5`}>
        <a href="/" aria-label="GenAI home" className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-clay-hi"><Logo /></a>
        <nav aria-label="Primary" className="flex items-center gap-7">
          {[["#features", "Features"], ["#how", "How it works"], ["#faq", "FAQ"]].map(([href, label]) => (
            <a key={href} href={href} className="hidden text-sm text-mute transition-colors duration-300 hover:text-ink md:inline">{label}</a>
          ))}
          <button className={`${btn} ${sm}`} onClick={enter}>{user ? "Open app" : "Get started"}</button>
        </nav>
      </header>

      <main id="main">
        <section aria-labelledby="hero-title" className={`${wrap} flex min-h-[80vh] flex-col justify-center pt-12 pb-24`}>
          <p className={`${eyebrow} reveal`}>AI study assistant</p>
          <h1 id="hero-title" style={{ transitionDelay: "80ms" }} className="reveal mt-5 max-w-[11em] font-display text-[clamp(44px,8vw,96px)] leading-[0.98] font-medium tracking-[-0.035em]">
            Turn your notes into something you can <span className="text-clay-hi italic">study.</span>
          </h1>
          <p style={{ transitionDelay: "160ms" }} className="reveal mt-7 max-w-[32em] text-lg text-mute md:text-xl">
            Paste your notes. GenAI gives you a short summary, flashcards, a quiz and a chat that knows your material.
          </p>
          <div style={{ transitionDelay: "240ms" }} className="reveal mt-10 flex flex-wrap items-center gap-3">
            <button className={btn} onClick={enter}>Start for free</button>
            <a className={`${btnLine} no-underline`} href="#how">See how it works</a>
          </div>
          <ul style={{ transitionDelay: "320ms" }} className="reveal mt-14 flex flex-wrap gap-x-8 gap-y-2 font-mono text-xs tracking-[0.18em] text-mute uppercase">
            {["Summaries", "Flashcards", "Quizzes", "Voice"].map((t) => <li key={t} className="flex items-center gap-2"><span aria-hidden="true" className="size-1 rounded-full bg-clay" />{t}</li>)}
          </ul>
        </section>

        <section id="features" aria-labelledby="features-title" className={`${wrap} py-20`}>
          <p className={`${eyebrow} reveal`}>What you get</p>
          <h2 id="features-title" className={`${h2} reveal mt-4 max-w-[16em]`}>Four ways to learn from one set of notes</h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(([n, title, text, d], i) => (
              <article key={title} style={{ transitionDelay: `${i * 90}ms` }} className={`${glass} reveal group p-6 hover:-translate-y-1 hover:border-clay/40 hover:bg-white/[0.07]`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs tracking-widest text-clay-hi">{n}</span>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-mute transition-colors duration-300 group-hover:text-clay-hi" aria-hidden="true"><path d={d} /></svg>
                </div>
                <h3 className="mt-10 mb-2 font-display text-2xl font-medium tracking-tight">{title}</h3>
                <p className="text-[15px] text-mute">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how" aria-labelledby="how-title" className={`${wrap} py-20`}>
          <p className={`${eyebrow} reveal`}>How it works</p>
          <h2 id="how-title" className={`${h2} reveal mt-4`}>Three steps. No setup.</h2>
          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            {STEPS.map(([title, text], i) => (
              <li key={title} style={{ transitionDelay: `${i * 90}ms` }} className={`${glass} reveal p-6`}>
                <span className="font-display text-5xl font-medium text-clay italic">{i + 1}</span>
                <h3 className="mt-4 mb-2 font-display text-2xl font-medium tracking-tight">{title}</h3>
                <p className="text-[15px] text-mute">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="faq" aria-labelledby="faq-title" className={`${wrap} py-20`}>
          <p className={`${eyebrow} reveal`}>Questions</p>
          <h2 id="faq-title" className={`${h2} reveal mt-4`}>Good to know</h2>
          <div className="mt-10 flex max-w-[820px] flex-col gap-3">
            {FAQ.map(([q, a], i) => (
              <details key={q} style={{ transitionDelay: `${i * 70}ms` }} className={`${glass} reveal group px-5 py-4 open:bg-white/[0.07]`}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-xl font-medium tracking-tight [&::-webkit-details-marker]:hidden">
                  {q}<span aria-hidden="true" className="text-2xl text-clay transition-transform duration-300 group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-mute">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="cta-title" className={`${wrap} py-24`}>
          <div className={`${glass} reveal !rounded-[2rem] px-6 py-16 text-center md:py-20`}>
            <h2 id="cta-title" className={`${h2} mx-auto max-w-[14em]`}>Ready to study <span className="text-clay-hi italic">smarter?</span></h2>
            <p className="mx-auto mt-4 mb-8 max-w-[28em] text-mute">Create an account in under a minute and turn your first note into something you can practise.</p>
            <button className={btn} onClick={enter}>Create my account</button>
          </div>
        </section>
      </main>

      <footer className={`${wrap} flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-8 text-sm text-mute`}>
        <Logo />
        <p>© {new Date().getFullYear()} GenAI Study Assistant</p>
      </footer>

      {open && <AuthModal onClose={() => setOpen(false)} />}
    </div>
  );
}
