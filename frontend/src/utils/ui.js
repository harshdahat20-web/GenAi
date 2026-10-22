// Shared Tailwind class strings
const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-hi";

export const glass = "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md";
export const panel = "rounded-3xl border border-white/10 bg-[rgba(32,30,28,0.72)] p-[22px] backdrop-blur-xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.05)]";

const btnBase = `rounded-full px-[22px] py-3 text-[15px] font-semibold cursor-pointer transition-all duration-300 ease-out disabled:opacity-50 disabled:cursor-wait ${focus}`;
export const btn = `${btnBase} bg-clay text-[#1a1918] shadow-[0_10px_30px_-10px_rgba(217,119,87,0.75)] hover:not-disabled:-translate-y-0.5 hover:not-disabled:bg-clay-hi hover:not-disabled:shadow-[0_16px_38px_-10px_rgba(240,169,138,0.8)]`;
export const btnLine = `${btnBase} border border-white/15 bg-white/[0.03] text-ink hover:not-disabled:border-clay/60 hover:not-disabled:bg-white/[0.07]`;
export const sm = "!px-4 !py-2 !text-sm";

export const input = `mb-2.5 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-ink placeholder:text-mute/60 transition-colors focus:border-clay/70 ${focus}`;
export const hint = "mb-3 text-sm text-mute";
export const eyebrow = "font-mono text-[11px] uppercase tracking-[0.2em] text-clay-hi";

export const segBtn = (on) =>
  `flex-1 cursor-pointer rounded-full border px-1 py-2 text-sm font-medium transition-all duration-300 ${focus} ${
    on ? "border-clay/60 bg-clay/15 text-clay-hi" : "border-white/10 text-mute hover:text-ink"
  }`;
