import { useEffect, useRef, useState } from "react";

const ACCENT = "#b4532a";
const text = (v) => (v || "").trim();
const lines = (arr) => (arr || []).map(text).filter(Boolean);
const dates = (i) =>
  [text(i.start), i.current ? "Present" : text(i.end)]
    .filter(Boolean)
    .join(" – ");

function Heading({ modern, children }) {
  return modern ? (
    <h2
      className="mt-5 mb-1.5 text-[0.82em] font-bold tracking-[0.16em] uppercase"
      style={{ color: ACCENT }}
    >
      {children}
    </h2>
  ) : (
    <h2 className="mt-5 mb-1.5 border-b border-[#1a1a1a] pb-0.5 text-[0.86em] font-semibold tracking-[0.14em] uppercase">
      {children}
    </h2>
  );
}

function Bullets({ items }) {
  const list = lines(items);
  if (!list.length) return null;
  return (
    <ul className="mt-1 list-disc space-y-0.5 pl-5">
      {list.map((b, i) => (
        <li key={i}>{b}</li>
      ))}
    </ul>
  );
}

// The paper itself. Used for the on-screen preview and (with fluid) for printing.
export function ResumeSheet({ resume, fluid = false }) {
  const modern = resume.template === "modern";
  const p = resume.personal || {};
  const contact = [p.email, p.phone, p.location, ...lines(p.links)]
    .map(text)
    .filter(Boolean);
  const exp = (resume.experience || []).filter(
    (e) => text(e.company) || text(e.role) || lines(e.bullets).length,
  );
  const proj = (resume.projects || []).filter(
    (x) => text(x.name) || text(x.description) || lines(x.bullets).length,
  );
  const edu = (resume.education || []).filter(
    (e) => text(e.school) || text(e.degree),
  );
  const skills = lines(resume.skills);

  const size = fluid
    ? "w-full text-[11pt] leading-[1.4]"
    : "mx-auto min-h-[1123px] w-[794px] p-12 text-[14px] leading-[1.45] shadow-[0_24px_70px_-24px_rgba(0,0,0,0.7)]";

  return (
    <article
      className={`bg-white text-[#1a1a1a] ${modern ? "font-sans" : "font-display"} ${size}`}
    >
      <header
        className={modern ? "border-l-4 pl-4" : "text-center"}
        style={modern ? { borderColor: ACCENT } : undefined}
      >
        <h1
          className="text-[2.1em] leading-tight font-semibold tracking-tight"
          style={modern ? { color: ACCENT } : undefined}
        >
          {text(p.name) || <span className="text-[#aaa]">Your name</span>}
        </h1>
        {contact.length > 0 && (
          <p className="mt-1 text-[0.92em] text-[#444]">
            {contact.join("  ·  ")}
          </p>
        )}
      </header>

      {text(p.summary) && (
        <>
          <Heading modern={modern}>Summary</Heading>
          <p>{text(p.summary)}</p>
        </>
      )}

      {exp.length > 0 && (
        <>
          <Heading modern={modern}>Experience</Heading>
          {exp.map((e, i) => (
            <div key={e._k || e._id || i} className="mb-2.5 break-inside-avoid">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-semibold">
                  {[text(e.role), text(e.company)].filter(Boolean).join(" · ")}
                </p>
                <p className="shrink-0 text-[0.9em] text-[#555]">{dates(e)}</p>
              </div>
              {text(e.location) && (
                <p className="text-[0.9em] text-[#555]">{text(e.location)}</p>
              )}
              <Bullets items={e.bullets} />
            </div>
          ))}
        </>
      )}

      {proj.length > 0 && (
        <>
          <Heading modern={modern}>Projects</Heading>
          {proj.map((x, i) => (
            <div key={x._k || x._id || i} className="mb-2.5 break-inside-avoid">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-semibold">{text(x.name)}</p>
                {text(x.link) && (
                  <p className="shrink-0 text-[0.9em] text-[#555]">
                    {text(x.link)}
                  </p>
                )}
              </div>
              {text(x.description) && <p>{text(x.description)}</p>}
              <Bullets items={x.bullets} />
            </div>
          ))}
        </>
      )}

      {edu.length > 0 && (
        <>
          <Heading modern={modern}>Education</Heading>
          {edu.map((e, i) => (
            <div key={e._k || e._id || i} className="mb-2 break-inside-avoid">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-semibold">
                  {[text(e.degree), text(e.school)].filter(Boolean).join(" · ")}
                </p>
                <p className="shrink-0 text-[0.9em] text-[#555]">{dates(e)}</p>
              </div>
              {text(e.location) && (
                <p className="text-[0.9em] text-[#555]">{text(e.location)}</p>
              )}
              {text(e.details) && <p>{text(e.details)}</p>}
            </div>
          ))}
        </>
      )}

      {skills.length > 0 && (
        <>
          <Heading modern={modern}>Skills</Heading>
          <p>{skills.join(", ")}</p>
        </>
      )}
    </article>
  );
}

// Shrinks the A4 sheet to fit the space on screen (printing always uses the full size)
export default function ResumePreview({ resume }) {
  const ref = useRef(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const el = ref.current;
    const update = () => setZoom(Math.min(1, (el.clientWidth || 794) / 794));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full" aria-label="Resume preview">
      <div style={{ zoom }}>
        <ResumeSheet resume={resume} />
      </div>
    </div>
  );
}
