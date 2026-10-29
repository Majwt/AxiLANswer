import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/features/dashboard/ui/dashboard-data-table";
import { SectionCards } from "@/components/section-cards";
import { useDashboardData } from "@/features/dashboard/hooks/use-dashboard-data";
import { Activity } from "lucide-react";
import { Navigate, useParams } from "react-router";

export function DashboardShell() {
  const { customerId: customerIdParam } = useParams();
  const customerId = customerIdParam == null ? null : Number(customerIdParam);
  const isValidCustomerId = customerId == null || (Number.isInteger(customerId) && customerId > 0);
  const { cards, cardsLoading, chartData, loading } = useDashboardData(customerId, isValidCustomerId);

  if (!isValidCustomerId) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-scroll [scrollbar-gutter:stable] @container/main">
      <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
        <section className="surface-glass enter-rise flex flex-col gap-4 rounded-2xl border border-border/70 p-5 md:flex-row md:items-end md:justify-between md:p-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Activity className="h-3.5 w-3.5" />
              Operations dashboard
            </div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
              Connection telemetry overview
            </h1>
            <p className="text-sm text-muted-foreground">
              Inspect volume trends and high-activity nodes across your monitored environment.
            </p>
          </div>

        </section>

        <SectionCards cards={cards} loading={cardsLoading} />
        <ChartAreaInteractive data={chartData} loading={loading} />
        <DataTable customerId={customerId} />
      </div>
    </div>
  );
}
