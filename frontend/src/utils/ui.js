// Shared Tailwind class strings. Corners are square everywhere (see index.css).
const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

export const glass = "border border-white/15 bg-white/[0.03]";
export const panel =
  "border border-white/15 bg-[#0a0a0a]/90 p-[22px] backdrop-blur-xl";

const btnBase = `px-[22px] py-3 text-[13px] font-semibold uppercase tracking-[0.1em] cursor-pointer transition-all duration-200 disabled:opacity-40 disabled:cursor-wait ${focus}`;
export const btn = `${btnBase} bg-white text-black hover:not-disabled:bg-[#d4d4d4]`;
export const btnLine = `${btnBase} border border-white/30 bg-transparent text-white hover:not-disabled:bg-white hover:not-disabled:text-black`;
export const btnDanger = `${btnBase} bg-pnk text-black hover:not-disabled:bg-white`;
export const sm = "!px-4 !py-2 !text-xs";

export const input = `mb-2.5 w-full border border-white/20 bg-black p-3 text-white placeholder:text-mute/60 transition-colors focus:border-white ${focus}`;
export const hint = "mb-3 text-sm text-mute";
export const eyebrow =
  "font-mono text-[11px] uppercase tracking-[0.2em] text-clay-hi";

export const segBtn = (on) =>
  `flex-1 cursor-pointer border px-1 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition-all duration-200 ${focus} ${
    on
      ? "border-white bg-white text-black"
      : "border-white/20 text-mute hover:border-white/50 hover:text-white"
  }`;
