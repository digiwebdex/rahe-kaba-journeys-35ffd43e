import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Package, AlertTriangle, Calendar, Filter, Users,
  CheckCircle2, XCircle, Clock, RefreshCw, ShieldCheck, Wallet, Landmark, Receipt,
  FileText, CreditCard, Calculator,
} from "lucide-react";
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, subMonths } from "date-fns";

interface Props {
  bookings: any[];
  payments: any[];
  expenses?: any[];
  accounts?: any[];
  financialSummary?: any;
  moallemPayments?: any[];
  supplierPayments?: any[];
  moallems?: any[];
  supplierAgents?: any[];
  onMarkPaid: (id: string) => void;
}

const CHART_COLORS = {
  gold: "hsl(40, 65%, 48%)",
  goldLight: "hsl(40, 70%, 62%)",
  goldDark: "hsl(40, 60%, 35%)",
  emerald: "hsl(160, 50%, 40%)",
  destructive: "hsl(0, 84%, 60%)",
  muted: "hsl(220, 10%, 55%)",
  card: "hsl(220, 18%, 11%)",
  blue: "hsl(210, 70%, 55%)",
};

const PIE_COLORS = [CHART_COLORS.gold, CHART_COLORS.emerald, CHART_COLORS.goldLight, CHART_COLORS.destructive, CHART_COLORS.muted, CHART_COLORS.goldDark];

const inputClass = "bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

const customTooltipStyle = {
  backgroundColor: "hsl(220, 18%, 14%)",
  border: "1px solid hsl(220, 15%, 20%)",
  borderRadius: "8px",
  color: "hsl(40, 20%, 92%)",
  fontSize: "12px",
};

