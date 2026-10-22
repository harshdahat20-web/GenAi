const clean = (s) => (s || "").toString().trim();
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Turns a resume into plain text for the AI (and for keyword matching)
const resumeToText = (resume, { includeSummary = true } = {}) => {
  const r = typeof resume.toObject === "function" ? resume.toObject() : resume;
  const parts = [];

  if (includeSummary && clean(r.personal?.summary))
    parts.push(clean(r.personal.summary));
  if (r.skills?.length) parts.push(`Skills: ${r.skills.join(", ")}`);

  (r.experience || []).forEach((e) => {
    const line = [e.role, e.company, ...(e.bullets || [])]
      .map(clean)
      .filter(Boolean)
      .join(". ");
    if (line) parts.push(line);
  });
  (r.projects || []).forEach((p) => {
    const line = [p.name, p.description, ...(p.bullets || [])]
      .map(clean)
      .filter(Boolean)
      .join(". ");
    if (line) parts.push(line);
  });
  (r.education || []).forEach((e) => {
    const line = [e.degree, e.school, e.details]
      .map(clean)
      .filter(Boolean)
      .join(", ");
    if (line) parts.push(line);
  });

  return parts.join("\n").trim();
};

const PREFIXES = [
  "front",
  "back",
  "full",
  "dev",
  "web",
  "data",
  "micro",
  "open",
  "real",
  "cross",
  "multi",
];

// Writing styles of one term: "Front-End", "front end", "frontend" are all the same thing
const spellings = (kw) => {
  const out = new Set([kw]);
  const spaced = kw.replace(/[-\s]+/g, " ");
  out.add(spaced);
  out.add(spaced.replace(/ /g, "-"));
  out.add(spaced.replace(/ /g, ""));
  // a joined word may be written in two parts in the text: "frontend" -> "front end"
  const start = PREFIXES.find(
    (pre) =>
      kw.startsWith(pre) && kw.length - pre.length >= 3 && /^[a-z]+$/.test(kw),
  );
  if (start) {
    out.add(`${start} ${kw.slice(start.length)}`);
    out.add(`${start}-${kw.slice(start.length)}`);
  }
  [...out].forEach((v) => out.add(v.endsWith("s") ? v.slice(0, -1) : `${v}s`));
  return [...out].filter(Boolean);
};

// A very small word-ending remover, so "deploy", "deployed", "deploying" and "deployment" count as one word
const stem = (word) => {
  let w = word;
  for (const end of [
    "ations",
    "ation",
    "ments",
    "ment",
    "ings",
    "ing",
    "ers",
    "er",
    "ed",
    "s",
  ]) {
    if (w.length > end.length + 2 && w.endsWith(end)) {
      w = w.slice(0, -end.length);
      break;
    }
  }
  return /([b-df-hj-np-tv-z])\1$/.test(w) ? w.slice(0, -1) : w; // "debugg" -> "debug"
};

const words = (s) => s.toLowerCase().match(/[a-z0-9]+/g) || [];

// the keyword's words appear one after another in the text, ignoring word endings
const hasStemmed = (text, keyword) => {
  const k = words(keyword).map(stem);
  if (!k.length) return false;
  const t = words(text).map(stem);
  for (let i = 0; i + k.length <= t.length; i++) {
    if (k.every((w, j) => t[i + j] === w)) return true;
  }
  return false;
};

// Is the keyword in the text as a whole term? ("Java" must not match "JavaScript")
const hasTerm = (text, keyword) => {
  const kw = clean(keyword).toLowerCase();
  if (!kw) return false;
  const hay = text.toLowerCase();
  const exact = spellings(kw).some((v) =>
    new RegExp(`(^|[^a-z0-9])${escapeRegex(v)}($|[^a-z0-9])`).test(hay),
  );
  if (exact) return true;
  // plain words only: terms with symbols such as C++ or Node.js must match exactly
  return /^[a-z0-9][a-z0-9 -]*$/.test(kw) && hasStemmed(hay, kw);
};

// Removes a list marker the AI sometimes adds ("- ", "• ", "2. "), but keeps text like "500 users" or "10% faster"
const stripMarker = (s) => s.replace(/^\s*(?:[-•*]|\d+[.)])\s+/, "").trim();

module.exports = { resumeToText, hasTerm, stripMarker };
