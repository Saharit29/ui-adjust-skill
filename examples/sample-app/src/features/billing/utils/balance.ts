export function isOverdue({ balance, overdueAmount }: { balance: number; overdueAmount: number }) {
  return balance > 0 && overdueAmount > 0;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}