// Reconciliation widget
const ReconciliationWidget = ({ bookings, payments }: { bookings: any[]; payments: any[] }) => {
  const reconciliationData = useMemo(() => {
    return bookings.map((b) => {
      const bookingPayments = payments.filter((p) => p.booking_id === b.id);
      const completedPayments = bookingPayments.filter((p) => p.status === "completed");
      const sumCompleted = completedPayments.reduce((s: number, p: any) => s + Number(p.amount), 0);
      const total = Number(b.total_amount);
      const paid = Number(b.paid_amount);
      const due = Number(b.due_amount || 0);
      const isClamped = sumCompleted > total;
      const isFullyPaid = paid >= total && total > 0;
      const isHealthy = due >= 0 && paid <= total;
      return {
        id: b.id, trackingId: b.tracking_id, name: b.profiles?.full_name || "N/A",
        total, paid, due, rawPaymentSum: sumCompleted, status: b.status,
        isClamped, isFullyPaid, isHealthy,
        autoCompleted: b.status === "completed" && isFullyPaid,
        completedPayments: completedPayments.length, totalPayments: bookingPayments.length,
        lastPaymentDate: completedPayments.length > 0
          ? completedPayments.sort((a: any, b: any) => new Date(b.paid_at || b.created_at).getTime() - new Date(a.paid_at || a.created_at).getTime())[0]?.paid_at
          : null,
      };
    }).sort((a, b) => (!a.isHealthy && b.isHealthy ? -1 : a.isHealthy && !b.isHealthy ? 1 : 0));
  }, [bookings, payments]);

  const healthyCount = reconciliationData.filter((r) => r.isHealthy).length;
  const autoCompletedCount = reconciliationData.filter((r) => r.autoCompleted).length;
  const clampedCount = reconciliationData.filter((r) => r.isClamped).length;

  if (reconciliationData.length === 0) return <p className="text-sm text-muted-foreground text-center py-8">No bookings to reconcile.</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-secondary/50 rounded-lg p-3 text-center"><p className="text-2xl font-heading font-bold">{reconciliationData.length}</p><p className="text-xs text-muted-foreground">Total</p></div>
        <div className="bg-emerald/10 rounded-lg p-3 text-center"><p className="text-2xl font-heading font-bold" style={{ color: CHART_COLORS.emerald }}>{healthyCount}</p><p className="text-xs text-muted-foreground">Healthy</p></div>
        <div className="bg-primary/10 rounded-lg p-3 text-center"><p className="text-2xl font-heading font-bold text-primary">{autoCompletedCount}</p><p className="text-xs text-muted-foreground">Auto-Completed</p></div>
        <div className="bg-destructive/10 rounded-lg p-3 text-center"><p className="text-2xl font-heading font-bold text-destructive">{clampedCount}</p><p className="text-xs text-muted-foreground">Clamped</p></div>
      </div>
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="pb-3 pr-3">Status</th><th className="pb-3 pr-3">Tracking</th><th className="pb-3 pr-3">Customer</th>
              <th className="pb-3 pr-3">Total</th><th className="pb-3 pr-3">Paid</th><th className="pb-3 pr-3">Due</th>
              <th className="pb-3 pr-3">Payments</th><th className="pb-3">Info</th>
            </tr>
          </thead>
          <tbody>
            {reconciliationData.map((r) => (
              <tr key={r.id} className="border-b border-border/50">
                <td className="py-2.5 pr-3">
                  {r.autoCompleted ? <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: CHART_COLORS.emerald }}><CheckCircle2 className="h-3.5 w-3.5" /> Done</span>
                    : !r.isHealthy ? <span className="flex items-center gap-1 text-xs font-semibold text-destructive"><XCircle className="h-3.5 w-3.5" /> Issue</span>
                    : r.due > 0 ? <span className="flex items-center gap-1 text-xs font-semibold text-primary"><Clock className="h-3.5 w-3.5" /> Pending</span>
                    : <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: CHART_COLORS.emerald }}><CheckCircle2 className="h-3.5 w-3.5" /> OK</span>}
                </td>
                <td className="py-2.5 pr-3 font-mono text-xs text-primary">{r.trackingId}</td>
                <td className="py-2.5 pr-3">{r.name}</td>
                <td className="py-2.5 pr-3 font-medium">৳{r.total.toLocaleString()}</td>
                <td className="py-2.5 pr-3" style={{ color: CHART_COLORS.emerald }}>৳{r.paid.toLocaleString()}</td>
                <td className="py-2.5 pr-3 text-destructive font-medium">৳{r.due.toLocaleString()}</td>
                <td className="py-2.5 pr-3 text-xs text-muted-foreground">{r.completedPayments}/{r.totalPayments}</td>
                <td className="py-2.5">
                  {r.isClamped && <span className="text-xs text-destructive flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Clamped</span>}
                  {r.autoCompleted && r.lastPaymentDate && <span className="text-xs text-muted-foreground">{format(new Date(r.lastPaymentDate), "dd MMM yyyy")}</span>}
                  {!r.isClamped && !r.autoCompleted && r.isHealthy && <span className="text-xs text-muted-foreground">Balanced</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AdminDashboardCharts = ({ bookings, payments, expenses = [], accounts = [], financialSummary, moallemPayments = [], supplierPayments = [], moallems = [], supplierAgents = [], onMarkPaid }: Props) => {
  const [dateFrom, setDateFrom] = useState(() => format(subMonths(new Date(), 11), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [packageTypeFilter, setPackageTypeFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");

  const filteredBookings = useMemo(() => bookings.filter((b) => {
    const d = new Date(b.created_at);
    return isWithinInterval(d, { start: parseISO(dateFrom), end: endOfMonth(parseISO(dateTo)) }) && (packageTypeFilter === "all" || b.packages?.type === packageTypeFilter);
  }), [bookings, dateFrom, dateTo, packageTypeFilter]);

  const filteredPayments = useMemo(() => payments.filter((p) => {
    const d = new Date(p.created_at);
    return isWithinInterval(d, { start: parseISO(dateFrom), end: endOfMonth(parseISO(dateTo)) }) && (paymentStatusFilter === "all" || p.status === paymentStatusFilter);
  }), [payments, dateFrom, dateTo, paymentStatusFilter]);

  // KPIs from accounting tables (single source of truth)
  const totalRevenue = financialSummary ? Number(financialSummary.total_income) : filteredPayments.filter((p) => p.status === "completed").reduce((s: number, p: any) => s + Number(p.amount), 0);
  const totalExpenses = financialSummary ? Number(financialSummary.total_expense) : expenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const netProfit = financialSummary ? Number(financialSummary.net_profit) : totalRevenue - totalExpenses;
  const totalDue = filteredBookings.reduce((s: number, b: any) => s + Number(b.due_amount || 0), 0);
  const overduePayments = filteredPayments.filter((p: any) => p.status === "pending" && p.due_date && new Date(p.due_date) < new Date());
  const walletAccounts = accounts.filter((a: any) => a.type === "asset");
  const cashInHand = walletAccounts.find((a: any) => a.name === "Cash")?.balance || 0;
  const bankBalance = walletAccounts.find((a: any) => a.name === "Bank")?.balance || 0;
  const bkashBalance = walletAccounts.find((a: any) => a.name === "bKash")?.balance || 0;
  const nagadBalance = walletAccounts.find((a: any) => a.name === "Nagad")?.balance || 0;

  // Moallem & Supplier totals
  const totalMoallemAdvance = moallemPayments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const totalSupplierPaid = filteredBookings.reduce((s: number, b: any) => s + Number(b.paid_to_supplier || 0), 0);
  const totalSupplierCost = filteredBookings.reduce((s: number, b: any) => s + Number(b.total_cost || 0), 0);
  const totalSupplierDue = filteredBookings.reduce((s: number, b: any) => s + Number(b.supplier_due || 0), 0);
  const totalMoallemDue = moallems.reduce((s: number, m: any) => s + Number(m.total_due || 0), 0);
  const totalMoallems = moallems.length;
  const totalAgents = supplierAgents.length;
  const agentExpenses = expenses.filter((e: any) => e.category === "supplier" || e.expense_type === "supplier").reduce((s: number, e: any) => s + Number(e.amount || 0), 0) + totalSupplierPaid;
  const overallProfit = totalRevenue - totalExpenses;

  // Booking-level profit aggregates
  const totalSales = filteredBookings.reduce((s: number, b: any) => s + Number(b.total_amount || 0), 0);
  const totalPurchaseCost = filteredBookings.reduce((s: number, b: any) => s + Number(b.total_cost || 0), 0);
  const totalExtraExpense = filteredBookings.reduce((s: number, b: any) => s + Number(b.extra_expense || 0), 0);
  const totalBookingProfit = filteredBookings.reduce((s: number, b: any) => s + Number(b.profit_amount || 0), 0);

  // Monthly profit chart (revenue - expenses per month)
  const monthlyProfitData = useMemo(() => {
    const months: Record<string, { revenue: number; expenses: number }> = {};
    for (let i = 11; i >= 0; i--) {
      const m = startOfMonth(subMonths(new Date(), i));
      months[format(m, "MMM yyyy")] = { revenue: 0, expenses: 0 };
    }
    filteredPayments.filter((p: any) => p.status === "completed").forEach((p: any) => {
      const key = format(new Date(p.paid_at || p.created_at), "MMM yyyy");
      if (months[key]) months[key].revenue += Number(p.amount);
    });
    expenses.forEach((e: any) => {
      const key = format(new Date(e.date || e.created_at), "MMM yyyy");
      if (months[key]) months[key].expenses += Number(e.amount);
    });
    return Object.entries(months).map(([month, d]) => ({ month, revenue: d.revenue, expenses: d.expenses, profit: d.revenue - d.expenses }));
  }, [filteredPayments, expenses]);

  // Monthly bookings
  const monthlyBookings = useMemo(() => {
    const months: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) { months[format(startOfMonth(subMonths(new Date(), i)), "MMM yyyy")] = 0; }
    filteredBookings.forEach((b: any) => { const key = format(new Date(b.created_at), "MMM yyyy"); if (months[key] !== undefined) months[key]++; });
    return Object.entries(months).map(([month, count]) => ({ month, bookings: count }));
  }, [filteredBookings]);

  // Monthly payment collection
  const monthlyPayments = useMemo(() => {
    const months: Record<string, { collected: number; pending: number }> = {};
    for (let i = 11; i >= 0; i--) { months[format(startOfMonth(subMonths(new Date(), i)), "MMM yyyy")] = { collected: 0, pending: 0 }; }
    filteredPayments.forEach((p: any) => {
      const key = format(new Date(p.created_at), "MMM yyyy");
      if (months[key]) { if (p.status === "completed") months[key].collected += Number(p.amount); else months[key].pending += Number(p.amount); }
    });
    return Object.entries(months).map(([month, data]) => ({ month, ...data }));
  }, [filteredPayments]);

  // Package breakdown
  const packageBreakdown = useMemo(() => {
    const types: Record<string, number> = {};
    filteredBookings.forEach((b: any) => { const type = b.packages?.type || "unknown"; types[type] = (types[type] || 0) + 1; });
    return Object.entries(types).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [filteredBookings]);

  // Package profit
  const packageProfitData = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; supplierCost: number; expenses: number; bookings: number; travelers: number }> = {};
    filteredBookings.forEach((b: any) => {
      const pkgName = b.packages?.name || "Unknown";
      if (!map[pkgName]) map[pkgName] = { name: pkgName, revenue: 0, supplierCost: 0, expenses: 0, bookings: 0, travelers: 0 };
      map[pkgName].revenue += Number(b.paid_amount);
      map[pkgName].supplierCost += Number(b.total_cost || 0);
      map[pkgName].bookings += 1;
      map[pkgName].travelers += Number(b.num_travelers);
      map[pkgName].expenses += expenses.filter((e: any) => e.booking_id === b.id).reduce((s: number, e: any) => s + Number(e.amount), 0);
    });
    return Object.values(map).map((p) => ({ ...p, totalCost: p.supplierCost + p.expenses, profit: p.revenue - p.supplierCost - p.expenses, margin: p.revenue > 0 ? Math.round(((p.revenue - p.supplierCost - p.expenses) / p.revenue) * 100) : 0 })).sort((a, b) => b.profit - a.profit);
  }, [filteredBookings, expenses]);

  // Hajji report
  const hajjiReport = useMemo(() => filteredBookings.map((b: any) => {
    const expenseTotal = expenses.filter((e: any) => e.booking_id === b.id).reduce((s: number, e: any) => s + Number(e.amount), 0);
    const supplierCost = Number(b.total_cost || 0);
    const extraExp = Number(b.extra_expense || 0);
    return {
      trackingId: b.tracking_id, name: b.guest_name || "N/A", package: b.packages?.name || "N/A",
      type: b.packages?.type || "N/A", travelers: b.num_travelers, total: Number(b.total_amount),
      paid: Number(b.paid_amount), due: Number(b.due_amount || 0), supplierCost, extraExpense: extraExp, expenses: expenseTotal,
      supplierPaid: Number(b.paid_to_supplier || 0), supplierDue: Number(b.supplier_due || 0),
      profit: Number(b.profit_amount || 0), status: b.status, date: b.created_at,
    };
  }), [filteredBookings, expenses]);

  const navigate = useNavigate();

  const quickActions = [
    { label: "নতুন বুকিং", icon: FileText, path: "/admin/bookings?action=create", color: "bg-primary/10 text-primary hover:bg-primary/20" },
    { label: "নতুন কাস্টমার", icon: Users, path: "/admin/customers?action=add", color: "bg-emerald/10 text-emerald hover:bg-emerald/20" },
    { label: "নতুন পেমেন্ট", icon: CreditCard, path: "/admin/payments?action=add", color: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20" },
    { label: "নতুন খরচ", icon: Calculator, path: "/admin/accounting?action=add", color: "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20" },
    { label: "নতুন প্যাকেজ", icon: Package, path: "/admin/packages?action=add", color: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20" },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {quickActions.map((a) => (
          <button key={a.label} onClick={() => navigate(a.path)}
            className={`flex items-center gap-2 rounded-xl border border-border p-3.5 text-sm font-medium transition-colors ${a.color}`}>
            <a.icon className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{a.label}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3"><Filter className="h-4 w-4 text-primary" /><span className="text-sm font-semibold">Filters</span></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div><label className="text-xs text-muted-foreground block mb-1">From</label><input type="date" className={inputClass + " w-full"} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground block mb-1">To</label><input type="date" className={inputClass + " w-full"} value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground block mb-1">Package Type</label>
            <select className={inputClass + " w-full"} value={packageTypeFilter} onChange={(e) => setPackageTypeFilter(e.target.value)}>
              <option value="all">All Types</option>
              {["hajj", "umrah", "visa", "hotel", "transport", "ziyara"].map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div><label className="text-xs text-muted-foreground block mb-1">Payment Status</label>
            <select className={inputClass + " w-full"} value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              {["pending", "completed", "failed", "refunded"].map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Booking Profit KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Sales", value: `৳${totalSales.toLocaleString()}`, icon: DollarSign, color: "text-primary", bgColor: "bg-primary/10" },
          { label: "Purchase Cost", value: `৳${totalPurchaseCost.toLocaleString()}`, icon: TrendingDown, color: "text-muted-foreground", bgColor: "bg-secondary" },
          { label: "Extra Expenses", value: `৳${totalExtraExpense.toLocaleString()}`, icon: Receipt, color: "text-destructive", bgColor: "bg-destructive/10" },
          { label: "Booking Profit", value: `৳${totalBookingProfit.toLocaleString()}`, icon: TrendingUp, color: totalBookingProfit >= 0 ? "text-emerald" : "text-destructive", bgColor: totalBookingProfit >= 0 ? "bg-emerald/10" : "bg-destructive/10" },
        ].map((c) => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <div className={`w-8 h-8 rounded-lg ${c.bgColor} flex items-center justify-center`}><c.icon className={`h-3.5 w-3.5 ${c.color}`} /></div>
            </div>
            <p className={`text-xl font-heading font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: `৳${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-primary", bgColor: "bg-primary/10" },
          { label: "Total Expenses", value: `৳${totalExpenses.toLocaleString()}`, icon: TrendingDown, color: "text-destructive", bgColor: "bg-destructive/10" },
          { label: "Net Profit", value: `৳${netProfit.toLocaleString()}`, icon: TrendingUp, color: netProfit >= 0 ? "text-emerald" : "text-destructive", bgColor: netProfit >= 0 ? "bg-emerald/10" : "bg-destructive/10" },
          { label: "Cash in Hand", value: `৳${Number(cashInHand).toLocaleString()}`, icon: Wallet, color: "text-primary", bgColor: "bg-primary/10" },
        ].map((c) => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <div className={`w-8 h-8 rounded-lg ${c.bgColor} flex items-center justify-center`}><c.icon className={`h-3.5 w-3.5 ${c.color}`} /></div>
            </div>
            <p className={`text-xl font-heading font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "bKash", value: `৳${Number(bkashBalance).toLocaleString()}`, icon: Wallet, color: "text-primary", bgColor: "bg-primary/10" },
          { label: "Nagad", value: `৳${Number(nagadBalance).toLocaleString()}`, icon: Wallet, color: "text-primary", bgColor: "bg-primary/10" },
          { label: "Bank", value: `৳${Number(bankBalance).toLocaleString()}`, icon: Landmark, color: "text-primary", bgColor: "bg-primary/10" },
          { label: "Pending Due", value: `৳${totalDue.toLocaleString()}`, icon: Receipt, color: "text-yellow-600", bgColor: "bg-yellow-500/10" },
        ].map((c) => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <div className={`w-8 h-8 rounded-lg ${c.bgColor} flex items-center justify-center`}><c.icon className={`h-3.5 w-3.5 ${c.color}`} /></div>
            </div>
            <p className={`text-xl font-heading font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Moallems", value: totalMoallems, icon: Users, color: "text-primary", bgColor: "bg-primary/10" },
          { label: "Total Supplier Agents", value: totalAgents, icon: ShieldCheck, color: "text-blue-500", bgColor: "bg-blue-500/10" },
          { label: "Moallem Due", value: `৳${totalMoallemDue.toLocaleString()}`, icon: Receipt, color: "text-yellow-600", bgColor: "bg-yellow-500/10" },
          { label: "Agent Due", value: `৳${totalSupplierDue.toLocaleString()}`, icon: AlertTriangle, color: "text-destructive", bgColor: "bg-destructive/10" },
        ].map((c) => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <div className={`w-8 h-8 rounded-lg ${c.bgColor} flex items-center justify-center`}><c.icon className={`h-3.5 w-3.5 ${c.color}`} /></div>
            </div>
            <p className={`text-xl font-heading font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Agent Expenses", value: `৳${agentExpenses.toLocaleString()}`, icon: TrendingDown, color: "text-destructive", bgColor: "bg-destructive/10" },
          { label: "Moallem Advance", value: `৳${totalMoallemAdvance.toLocaleString()}`, icon: Wallet, color: "text-primary", bgColor: "bg-primary/10" },
          { label: "Supplier Paid", value: `৳${totalSupplierPaid.toLocaleString()}`, icon: CheckCircle2, color: "text-emerald", bgColor: "bg-emerald/10" },
          { label: "Profit", value: `৳${overallProfit.toLocaleString()}`, icon: TrendingUp, color: overallProfit >= 0 ? "text-emerald" : "text-destructive", bgColor: overallProfit >= 0 ? "bg-emerald/10" : "bg-destructive/10" },
        ].map((c) => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <div className={`w-8 h-8 rounded-lg ${c.bgColor} flex items-center justify-center`}><c.icon className={`h-3.5 w-3.5 ${c.color}`} /></div>
            </div>
            <p className={`text-xl font-heading font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Overdue Payments", value: overduePayments.length, icon: AlertTriangle, color: "text-destructive", bgColor: "bg-destructive/10" },
          { label: "Total Bookings", value: filteredBookings.length, icon: Package, color: "text-foreground", bgColor: "bg-secondary" },
        ].map((c) => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <div className={`w-8 h-8 rounded-lg ${c.bgColor} flex items-center justify-center`}><c.icon className={`h-3.5 w-3.5 ${c.color}`} /></div>
            </div>
            <p className={`text-xl font-heading font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* NEW: Monthly Profit Chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h4 className="font-heading font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Monthly Profit
        </h4>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyProfitData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 20%)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={customTooltipStyle} formatter={(val: number) => `৳${val.toLocaleString()}`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="profit" fill={CHART_COLORS.gold} radius={[4, 4, 0, 0]} name="Profit" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* NEW: Revenue vs Expense Chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h4 className="font-heading font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" /> Revenue vs Expenses
        </h4>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyProfitData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 20%)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={customTooltipStyle} formatter={(val: number) => `৳${val.toLocaleString()}`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS.emerald} fill={CHART_COLORS.emerald} fillOpacity={0.2} name="Revenue" />
              <Area type="monotone" dataKey="expenses" stroke={CHART_COLORS.destructive} fill={CHART_COLORS.destructive} fillOpacity={0.2} name="Expenses" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Moallem & Supplier Overview Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <h4 className="font-heading font-semibold mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Moallem & Supplier Overview
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: "Moallem Advance", amount: totalMoallemAdvance },
                { name: "Moallem Due", amount: totalMoallemDue },
                { name: "Supplier Paid", amount: totalSupplierPaid },
                { name: "Supplier Due", amount: totalSupplierDue },
                { name: "Agent Expenses", amount: agentExpenses },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 20%)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={customTooltipStyle} formatter={(val: number) => `৳${val.toLocaleString()}`} />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]} name="Amount">
                  <Cell fill={CHART_COLORS.gold} />
                  <Cell fill={CHART_COLORS.destructive} />
                  <Cell fill={CHART_COLORS.emerald} />
                  <Cell fill={CHART_COLORS.muted} />
                  <Cell fill={CHART_COLORS.blue} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h4 className="font-heading font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Financial Breakdown
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[
                  { name: "Revenue", value: totalRevenue },
                  { name: "Supplier Cost", value: totalSupplierCost },
                  { name: "Other Expenses", value: Math.max(0, totalExpenses - totalSupplierCost) },
                  { name: "Profit", value: Math.max(0, overallProfit) },
                ].filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value">
                  {[CHART_COLORS.emerald, CHART_COLORS.destructive, CHART_COLORS.muted, CHART_COLORS.gold].map((color, i) => (
                    <Cell key={i} fill={color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={customTooltipStyle} formatter={(val: number) => `৳${val.toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <h4 className="font-heading font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" /> Booking Growth
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyBookings}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 20%)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Line type="monotone" dataKey="bookings" stroke={CHART_COLORS.blue} strokeWidth={2} dot={{ fill: CHART_COLORS.blue, r: 3 }} name="Bookings" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h4 className="font-heading font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" /> Payment Collection
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyPayments}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 20%)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={customTooltipStyle} formatter={(val: number) => `৳${val.toLocaleString()}`} />
                <Area type="monotone" dataKey="collected" stackId="1" stroke={CHART_COLORS.emerald} fill={CHART_COLORS.emerald} fillOpacity={0.3} name="Collected" />
                <Area type="monotone" dataKey="pending" stackId="1" stroke={CHART_COLORS.gold} fill={CHART_COLORS.gold} fillOpacity={0.3} name="Pending" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-3 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.emerald }} /> Collected</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.gold }} /> Pending</span>
          </div>
        </div>
      </div>

      {/* Package Breakdown Pie + Overdue Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <h4 className="font-heading font-semibold mb-4 flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Bookings by Type</h4>
          {packageBreakdown.length > 0 ? (
            <>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={packageBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {packageBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie><Tooltip contentStyle={customTooltipStyle} /></PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 mt-2">
                {packageBreakdown.map((item, i) => (
                  <span key={item.name} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />{item.name} ({item.value})
                  </span>
                ))}
              </div>
            </>
          ) : <p className="text-sm text-muted-foreground text-center py-12">No data</p>}
        </div>

        <div className="bg-card border border-border rounded-xl p-5 lg:col-span-2">
          <h4 className="font-heading font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Overdue Payment Alerts</h4>
          {overduePayments.length > 0 ? (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {overduePayments.map((p: any) => (
                <div key={p.id} className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{p.bookings?.tracking_id || p.booking_id?.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">Due: {new Date(p.due_date).toLocaleDateString()} · #{p.installment_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-destructive text-sm">৳{Number(p.amount).toLocaleString()}</p>
                    <button onClick={() => onMarkPaid(p.id)} className="text-xs text-primary hover:underline">Mark Paid</button>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground text-center py-12">No overdue payments 🎉</p>}
        </div>
      </div>

      {/* Reconciliation */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h4 className="font-heading font-semibold mb-4 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Reconciliation Status</h4>
        <ReconciliationWidget bookings={filteredBookings} payments={filteredPayments} />
      </div>

      {/* Package Profit */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h4 className="font-heading font-semibold mb-4 flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Package Profit Analytics</h4>
        {packageProfitData.length > 0 ? (
          <>
            <div className="h-72 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={packageProfitData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 20%)" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip contentStyle={customTooltipStyle} formatter={(val: number) => `৳${val.toLocaleString()}`} />
                  <Bar dataKey="revenue" fill={CHART_COLORS.emerald} radius={[0, 4, 4, 0]} name="Revenue" />
                  <Bar dataKey="expenses" fill={CHART_COLORS.destructive} radius={[0, 4, 4, 0]} name="Expenses" />
                  <Bar dataKey="profit" fill={CHART_COLORS.gold} radius={[0, 4, 4, 0]} name="Profit" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 mb-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.emerald }} /> Revenue</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.destructive }} /> Expenses</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.gold }} /> Profit</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-3 pr-3">Package</th><th className="pb-3 pr-3">Bookings</th><th className="pb-3 pr-3">Travelers</th>
                  <th className="pb-3 pr-3">Revenue</th><th className="pb-3 pr-3">Supplier Cost</th><th className="pb-3 pr-3">Expenses</th><th className="pb-3 pr-3">Profit</th><th className="pb-3">Margin</th>
                </tr></thead>
                <tbody>
                  {packageProfitData.map((p) => (
                    <tr key={p.name} className="border-b border-border/50">
                      <td className="py-2.5 pr-3 font-medium">{p.name}</td>
                      <td className="py-2.5 pr-3 text-center">{p.bookings}</td>
                      <td className="py-2.5 pr-3 text-center">{p.travelers}</td>
                      <td className="py-2.5 pr-3" style={{ color: CHART_COLORS.emerald }}>৳{p.revenue.toLocaleString()}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">৳{p.supplierCost.toLocaleString()}</td>
                      <td className="py-2.5 pr-3 text-destructive">৳{p.expenses.toLocaleString()}</td>
                      <td className={`py-2.5 pr-3 font-bold ${p.profit >= 0 ? "text-primary" : "text-destructive"}`}>৳{p.profit.toLocaleString()}</td>
                      <td className="py-2.5"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.margin >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>{p.margin}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : <p className="text-sm text-muted-foreground text-center py-12">No package data.</p>}
      </div>

      {/* Hajji Report */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h4 className="font-heading font-semibold mb-4 flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Hajji-wise Profit Report</h4>
        {hajjiReport.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-3 pr-3">Tracking</th><th className="pb-3 pr-3">Name</th><th className="pb-3 pr-3">Package</th>
                <th className="pb-3 pr-3">Travelers</th><th className="pb-3 pr-3">Total</th><th className="pb-3 pr-3">Paid</th>
                <th className="pb-3 pr-3">Due</th><th className="pb-3 pr-3">Supplier Cost</th><th className="pb-3 pr-3">Supplier Paid</th><th className="pb-3 pr-3">Supplier Due</th><th className="pb-3 pr-3">Expenses</th><th className="pb-3 pr-3">Profit</th>
                <th className="pb-3 pr-3">Status</th><th className="pb-3">Date</th>
              </tr></thead>
              <tbody>
                {hajjiReport.map((r) => (
                  <tr key={r.trackingId} className="border-b border-border/50">
                    <td className="py-2.5 pr-3 font-mono text-xs text-primary">{r.trackingId}</td>
                    <td className="py-2.5 pr-3">{r.name}</td>
                    <td className="py-2.5 pr-3">{r.package}</td>
                    <td className="py-2.5 pr-3 text-center">{r.travelers}</td>
                    <td className="py-2.5 pr-3 font-medium">৳{r.total.toLocaleString()}</td>
                    <td className="py-2.5 pr-3" style={{ color: CHART_COLORS.emerald }}>৳{r.paid.toLocaleString()}</td>
                    <td className="py-2.5 pr-3 text-destructive font-medium">৳{r.due.toLocaleString()}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">৳{r.supplierCost.toLocaleString()}</td>
                    <td className="py-2.5 pr-3" style={{ color: CHART_COLORS.emerald }}>৳{r.supplierPaid.toLocaleString()}</td>
                    <td className="py-2.5 pr-3 text-destructive">৳{r.supplierDue.toLocaleString()}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">৳{r.expenses.toLocaleString()}</td>
                    <td className={`py-2.5 pr-3 font-bold ${r.profit >= 0 ? "text-primary" : "text-destructive"}`}>৳{r.profit.toLocaleString()}</td>
                    <td className="py-2.5 pr-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${r.status === "completed" ? "bg-emerald/10" : r.status === "cancelled" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}
                        style={r.status === "completed" ? { color: CHART_COLORS.emerald } : undefined}>{r.status}</span>
                    </td>
                    <td className="py-2.5 text-muted-foreground text-xs">{format(new Date(r.date), "dd MMM yyyy")}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-bold">
                  <td className="py-3 pr-3" colSpan={4}>Total</td>
                  <td className="py-3 pr-3">৳{hajjiReport.reduce((s, r) => s + r.total, 0).toLocaleString()}</td>
                  <td className="py-3 pr-3" style={{ color: CHART_COLORS.emerald }}>৳{hajjiReport.reduce((s, r) => s + r.paid, 0).toLocaleString()}</td>
                  <td className="py-3 pr-3 text-destructive">৳{hajjiReport.reduce((s, r) => s + r.due, 0).toLocaleString()}</td>
                  <td className="py-3 pr-3 text-muted-foreground">৳{hajjiReport.reduce((s, r) => s + r.supplierCost, 0).toLocaleString()}</td>
                  <td className="py-3 pr-3" style={{ color: CHART_COLORS.emerald }}>৳{hajjiReport.reduce((s, r) => s + r.supplierPaid, 0).toLocaleString()}</td>
                  <td className="py-3 pr-3 text-destructive">৳{hajjiReport.reduce((s, r) => s + r.supplierDue, 0).toLocaleString()}</td>
                  <td className="py-3 pr-3 text-muted-foreground">৳{hajjiReport.reduce((s, r) => s + r.expenses, 0).toLocaleString()}</td>
                  <td className="py-3 pr-3 text-primary">৳{hajjiReport.reduce((s, r) => s + r.profit, 0).toLocaleString()}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : <p className="text-sm text-muted-foreground text-center py-12">No booking data.</p>}
      </div>
    </div>
  );
};

export default AdminDashboardCharts;
