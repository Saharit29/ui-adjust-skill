import { WarningIcon } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatCurrency, isOverdue } from "../utils/balance";

/** Outstanding balance of a customer account — 3 cases:
 * overdue = red + icon (not color alone) · open = normal text · nothing owed = muted text.
 * `showInvoiceCount` appends "N unpaid invoices" when more than one invoice is open. */
export function BalanceCell({
  balance,
  overdueAmount,
  unpaidInvoices,
  align = "end",
  showInvoiceCount = true,
}: {
  balance: number;
  overdueAmount: number;
  unpaidInvoices: number;
  align?: "start" | "end" | "center";
  showInvoiceCount?: boolean;
}) {
  if (balance <= 0) {
    return <span className="text-sm text-ink-muted">No balance</span>;
  }

  const overdue = isOverdue({ balance, overdueAmount });
  const alignClass = { start: "items-start", end: "items-end", center: "items-center" }[align];

  return (
    <div className={cn("flex flex-col gap-0.5", alignClass)}>
      <div className="flex items-center gap-1">
        {overdue ? <WarningIcon aria-label="Overdue" className="size-4 text-danger-700" /> : null}
        <span
          className={cn(
            "text-sm font-bold tabular-nums whitespace-nowrap",
            overdue ? "text-danger-700" : "text-ink",
          )}
        >
          {formatCurrency(balance)}
        </span>
      </div>
      {showInvoiceCount && unpaidInvoices > 1 ? (
        <span className={cn("text-xs", overdue ? "text-danger-700" : "text-ink-muted")}>
          {unpaidInvoices} unpaid invoices
        </span>
      ) : null}
    </div>
  );
}
