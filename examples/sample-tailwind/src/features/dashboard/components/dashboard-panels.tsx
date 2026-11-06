import type { ComponentType, ReactNode, SVGProps } from "react";
import { InboxIcon, InsightsIcon, MegaphoneIcon } from "@/components/ui";

type EmptyStateProps = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  subtitle: string;
};

function EmptyState({ icon: Icon, title, subtitle }: EmptyStateProps) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-canvas text-ink-subtle">
        <Icon className="size-6" />
      </div>
      <p className="text-sm font-bold text-ink">{title}</p>
      <p className="mt-1 text-xs text-ink-muted">{subtitle}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-surface">
      <h2 className="border-b border-line px-5 py-4 text-base font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export function DashboardPanels() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Panel title="Insights">
        <EmptyState icon={InsightsIcon} title="No insights yet" subtitle="Charts appear once your first data source is connected." />
      </Panel>
      <Panel title="Waiting on you">
        <EmptyState icon={InboxIcon} title="Nothing is waiting" subtitle="Approvals and requests that need you will show up here." />
      </Panel>
      <Panel title="Announcements">
        <EmptyState icon={MegaphoneIcon} title="No announcements" subtitle="Company news and events will be listed here." />
      </Panel>
    </div>
  );
}
