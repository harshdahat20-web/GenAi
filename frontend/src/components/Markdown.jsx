import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

// Models sometimes write \( ... \) and \[ ... \]; turn them into $ ... $ and $$ ... $$
const normalizeMath = (s) =>
  s
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => `\n$$\n${m.trim()}\n$$\n`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => `$${m.trim()}$`);

const el =
  (Tag, cls) =>
  ({ node, ...props }) => <Tag className={cls} {...props} />;

function Pre({ node, children }) {
  const ref = useRef(null);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ref.current?.innerText || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: nothing to do */
    }
  };
  return (
    <div className="group relative my-3">
      <button
        type="button"
        onClick={copy}
        className="absolute top-2 right-2 cursor-pointer rounded-md border border-white/15 bg-black/50 px-2 py-1 font-mono text-[11px] text-mute opacity-100 transition-opacity hover:text-ink focus-visible:outline-2 focus-visible:outline-clay-hi md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <pre
        ref={ref}
        className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-sm leading-relaxed [&_code]:!bg-transparent [&_code]:!p-0"
      >
        {children}
      </pre>
    </div>
  );
}

const components = {
  p: el("p", "my-2.5 first:mt-0 last:mb-0"),
  ul: el("ul", "my-2.5 list-disc space-y-1 pl-6 marker:text-clay"),
  ol: el("ol", "my-2.5 list-decimal space-y-1 pl-6 marker:text-clay-hi"),
  li: el("li", "pl-1"),
  h1: el("h3", "mt-4 mb-2 font-display text-2xl font-medium tracking-tight"),
  h2: el("h4", "mt-4 mb-2 font-display text-xl font-medium tracking-tight"),
  h3: el("h5", "mt-3 mb-1.5 font-display text-lg font-medium"),
  blockquote: el("blockquote", "my-3 border-l-2 border-clay/50 pl-4 text-mute"),
  hr: el("hr", "my-4 border-white/10"),
  strong: el("strong", "font-semibold text-ink"),
  a: ({ node, ...props }) => (
    <a
      className="text-clay-hi underline underline-offset-2"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  table: ({ node, ...props }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: el(
    "th",
    "border border-white/15 bg-white/[0.06] px-3 py-1.5 text-left font-medium",
  ),
  td: el("td", "border border-white/10 px-3 py-1.5"),
  code: el("code", "rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.9em]"),
  pre: Pre,
};

export default function Markdown({ children }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={components}
    >
      {normalizeMath(children)}
    </ReactMarkdown>
  );
}
