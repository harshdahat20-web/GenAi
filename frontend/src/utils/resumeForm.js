// Helpers for the resume editor. Kept free of React so they are easy to test.

export const uid = () => Math.random().toString(36).slice(2, 10);

export const BLANK = {
  experience: () => ({
    _k: uid(),
    company: "",
    role: "",
    location: "",
    start: "",
    end: "",
    current: false,
    bullets: [],
  }),
  education: () => ({
    _k: uid(),
    school: "",
    degree: "",
    location: "",
    start: "",
    end: "",
    details: "",
  }),
  projects: () => ({
    _k: uid(),
    name: "",
    link: "",
    description: "",
    bullets: [],
  }),
};

export const MAX_ITEMS = { experience: 10, education: 6, projects: 10 };

export const cleanBullets = (arr = []) =>
  arr.map((b) => b.trim()).filter(Boolean);
export const parseSkills = (text) =>
  text
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

const s = (v) => (typeof v === "string" ? v : "");
const trimmed = (obj) =>
  Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      typeof v === "string" ? v.trim() : v,
    ]),
  );

// Resume from the server -> the shape the editor works with:
// every text field is a string, and every entry has a stable key (_k) so inputs never lose focus
export const fromServer = (r) => ({
  title: s(r.title),
  template: r.template === "modern" ? "modern" : "classic",
  personal: {
    name: s(r.personal?.name),
    email: s(r.personal?.email),
    phone: s(r.personal?.phone),
    location: s(r.personal?.location),
    summary: s(r.personal?.summary),
    links: r.personal?.links || [],
  },
  experience: (r.experience || []).map((e) => ({
    _k: e._id || uid(),
    company: s(e.company),
    role: s(e.role),
    location: s(e.location),
    start: s(e.start),
    end: s(e.end),
    current: !!e.current,
    bullets: e.bullets || [],
  })),
  education: (r.education || []).map((e) => ({
    _k: e._id || uid(),
    school: s(e.school),
    degree: s(e.degree),
    location: s(e.location),
    start: s(e.start),
    end: s(e.end),
    details: s(e.details),
  })),
  projects: (r.projects || []).map((p) => ({
    _k: p._id || uid(),
    name: s(p.name),
    link: s(p.link),
    description: s(p.description),
    bullets: p.bullets || [],
  })),
  skills: r.skills || [],
});

// What we send to the server (blank bullets and links removed, text trimmed, editor-only keys dropped)
export const toPayload = (d) => ({
  title: d.title.trim(),
  template: d.template,
  personal: {
    ...trimmed(d.personal),
    links: d.personal.links.map((l) => l.trim()).filter(Boolean),
  },
  experience: d.experience.map(({ _k, bullets, ...e }) => ({
    ...trimmed(e),
    bullets: cleanBullets(bullets),
  })),
  education: d.education.map(({ _k, ...e }) => trimmed(e)),
  projects: d.projects.map(({ _k, bullets, ...p }) => ({
    ...trimmed(p),
    bullets: cleanBullets(bullets),
  })),
  skills: d.skills.map((x) => x.trim()).filter(Boolean),
});

// A problem we can see before asking the server (so autosave never loops on a request that is sure to fail)
export const issueOf = (d) => {
  if (!d.title.trim()) return "Give the resume a title.";
  const email = d.personal.email.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return "Enter a valid email address.";
  if (d.personal.summary.length > 600)
    return "The summary is longer than 600 characters.";
  if (d.personal.links.map((l) => l.trim()).filter(Boolean).length > 5)
    return "Use at most 5 links.";
  for (const section of ["experience", "projects"]) {
    for (const item of d[section]) {
      const b = cleanBullets(item.bullets);
      if (b.length > 8) return "Use at most 8 bullet points per entry.";
      if (b.some((x) => x.length > 300))
        return "A bullet point is longer than 300 characters. Please shorten it.";
    }
  }
  const skills = d.skills.map((x) => x.trim()).filter(Boolean);
  if (skills.length > 40) return "Use at most 40 skills.";
  if (skills.some((x) => x.length > 40))
    return "A skill is longer than 40 characters.";
  return "";
};
