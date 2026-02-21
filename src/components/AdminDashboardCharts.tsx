import { useMemo, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import {
  TrendingUp, DollarSign, Package, AlertTriangle, Calendar, Filter, Users,
  CheckCircle2, XCircle, Clock, RefreshCw, ShieldCheck,
} from "lucide-react";
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, subMonths } from "date-fns";

interface Props {
  bookings: any[];
  payments: any[];
  expenses?: any[];
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
};

const PIE_COLORS = [CHART_COLORS.gold, CHART_COLORS.emerald, CHART_COLORS.goldLight, CHART_COLORS.destructive, CHART_COLORS.muted, CHART_COLORS.goldDark];

const inputClass = "bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

// Reconciliation widget showing per-booking health
const ReconciliationWidget = ({ bookings, payments }: { bookings: any[]; payments: any[] }) => {
  const reconciliationData = useMemo(() => {
    return bookings.map((b) => {
      const bookingPayments = payments.filter((p) => p.booking_id === b.id);
      const completedPayments = bookingPayments.filter((p) => p.status === "completed");
      const sumCompleted = completedPayments.reduce((s, p) => s + Number(p.amount), 0);
      const total = Number(b.total_amount);
      const paid = Number(b.paid_amount);
      const due = Number(b.due_amount || 0);
      const isClamped = sumCompleted > total; // payments exceeded total, clamped
      const isFullyPaid = paid >= total && total > 0;
      const isHealthy = due >= 0 && paid <= total;

      return {
        id: b.id,
        trackingId: b.tracking_id,
        name: b.profiles?.full_name || "N/A",
        packageName: b.packages?.name || "N/A",
        total,
        paid,
        due,
        rawPaymentSum: sumCompleted,
        status: b.status,
        isClamped,
        isFullyPaid,
        isHealthy,
        autoCompleted: b.status === "completed" && isFullyPaid,
        completedPayments: completedPayments.length,
        totalPayments: bookingPayments.length,
        lastPaymentDate: completedPayments.length > 0
          ? completedPayments.sort((a, b) => new Date(b.paid_at || b.created_at).getTime() - new Date(a.paid_at || a.created_at).getTime())[0]?.paid_at
          : null,
      };
    }).sort((a, b) => {
      // Show unhealthy first, then auto-completed, then rest
      if (!a.isHealthy && b.isHealthy) return -1;
      if (a.isHealthy && !b.isHealthy) return 1;
      if (a.autoCompleted && !b.autoCompleted) return -1;
      if (!a.autoCompleted && b.autoCompleted) return 1;
      return 0;
    });
  }, [bookings, payments]);

  const healthyCount = reconciliationData.filter((r) => r.isHealthy).length;
  const autoCompletedCount = reconciliationData.filter((r) => r.autoCompleted).length;
  const clampedCount = reconciliationData.filter((r) => r.isClamped).length;

  if (reconciliationData.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No bookings to reconcile.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-secondary/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-heading font-bold">{reconciliationData.length}</p>
          <p className="text-xs text-muted-foreground">Total Bookings</p>
        </div>
        <div className="bg-emerald/10 rounded-lg p-3 text-center">
          <p className="text-2xl font-heading font-bold" style={{ color: CHART_COLORS.emerald }}>{healthyCount}</p>
          <p className="text-xs text-muted-foreground">Healthy</p>
        </div>
        <div className="bg-primary/10 rounded-lg p-3 text-center">
          <p className="text-2xl font-heading font-bold text-primary">{autoCompletedCount}</p>
          <p className="text-xs text-muted-foreground">Auto-Completed</p>
        </div>
        <div className="bg-destructive/10 rounded-lg p-3 text-center">
          <p className="text-2xl font-heading font-bold text-destructive">{clampedCount}</p>
          <p className="text-xs text-muted-foreground">Clamped (Overpaid)</p>
        </div>
      </div>

      {/* Detail table */}
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="pb-3 pr-3">Status</th>
              <th className="pb-3 pr-3">Tracking ID</th>
              <th className="pb-3 pr-3">Customer</th>
              <th className="pb-3 pr-3">Total</th>
              <th className="pb-3 pr-3">Paid</th>
              <th className="pb-3 pr-3">Due</th>
              <th className="pb-3 pr-3">Payments</th>
              <th className="pb-3">Reconciliation</th>
            </tr>
          </thead>
          <tbody>
            {reconciliationData.map((r) => (
              <tr key={r.id} className="border-b border-border/50">
                <td className="py-2.5 pr-3">
                  {r.autoCompleted ? (
                    <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: CHART_COLORS.emerald }}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Auto-Done
                    </span>
                  ) : !r.isHealthy ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-destructive">
                      <XCircle className="h-3.5 w-3.5" /> Issue
                    </span>
                  ) : r.due > 0 ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                      <Clock className="h-3.5 w-3.5" /> Pending
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: CHART_COLORS.emerald }}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> OK
                    </span>
                  )}
                </td>
                <td className="py-2.5 pr-3 font-mono text-xs text-primary">{r.trackingId}</td>
                <td className="py-2.5 pr-3">{r.name}</td>
                <td className="py-2.5 pr-3 font-medium">৳{r.total.toLocaleString()}</td>
                <td className="py-2.5 pr-3" style={{ color: CHART_COLORS.emerald }}>৳{r.paid.toLocaleString()}</td>
                <td className="py-2.5 pr-3 text-destructive font-medium">৳{r.due.toLocaleString()}</td>
                <td className="py-2.5 pr-3 text-xs text-muted-foreground">
                  {r.completedPayments}/{r.totalPayments} paid
                </td>
                <td className="py-2.5">
                  <div className="flex flex-col gap-0.5">
                    {r.isClamped && (
                      <span className="text-xs text-destructive flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" /> Clamped ৳{r.rawPaymentSum.toLocaleString()} → ৳{r.total.toLocaleString()}
                      </span>
                    )}
                    {r.autoCompleted && r.lastPaymentDate && (
                      <span className="text-xs text-muted-foreground">
                        Completed: {format(new Date(r.lastPaymentDate), "dd MMM yyyy HH:mm")}
                      </span>
                    )}
                    {!r.isClamped && !r.autoCompleted && r.isHealthy && (
                      <span className="text-xs text-muted-foreground">Balanced</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AdminDashboardCharts = ({ bookings, payments, expenses = [], onMarkPaid }: Props) => {
  const [dateFrom, setDateFrom] = useState(() => format(subMonths(new Date(), 11), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [packageTypeFilter, setPackageTypeFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");

  // Filtered data
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const d = new Date(b.created_at);
      const inRange = isWithinInterval(d, { start: parseISO(dateFrom), end: endOfMonth(parseISO(dateTo)) });
      const typeMatch = packageTypeFilter === "all" || b.packages?.type === packageTypeFilter;
      return inRange && typeMatch;
    });
  }, [bookings, dateFrom, dateTo, packageTypeFilter]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const d = new Date(p.created_at);
      const inRange = isWithinInterval(d, { start: parseISO(dateFrom), end: endOfMonth(parseISO(dateTo)) });
      const statusMatch = paymentStatusFilter === "all" || p.status === paymentStatusFilter;
      return inRange && statusMatch;
    });
  }, [payments, dateFrom, dateTo, paymentStatusFilter]);

  // KPIs
  const totalRevenue = filteredPayments.filter((p) => p.status === "completed").reduce((s, p) => s + Number(p.amount), 0);
  const totalBookings = filteredBookings.length;
  const totalDue = filteredBookings.reduce((s, b) => s + Number(b.due_amount || 0), 0);
  const overduePayments = filteredPayments.filter((p) => p.status === "pending" && p.due_date && new Date(p.due_date) < new Date());
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const netProfit = totalRevenue - totalExpenses;

  // Monthly booking chart data
  const monthlyBookings = useMemo(() => {
    const months: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const m = startOfMonth(subMonths(new Date(), i));
      months[format(m, "MMM yyyy")] = 0;
    }
    filteredBookings.forEach((b) => {
      const key = format(new Date(b.created_at), "MMM yyyy");
      if (months[key] !== undefined) months[key]++;
    });
    return Object.entries(months).map(([month, count]) => ({ month, bookings: count }));
  }, [filteredBookings]);

  // Monthly payment collection chart
  const monthlyPayments = useMemo(() => {
    const months: Record<string, { collected: number; pending: number }> = {};
    for (let i = 11; i >= 0; i--) {
      const m = startOfMonth(subMonths(new Date(), i));
      months[format(m, "MMM yyyy")] = { collected: 0, pending: 0 };
    }
    filteredPayments.forEach((p) => {
      const key = format(new Date(p.created_at), "MMM yyyy");
      if (months[key]) {
        if (p.status === "completed") months[key].collected += Number(p.amount);
        else months[key].pending += Number(p.amount);
      }
    });
    return Object.entries(months).map(([month, data]) => ({ month, ...data }));
  }, [filteredPayments]);

  // Monthly revenue chart (completed payments only)
  const monthlyRevenue = useMemo(() => {
    const months: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const m = startOfMonth(subMonths(new Date(), i));
      months[format(m, "MMM yyyy")] = 0;
    }
    filteredPayments.filter(p => p.status === "completed").forEach((p) => {
      const key = format(new Date(p.paid_at || p.created_at), "MMM yyyy");
      if (months[key] !== undefined) months[key] += Number(p.amount);
    });
    return Object.entries(months).map(([month, revenue]) => ({ month, revenue }));
  }, [filteredPayments]);

  // Package type breakdown
  const packageBreakdown = useMemo(() => {
    const types: Record<string, number> = {};
    filteredBookings.forEach((b) => {
      const type = b.packages?.type || "unknown";
      types[type] = (types[type] || 0) + 1;
    });
    return Object.entries(types).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [filteredBookings]);

  // Hajji report table with profit
  const hajjiReport = useMemo(() => {
    return filteredBookings.map((b) => {
      const bookingExpenses = expenses.filter((e) => e.booking_id === b.id);
      const expenseTotal = bookingExpenses.reduce((s, e) => s + Number(e.amount), 0);
      const revenue = Number(b.paid_amount);
      const profit = revenue - expenseTotal;
      return {
        trackingId: b.tracking_id,
        name: b.profiles?.full_name || "N/A",
        package: b.packages?.name || "N/A",
        type: b.packages?.type || "N/A",
        travelers: b.num_travelers,
        total: Number(b.total_amount),
        paid: revenue,
        due: Number(b.due_amount || 0),
        expenses: expenseTotal,
        profit,
        status: b.status,
        date: b.created_at,
      };
    });
  }, [filteredBookings, expenses]);

  // Package-wise profit analytics
  const packageProfitData = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; expenses: number; bookings: number; travelers: number }> = {};
    filteredBookings.forEach((b) => {
      const pkgName = b.packages?.name || "Unknown";
      if (!map[pkgName]) map[pkgName] = { name: pkgName, revenue: 0, expenses: 0, bookings: 0, travelers: 0 };
      map[pkgName].revenue += Number(b.paid_amount);
      map[pkgName].bookings += 1;
      map[pkgName].travelers += Number(b.num_travelers);
      const bookingExpenses = expenses.filter((e) => e.booking_id === b.id);
      map[pkgName].expenses += bookingExpenses.reduce((s, e) => s + Number(e.amount), 0);
    });
    return Object.values(map).map((p) => ({ ...p, profit: p.revenue - p.expenses, margin: p.revenue > 0 ? Math.round(((p.revenue - p.expenses) / p.revenue) * 100) : 0 })).sort((a, b) => b.profit - a.profit);
  }, [filteredBookings, expenses]);

  const customTooltipStyle = {
    backgroundColor: "hsl(220, 18%, 14%)",
    border: "1px solid hsl(220, 15%, 20%)",
    borderRadius: "8px",
    color: "hsl(40, 20%, 92%)",
    fontSize: "12px",
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Filters</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">From</label>
            <input type="date" className={inputClass + " w-full"} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">To</label>
            <input type="date" className={inputClass + " w-full"} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Package Type</label>
            <select className={inputClass + " w-full"} value={packageTypeFilter} onChange={(e) => setPackageTypeFilter(e.target.value)}>
              <option value="all">All Types</option>
              {["hajj", "umrah", "visa", "hotel", "transport", "ziyara"].map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Payment Status</label>
            <select className={inputClass + " w-full"} value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              {["pending", "completed", "failed", "refunded"].map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Total Bookings", value: totalBookings, icon: Package, color: "text-foreground", bgColor: "bg-secondary" },
          { label: "Total Revenue", value: `৳${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-primary", bgColor: "bg-primary/10" },
          { label: "Total Expenses", value: `৳${totalExpenses.toLocaleString()}`, icon: TrendingUp, color: "text-destructive", bgColor: "bg-destructive/10" },
          { label: "Net Profit", value: `৳${netProfit.toLocaleString()}`, icon: DollarSign, color: netProfit >= 0 ? "text-emerald" : "text-destructive", bgColor: netProfit >= 0 ? "bg-emerald/10" : "bg-destructive/10" },
          { label: "Total Due", value: `৳${totalDue.toLocaleString()}`, icon: AlertTriangle, color: "text-primary", bgColor: "bg-primary/10" },
          { label: "Overdue Alerts", value: overduePayments.length, icon: AlertTriangle, color: "text-destructive", bgColor: "bg-destructive/10" },
        ].map((c) => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <div className={`w-8 h-8 rounded-lg ${c.bgColor} flex items-center justify-center`}>
                <c.icon className={`h-3.5 w-3.5 ${c.color}`} />
              </div>
            </div>
            <p className={`text-xl font-heading font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Bookings */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h4 className="font-heading font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" /> Monthly Bookings
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyBookings}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 20%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Bar dataKey="bookings" fill={CHART_COLORS.gold} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Collection */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h4 className="font-heading font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" /> Payment Collection
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyPayments}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 20%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={customTooltipStyle} formatter={(val: number) => `৳${val.toLocaleString()}`} />
                <Area type="monotone" dataKey="collected" stackId="1" stroke={CHART_COLORS.emerald} fill={CHART_COLORS.emerald} fillOpacity={0.3} />
                <Area type="monotone" dataKey="pending" stackId="1" stroke={CHART_COLORS.gold} fill={CHART_COLORS.gold} fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-3 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.emerald }} /> Collected</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.gold }} /> Pending</span>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h4 className="font-heading font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Monthly Revenue
        </h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 20%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={customTooltipStyle} formatter={(val: number) => `৳${val.toLocaleString()}`} />
              <Line type="monotone" dataKey="revenue" stroke={CHART_COLORS.emerald} strokeWidth={2} dot={{ fill: CHART_COLORS.emerald, r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Package Breakdown Pie + Overdue Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <h4 className="font-heading font-semibold mb-4 flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" /> Bookings by Type
          </h4>
          {packageBreakdown.length > 0 ? (
            <>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={packageBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {packageBreakdown.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={customTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 mt-2">
                {packageBreakdown.map((item, i) => (
                  <span key={item.name} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {item.name} ({item.value})
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">No data</p>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5 lg:col-span-2">
          <h4 className="font-heading font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Overdue Payment Alerts
          </h4>
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
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">No overdue payments 🎉</p>
          )}
        </div>
      </div>

      {/* Reconciliation Status Widget */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h4 className="font-heading font-semibold mb-4 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" /> Reconciliation Status & History
        </h4>
        <ReconciliationWidget bookings={filteredBookings} payments={filteredPayments} />
      </div>

      {/* Package-wise Profit Analytics */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h4 className="font-heading font-semibold mb-4 flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" /> Package-wise Profit Analytics
        </h4>
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
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-3 pr-3">Package</th>
                    <th className="pb-3 pr-3">Bookings</th>
                    <th className="pb-3 pr-3">Travelers</th>
                    <th className="pb-3 pr-3">Revenue</th>
                    <th className="pb-3 pr-3">Expenses</th>
                    <th className="pb-3 pr-3">Profit</th>
                    <th className="pb-3">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {packageProfitData.map((p) => (
                    <tr key={p.name} className="border-b border-border/50">
                      <td className="py-2.5 pr-3 font-medium">{p.name}</td>
                      <td className="py-2.5 pr-3 text-center">{p.bookings}</td>
                      <td className="py-2.5 pr-3 text-center">{p.travelers}</td>
                      <td className="py-2.5 pr-3" style={{ color: CHART_COLORS.emerald }}>৳{p.revenue.toLocaleString()}</td>
                      <td className="py-2.5 pr-3 text-destructive">৳{p.expenses.toLocaleString()}</td>
                      <td className={`py-2.5 pr-3 font-bold ${p.profit >= 0 ? "text-primary" : "text-destructive"}`}>৳{p.profit.toLocaleString()}</td>
                      <td className="py-2.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.margin >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                          {p.margin}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-12">No package data available.</p>
        )}
      </div>

      {/* Hajji-wise Profit Report */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h4 className="font-heading font-semibold mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /> Hajji-wise Profit Report
        </h4>
        {hajjiReport.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-3 pr-3">Tracking ID</th>
                  <th className="pb-3 pr-3">Name</th>
                  <th className="pb-3 pr-3">Package</th>
                  <th className="pb-3 pr-3">Travelers</th>
                  <th className="pb-3 pr-3">Total</th>
                  <th className="pb-3 pr-3">Paid</th>
                  <th className="pb-3 pr-3">Due</th>
                  <th className="pb-3 pr-3">Expenses</th>
                  <th className="pb-3 pr-3">Profit</th>
                  <th className="pb-3 pr-3">Status</th>
                  <th className="pb-3">Date</th>
                </tr>
              </thead>
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
                    <td className="py-2.5 pr-3 text-muted-foreground">৳{r.expenses.toLocaleString()}</td>
                    <td className={`py-2.5 pr-3 font-bold ${r.profit >= 0 ? "text-primary" : "text-destructive"}`}>৳{r.profit.toLocaleString()}</td>
                    <td className="py-2.5 pr-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                        r.status === "completed" ? "bg-emerald/10" : r.status === "cancelled" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                      }`} style={r.status === "completed" ? { color: CHART_COLORS.emerald } : undefined}>
                        {r.status}
                      </span>
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
                  <td className="py-3 pr-3 text-muted-foreground">৳{hajjiReport.reduce((s, r) => s + r.expenses, 0).toLocaleString()}</td>
                  <td className="py-3 pr-3 text-primary">৳{hajjiReport.reduce((s, r) => s + r.profit, 0).toLocaleString()}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-12">No booking data for selected filters.</p>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardCharts;
