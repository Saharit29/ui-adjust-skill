import { DashboardPanels } from "../components/dashboard-panels";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-6 text-3xl font-semibold text-ink">Good morning</h1>
      <DashboardPanels />
    </main>
  );
}
