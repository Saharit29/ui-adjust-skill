import { Card, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { DenseSection } from "@/components";
import { BalanceCell } from "../components/balance-cell";

const rows = [
  { id: "A-1001", name: "Northwind Traders", balance: 1250, overdue: 1250, unpaid: 3 },
  { id: "A-1002", name: "Blue Harbor Co-op", balance: 310.5, overdue: 0, unpaid: 1 },
  { id: "A-1003", name: "Maple Street Dental", balance: 0, overdue: 0, unpaid: 0 },
];

export default function AccountsPage() {
  return (
    <DenseSection title="Customer accounts">
      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Account</TableCell>
              <TableCell>Name</TableCell>
              <TableCell align="right">Balance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.id}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell align="right">
                  <BalanceCell balance={r.balance} overdueAmount={r.overdue} unpaidInvoices={r.unpaid} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </DenseSection>
  );
}
