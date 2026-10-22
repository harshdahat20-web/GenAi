import { NavLink, Link, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";
import { btnLine, sm } from "../utils/ui";

const Icon = ({ d }) => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

// "soon" items have no page yet; they are added as each feature is built
const ITEMS = [
  {
    to: "/app",
    end: true,
    label: "Notes",
    d: "M6 3h9l4 4v14H6zM9 12h7M9 16h5",
  },
  { to: "/app/stats", label: "Stats", d: "M4 20V11M10 20V4M16 20v-7M21 20H3" },
  { to: "/app/chat", label: "Chat", d: "M4 5h16v11H9l-5 4z" },
  {
    to: "/app/review",
    label: "Code review",
    d: "M8 8l-4 4 4 4M16 8l4 4-4 4M14 4l-4 16",
  },
  {
    to: "/app/resume",
    label: "Resume",
    d: "M7 3h8l4 4v14H7zM10 11h6M10 15h6M10 7h2",
  },
];
const link = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl border px-3 py-2.5 text-[15px] transition-all duration-300 focus-visible:outline-2 focus-visible:outline-clay-hi ${
    isActive
      ? "border-clay/40 bg-clay/15 text-clay-hi"
      : "border-transparent text-mute hover:bg-white/[0.05] hover:text-ink"
  }`;

export default function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="page min-h-screen md:grid md:grid-cols-[250px_1fr]">
      <aside className="hidden border-r border-white/10 bg-[rgba(23,22,21,0.6)] p-4 backdrop-blur-xl md:sticky md:top-0 md:flex md:h-screen md:flex-col">
        <Link to="/app" aria-label="GenAI home" className="mb-8 mt-1 px-2">
          <Logo />
        </Link>
        <nav aria-label="App" className="flex flex-col gap-1.5">
          {ITEMS.map((it) =>
            it.soon ? (
              <span
                key={it.label}
                aria-disabled="true"
                className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-[15px] text-mute/50"
              >
                <Icon d={it.d} />
                {it.label}
                <span className="ml-auto font-mono text-[10px] tracking-widest uppercase">
                  Soon
                </span>
              </span>
            ) : (
              <NavLink key={it.label} to={it.to} end={it.end} className={link}>
                <Icon d={it.d} />
                {it.label}
              </NavLink>
            ),
          )}
        </nav>
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <p className="truncate text-sm font-medium">{user?.name}</p>
          <p className="mb-3 truncate text-xs text-mute">{user?.email}</p>
          <button className={`${btnLine} ${sm} w-full`} onClick={logout}>
            Log out
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex items-center justify-between px-4 pt-4 md:hidden">
          <Link to="/app" aria-label="GenAI home">
            <Logo />
          </Link>
          <button className={`${btnLine} ${sm}`} onClick={logout}>
            Log out
          </button>
        </header>
        <main id="main" className="px-4 pt-5 pb-28 md:px-8 md:pt-8 md:pb-12">
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="App"
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-white/10 bg-[rgba(23,22,21,0.88)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        {ITEMS.map((it) =>
          it.soon ? (
            <span
              key={it.label}
              aria-disabled="true"
              className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] text-mute/40"
            >
              <Icon d={it.d} />
              {it.label}
            </span>
          ) : (
            <NavLink
              key={it.label}
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] transition-colors duration-300 ${isActive ? "text-clay-hi" : "text-mute"}`
              }
            >
              <Icon d={it.d} />
              {it.label}
            </NavLink>
          ),
        )}
      </nav>
    </div>
  );
}
