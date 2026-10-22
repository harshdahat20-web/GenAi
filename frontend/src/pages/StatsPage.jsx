import StatsPanel from "../components/StatsPanel";
import useSeo from "../hooks/useSeo";
import { panel } from "../utils/ui";

export default function StatsPage() {
  useSeo({
    title: "Stats – GenAI",
    description: "Your study activity.",
    path: "/app/stats",
    noindex: true,
  });
  return (
    <div className="mx-auto max-w-[1100px]">
      <h1 className="mb-5 font-display text-4xl font-medium tracking-tight">
        Stats
      </h1>
      <div className={panel}>
        <StatsPanel />
      </div>
    </div>
  );
}
