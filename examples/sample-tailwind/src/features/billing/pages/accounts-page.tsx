import { BalanceCell } from "../components/balance-cell";

const rows = [
  { id: "A-1001", name: "Northwind Traders", balance: 1250, overdue: 1250, unpaid: 3 },
  { id: "A-1002", name: "Blue Harbor Co-op", balance: 310.5, overdue: 0, unpaid: 1 },
  { id: "A-1003", name: "Maple Street Dental", balance: 0, overdue: 0, unpaid: 0 },
];

export default function AccountsPage() {
  return (
    <section className="bg-canvas p-6">
      <h1 className="mb-4 text-lg font-semibold text-ink">Customer accounts</h1>
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-canvas text-left text-ink-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Account</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 text-right font-medium">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line hover:bg-canvas">
                <td className="px-3 py-2">{r.id}</td>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 text-right">
                  <BalanceCell balance={r.balance} overdueAmount={r.overdue} unpaidInvoices={r.unpaid} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
