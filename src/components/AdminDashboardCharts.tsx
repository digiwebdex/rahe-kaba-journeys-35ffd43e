import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, DollarSign, Package,
  Users, Wallet, ArrowUpRight, ArrowDownRight, UserCheck,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useCanSeeProfit } from "@/components/admin/AdminLayout";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useCanSeeProfit } from "@/components/admin/AdminLayout";

interface Props {
  bookings: any[];
  payments: any[];
  expenses?: any[];
  accounts?: any[];
  financialSummary?: any;
  moallemPayments?: any[];
  supplierPayments?: any[];
  commissionPayments?: any[];
  moallems?: any[];
  supplierAgents?: any[];
  supplierContracts?: any[];
  supplierContractPayments?: any[];
  dailyCashbook?: any[];
  onMarkPaid: (id: string) => void;
}

const fmt = (n: number) => `BDT ${n.toLocaleString()}`;
const ttStyle = { backgroundColor: "hsl(220, 18%, 14%)", border: "1px solid hsl(220, 15%, 20%)", borderRadius: "8px", color: "hsl(40, 20%, 92%)", fontSize: "12px" };

const AdminDashboardCharts = ({
  bookings, payments, expenses = [], accounts = [], financialSummary,
  moallemPayments = [], supplierPayments = [], commissionPayments = [],
  moallems = [], supplierAgents = [], supplierContracts = [], supplierContractPayments = [],
  dailyCashbook = [],
  onMarkPaid
}: Props) => {
  const navigate = useNavigate();
  const canSeeProfit = useCanSeeProfit();
  const [showDueCustomers, setShowDueCustomers] = useState(false);

  // ══════════════════════════════════════════════════════════
  // ── DERIVED FINANCIAL CALCULATIONS (from source data) ────
  // ══════════════════════════════════════════════════════════

  const financials = useMemo(() => {
    // ─── TOTAL SALES: Sum of all booking selling amounts ───
    const totalSales = bookings.reduce((s, b) => s + Number(b.total_amount || 0), 0);
    const totalHajji = bookings.reduce((s, b) => s + Number(b.num_travelers || 0), 0);

    // ─── INCOME RECEIVED: All money that came IN ───
    // 1. Customer payments (completed)
    const customerPaymentsIn = payments
      .filter(p => p.status === "completed")
      .reduce((s, p) => s + Number(p.amount || 0), 0);

    // 2. Moallem deposits (income from moallems)
    const moallemDepositsIn = moallemPayments.reduce((s, p) => s + Number(p.amount || 0), 0);

    // 3. Daily cashbook income entries
    const cashbookIncome = dailyCashbook
      .filter(e => e.type === "income")
      .reduce((s, e) => s + Number(e.amount || 0), 0);

    const totalIncomeReceived = customerPaymentsIn + moallemDepositsIn + cashbookIncome;

    // ─── EXPENSES PAID: All money that went OUT ───
    // 1. Direct expenses (expense table)
    const directExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

    // 2. Supplier agent payments
    const supplierPaymentsOut = supplierPayments.reduce((s, p) => s + Number(p.amount || 0), 0);

    // 3. Commission payments to moallems
    const commissionPaymentsOut = commissionPayments.reduce((s, p) => s + Number(p.amount || 0), 0);

    // 4. Supplier contract payments
    const contractPaymentsOut = supplierContractPayments.reduce((s, p) => s + Number(p.amount || 0), 0);

    // 5. Daily cashbook expense entries
    const cashbookExpense = dailyCashbook
      .filter(e => e.type === "expense")
      .reduce((s, e) => s + Number(e.amount || 0), 0);

    const totalExpensesPaid = directExpenses + supplierPaymentsOut + commissionPaymentsOut + contractPaymentsOut + cashbookExpense;

    // ─── NET PROFIT: What remains as real profit ───
    // Calculated from bookings: selling price - cost - commission - extra expenses
    const bookingProfit = bookings.reduce((s, b) => {
      const selling = Number(b.total_amount || 0);
      const cost = Number(b.total_cost || 0);
      const commission = Number(b.total_commission || 0);
      const extra = Number(b.extra_expense || 0);
      return s + (selling - cost - commission - extra);
    }, 0);

    // Subtract non-booking direct expenses (general office, etc.)
    const generalExpenses = expenses
      .filter(e => !e.booking_id)
      .reduce((s, e) => s + Number(e.amount || 0), 0);

    const netProfit = bookingProfit - generalExpenses;

    // ─── CASH BALANCE: Sum of all wallet accounts ───
    const walletAccounts = accounts.filter(a => a.type === "asset");
    const cashBalance = walletAccounts.reduce((s, a) => s + Number(a.balance || 0), 0);

    // ─── RECEIVABLE (money owed TO us) ───
    // Moallem due: use moallems table (auto-synced by triggers)
    const moallemDue = moallems.reduce((s, m) => s + Number(m.total_due || 0), 0);

    // Customer due: from bookings
    const customerDue = bookings.reduce((s, b) => s + Number(b.due_amount || 0), 0);

    const totalReceivable = moallemDue + customerDue;

    // ─── PAYABLE (money we owe TO others) ───
    // Supplier due: from bookings + contract dues
    const bookingSupplierDue = bookings.reduce((s, b) => s + Number(b.supplier_due || 0), 0);
    const contractSupplierDue = supplierContracts.reduce((s, c) => s + Number(c.total_due || 0), 0);
    const supplierDue = bookingSupplierDue + contractSupplierDue;

    // Commission due: from bookings
    const commissionDue = bookings.reduce((s, b) => s + Number(b.commission_due || 0), 0);

    const totalPayable = supplierDue + commissionDue;

    return {
      totalSales,
      totalHajji,
      totalIncomeReceived,
      totalExpensesPaid,
      netProfit,
      cashBalance,
      moallemDue,
      customerDue,
      totalReceivable,
      supplierDue,
      commissionDue,
      totalPayable,
    };
  }, [bookings, payments, expenses, accounts, moallemPayments, supplierPayments, commissionPayments, supplierContractPayments, supplierContracts, moallems, dailyCashbook]);

  // Customers with dues
  const dueCustomers = useMemo(() => {
    const map: Record<string, { name: string; phone: string; totalDue: number; totalAmount: number; bookingCount: number; bookings: any[] }> = {};
    bookings.filter(b => Number(b.due_amount || 0) > 0).forEach(b => {
      const key = b.guest_phone || b.guest_name || b.tracking_id;
      if (!map[key]) {
        map[key] = { name: b.guest_name || "N/A", phone: b.guest_phone || "", totalDue: 0, totalAmount: 0, bookingCount: 0, bookings: [] };
      }
      map[key].totalDue += Number(b.due_amount || 0);
      map[key].totalAmount += Number(b.total_amount || 0);
      map[key].bookingCount += 1;
      map[key].bookings.push(b);
    });
    return Object.values(map).sort((a, b) => b.totalDue - a.totalDue);
  }, [bookings]);

  // Monthly chart
  const monthlyData = useMemo(() => {
    const months: Record<string, { revenue: number; profit: number }> = {};
    for (let i = 5; i >= 0; i--) {
      months[format(startOfMonth(subMonths(new Date(), i)), "MMM yy")] = { revenue: 0, profit: 0 };
    }
    bookings.forEach(b => {
      const key = format(new Date(b.created_at), "MMM yy");
      if (months[key]) {
        months[key].revenue += Number(b.total_amount || 0);
        const selling = Number(b.total_amount || 0);
        const cost = Number(b.total_cost || 0);
        const commission = Number(b.total_commission || 0);
        const extra = Number(b.extra_expense || 0);
        months[key].profit += (selling - cost - commission - extra);
      }
    });
    return Object.entries(months).map(([month, d]) => ({ month, ...d }));
  }, [bookings]);

  const recentBookings = bookings.slice(0, 5);
  const recentPayments = payments.filter(p => p.status === "completed").slice(0, 5);

  // Build KPI cards dynamically based on role
  const kpiCards = useMemo(() => {
    const cards: { label: string; value: string | number; icon: any; color: string; onClick: () => void }[] = [
      { label: "Total Sales", value: fmt(financials.totalSales), icon: DollarSign, color: "text-primary", onClick: () => navigate("/admin/bookings") },
      { label: "Income Received", value: fmt(financials.totalIncomeReceived), icon: ArrowUpRight, color: "text-emerald", onClick: () => navigate("/admin/payments") },
    ];
    if (canSeeProfit) {
      cards.push({ label: "Net Profit", value: fmt(financials.netProfit), icon: TrendingUp, color: financials.netProfit >= 0 ? "text-emerald" : "text-destructive", onClick: () => navigate("/admin/accounting") });
    }
    cards.push(
      { label: "Cash Balance", value: fmt(financials.cashBalance), icon: Wallet, color: financials.cashBalance >= 0 ? "text-primary" : "text-destructive", onClick: () => navigate("/admin/accounting") },
      { label: "Total Bookings", value: bookings.length, icon: Package, color: "text-foreground", onClick: () => navigate("/admin/bookings") },
      { label: "Total Hajji", value: financials.totalHajji, icon: Users, color: "text-foreground", onClick: () => navigate("/admin/customers") },
      { label: "Customer Due", value: fmt(financials.customerDue), icon: UserCheck, color: financials.customerDue > 0 ? "text-yellow-500" : "text-emerald", onClick: () => setShowDueCustomers(true) },
    );
    return cards;
  }, [financials, bookings.length, canSeeProfit, navigate]);

  return (
    <div className="space-y-5">
      {/* ═══ TOP KPI CARDS ═══ */}
      <div className={`grid grid-cols-2 sm:grid-cols-4 ${canSeeProfit ? "lg:grid-cols-7" : "lg:grid-cols-6"} gap-3`}>
        {kpiCards.map(k => (
          <div
            key={k.label}
            className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/50 transition-colors"
            onClick={k.onClick}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{k.label}</p>
              <k.icon className={`h-4 w-4 ${k.color}`} />
            </div>
            <p className={`text-lg font-heading font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* ═══ RECEIVABLE & PAYABLE ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <ArrowUpRight className="h-4 w-4 text-primary" /> Receivable
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between cursor-pointer hover:bg-secondary/30 rounded px-1 -mx-1 py-0.5 transition-colors" onClick={() => navigate("/admin/moallems")}>
              <span className="text-muted-foreground">Moallem Due</span><span className="font-bold text-yellow-600">{fmt(financials.moallemDue)}</span>
            </div>
            <div className="flex justify-between cursor-pointer hover:bg-secondary/30 rounded px-1 -mx-1 py-0.5 transition-colors" onClick={() => setShowDueCustomers(true)}>
              <span className="text-muted-foreground">Customer Due</span><span className="font-bold text-yellow-600">{fmt(financials.customerDue)}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between font-bold"><span>Total</span><span className="text-primary">{fmt(financials.totalReceivable)}</span></div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <ArrowDownRight className="h-4 w-4 text-destructive" /> Payable
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between cursor-pointer hover:bg-secondary/30 rounded px-1 -mx-1 py-0.5 transition-colors" onClick={() => navigate("/admin/supplier-agents")}>
              <span className="text-muted-foreground">Supplier Due</span><span className="font-bold text-destructive">{fmt(financials.supplierDue)}</span>
            </div>
            {canSeeProfit && (
              <div className="flex justify-between cursor-pointer hover:bg-secondary/30 rounded px-1 -mx-1 py-0.5 transition-colors" onClick={() => navigate("/admin/moallems")}>
                <span className="text-muted-foreground">Commission Due</span><span className="font-bold text-destructive">{fmt(financials.commissionDue)}</span>
              </div>
            )}
            <div className="border-t border-border pt-2 flex justify-between font-bold">
              <span>Total</span>
              <span className="text-destructive">{fmt(financials.supplierDue + (canSeeProfit ? financials.commissionDue : 0))}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ MONTHLY CHART ═══ */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-primary" /> Monthly Sales {canSeeProfit && "& Profit"}
        </h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 20%)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(220, 10%, 55%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(220, 10%, 55%)" }} axisLine={false} tickLine={false} tickFormatter={v => `৳${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={ttStyle} formatter={(v: number) => fmt(v)} />
              <Bar dataKey="revenue" fill="hsl(40, 65%, 48%)" radius={[4, 4, 0, 0]} name="Sales" />
              {canSeeProfit && <Bar dataKey="profit" fill="hsl(160, 50%, 40%)" radius={[4, 4, 0, 0]} name="Profit" />}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ═══ RECENT ACTIVITY ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Recent Bookings
            </h3>
            <button onClick={() => navigate("/admin/bookings")} className="text-xs text-primary hover:underline">View All</button>
          </div>
          {recentBookings.length > 0 ? (
            <div className="space-y-2">
              {recentBookings.map(b => (
                <div key={b.id} className="flex items-center justify-between bg-secondary/30 rounded-lg p-3 cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate("/admin/bookings")}>
                  <div>
                    <p className="text-sm font-medium">{b.guest_name || "N/A"}</p>
                    <p className="text-[10px] text-muted-foreground">{b.tracking_id} · {b.packages?.name || ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">{fmt(Number(b.total_amount))}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize ${b.status === "completed" ? "bg-emerald/10 text-emerald" : "bg-primary/10 text-primary"}`}>{b.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground text-center py-8">No bookings yet</p>}
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" /> Recent Payments
            </h3>
            <button onClick={() => navigate("/admin/payments")} className="text-xs text-primary hover:underline">View All</button>
          </div>
          {recentPayments.length > 0 ? (
            <div className="space-y-2">
              {recentPayments.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-secondary/30 rounded-lg p-3 cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate("/admin/payments")}>
                  <div>
                    <p className="text-sm font-medium">{p.bookings?.tracking_id || p.booking_id?.slice(0, 8)}</p>
                    <p className="text-[10px] text-muted-foreground">#{p.installment_number || "—"} · {p.payment_method || "manual"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald">{fmt(Number(p.amount))}</p>
                    <p className="text-[10px] text-muted-foreground">{p.paid_at ? format(new Date(p.paid_at), "dd MMM yy") : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground text-center py-8">No payments yet</p>}
        </div>
      </div>

      {/* ═══ DUE CUSTOMERS DIALOG ═══ */}
      <Dialog open={showDueCustomers} onOpenChange={setShowDueCustomers}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Due Customer List
              <span className="text-sm font-normal text-muted-foreground ml-2">({dueCustomers.length} customers)</span>
            </DialogTitle>
          </DialogHeader>
          {dueCustomers.length > 0 ? (
            <div className="space-y-2 mt-2">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm font-medium">Total Due</span>
                <span className="text-lg font-bold text-destructive">{fmt(financials.customerDue)}</span>
              </div>
              {dueCustomers.map((c, i) => (
                <div key={i} className="bg-secondary/30 border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold">{c.name}</p>
                      {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-destructive">{fmt(c.totalDue)}</p>
                      <p className="text-[10px] text-muted-foreground">{c.bookingCount} bookings</p>
                    </div>
                  </div>
                  <div className="space-y-1 mt-2 border-t border-border pt-2">
                    {c.bookings.map((b: any) => (
                      <div key={b.id} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{b.tracking_id} · {b.packages?.name || ""}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">Total: {fmt(Number(b.total_amount))}</span>
                          <span className="font-semibold text-destructive">Due: {fmt(Number(b.due_amount))}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No dues 🎉</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboardCharts;
