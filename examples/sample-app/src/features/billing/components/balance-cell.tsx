import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { Stack, Typography } from "@mui/material";
import { formatCurrency, isOverdue } from "../utils/balance";

/** Outstanding balance of a customer account — 3 cases:
 * overdue = red + icon (not color alone) · open = normal text · nothing owed = muted text.
 * `showInvoiceCount` appends "N unpaid invoices" when more than one invoice is open. */
export function BalanceCell({
  balance,
  overdueAmount,
  unpaidInvoices,
  align = "flex-end",
  showInvoiceCount = true,
}: {
  balance: number;
  overdueAmount: number;
  unpaidInvoices: number;
  align?: "flex-start" | "flex-end" | "center";
  showInvoiceCount?: boolean;
}) {
  if (balance <= 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No balance
      </Typography>
    );
  }

  const overdue = isOverdue({ balance, overdueAmount });

  return (
    <Stack spacing={0.25} sx={{ alignItems: align }}>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
        {overdue ? (
          <WarningAmberRoundedIcon aria-label="Overdue" sx={{ fontSize: 16, color: "error.main" }} />
        ) : null}
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            color: overdue ? "error.main" : "text.primary",
            whiteSpace: "nowrap",
          }}
        >
          {formatCurrency(balance)}
        </Typography>
      </Stack>
      {showInvoiceCount && unpaidInvoices > 1 ? (
        <Typography variant="caption" color={overdue ? "error.main" : "text.secondary"}>
          {unpaidInvoices} unpaid invoices
        </Typography>
      ) : null}
    </Stack>
  );
}
