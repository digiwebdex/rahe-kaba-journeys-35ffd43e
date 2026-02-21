import { useEffect, useMemo, useState, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, FileDown, FileSpreadsheet } from "lucide-react";
import { format, parseISO, isSameDay, isSameMonth, isSameYear, differenceInDays, startOfMonth, getYear, getMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { exportPDF, exportExcel } from "@/lib/reportExport";

const fmt = (n: number) => `৳${n.toLocaleString()}`;

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function AdminReportsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [expenseTransactions, setExpenseTransactions] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState("daily");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMonth, setSelectedMonth] = useState(String(getMonth(new Date())));
  const [selectedYear, setSelectedYear] = useState(String(getYear(new Date())));

  useEffect(() => {
    Promise.all([
      supabase.from("bookings").select("*, packages(name, type)").order("created_at", { ascending: false }),
      supabase.from("payments").select("*, bookings(tracking_id)").order("created_at", { ascending: false }),
      supabase.from("expenses").select("*").order("date", { ascending: false }),
      supabase.from("profiles").select("*"),
      supabase.from("transactions").select("*").eq("type", "expense"),
    ]).then(([bk, py, ex, pr, tx]) => {
      setBookings(bk.data || []);
      setPayments(py.data || []);
      setExpenses(ex.data || []);
      setProfiles(pr.data || []);
      setExpenseTransactions(tx.data || []);
    });
  }, []);

  const profileMap = useMemo(() => {
    const m: Record<string, any> = {};
    profiles.forEach((p) => { m[p.user_id] = p; });
    return m;
  }, [profiles]);

  const years = useMemo(() => {
    const s = new Set<number>();
    bookings.forEach((b) => s.add(getYear(parseISO(b.created_at))));
    payments.forEach((p) => s.add(getYear(parseISO(p.created_at))));
    if (s.size === 0) s.add(getYear(new Date()));
    return Array.from(s).sort((a, b) => b - a);
  }, [bookings, payments]);

  // ── Daily Report ──
  const dailyRows = useMemo(() => {
    return bookings
      .filter((b) => isSameDay(parseISO(b.created_at), selectedDate))
      .map((b) => ({
        trackingId: b.tracking_id,
        package: b.packages?.name || "-",
        amount: Number(b.total_amount),
        paid: Number(b.paid_amount),
        due: Number(b.due_amount ?? b.total_amount - b.paid_amount),
        status: b.status,
      }));
  }, [bookings, selectedDate]);

  // ── Monthly Report ──
  const monthlyRows = useMemo(() => {
    const yr = Number(selectedYear);
    const grouped: Record<number, { bookings: number; revenue: number; expenses: number }> = {};
    for (let i = 0; i < 12; i++) grouped[i] = { bookings: 0, revenue: 0, expenses: 0 };

    bookings.filter((b) => getYear(parseISO(b.created_at)) === yr).forEach((b) => {
      grouped[getMonth(parseISO(b.created_at))].bookings++;
    });
    payments.filter((p) => p.status === "completed" && getYear(parseISO(p.created_at)) === yr).forEach((p) => {
      grouped[getMonth(parseISO(p.created_at))].revenue += Number(p.amount);
    });
    expenses.filter((e) => getYear(parseISO(e.date)) === yr).forEach((e) => {
      grouped[getMonth(parseISO(e.date))].expenses += Number(e.amount);
    });

    return Object.entries(grouped).map(([m, d]) => ({
      month: MONTHS[Number(m)],
      ...d,
      profit: d.revenue - d.expenses,
    }));
  }, [bookings, payments, expenses, selectedYear]);

  // ── Yearly Report ──
  const yearlyRows = useMemo(() => {
    const map: Record<number, { bookings: number; revenue: number; expenses: number }> = {};
    years.forEach((y) => { map[y] = { bookings: 0, revenue: 0, expenses: 0 }; });

    bookings.forEach((b) => {
      const y = getYear(parseISO(b.created_at));
      if (map[y]) map[y].bookings++;
    });
    payments.filter((p) => p.status === "completed").forEach((p) => {
      const y = getYear(parseISO(p.created_at));
      if (map[y]) map[y].revenue += Number(p.amount);
    });
    expenses.forEach((e) => {
      const y = getYear(parseISO(e.date));
      if (map[y]) map[y].expenses += Number(e.amount);
    });

    return Object.entries(map).map(([y, d]) => ({ year: y, ...d, profit: d.revenue - d.expenses }));
  }, [bookings, payments, expenses, years]);

  // ── Package-wise Revenue ──
  const packageRows = useMemo(() => {
    const map: Record<string, { name: string; type: string; count: number; revenue: number; expenses: number }> = {};

    bookings.forEach((b) => {
      const key = b.package_id;
      if (!map[key]) map[key] = { name: b.packages?.name || "-", type: b.packages?.type || "-", count: 0, revenue: 0, expenses: 0 };
      map[key].count++;
    });

    payments.filter((p) => p.status === "completed").forEach((p) => {
      const bk = bookings.find((b) => b.id === p.booking_id);
      if (bk && map[bk.package_id]) map[bk.package_id].revenue += Number(p.amount);
    });

    expenseTransactions.forEach((t) => {
      if (t.booking_id) {
        const bk = bookings.find((b) => b.id === t.booking_id);
        if (bk && map[bk.package_id]) map[bk.package_id].expenses += Number(t.amount);
      }
    });

    return Object.values(map).map((d) => ({ ...d, profit: d.revenue - d.expenses }));
  }, [bookings, payments, expenseTransactions]);

  // ── Hajji-wise Revenue ──
  const hajjiRows = useMemo(() => {
    const map: Record<string, { name: string; phone: string; passport: string; count: number; travelers: number; revenue: number; due: number; expenses: number; bookingDetails: { trackingId: string; packageName: string; total: number; paid: number; due: number; status: string; date: string }[] }> = {};

    bookings.forEach((b) => {
      const uid = b.user_id;
      const profile = profileMap[uid];
      if (!map[uid]) map[uid] = { name: profile?.full_name || "Unknown", phone: profile?.phone || "-", passport: profile?.passport_number || "-", count: 0, travelers: 0, revenue: 0, due: 0, expenses: 0, bookingDetails: [] };
      map[uid].count++;
      map[uid].travelers += Number(b.num_travelers || 1);
      map[uid].bookingDetails.push({
        trackingId: b.tracking_id,
        packageName: b.packages?.name || "-",
        total: Number(b.total_amount),
        paid: Number(b.paid_amount),
        due: Number(b.due_amount ?? b.total_amount - b.paid_amount),
        status: b.status,
        date: format(parseISO(b.created_at), "dd MMM yyyy"),
      });
    });

    payments.forEach((p) => {
      if (p.status === "completed" && map[p.user_id]) map[p.user_id].revenue += Number(p.amount);
      if (p.status === "pending" && map[p.user_id]) map[p.user_id].due += Number(p.amount);
    });

    expenseTransactions.forEach((t) => {
      if (t.booking_id) {
        const bk = bookings.find((b) => b.id === t.booking_id);
        if (bk && map[bk.user_id]) map[bk.user_id].expenses += Number(t.amount);
      }
    });

    return Object.values(map).map((d) => ({ ...d, profit: d.revenue - d.expenses }));
  }, [bookings, payments, expenseTransactions, profileMap]);

  // ── Due Report ──
  const dueRows = useMemo(() => {
    return payments
      .filter((p) => p.status === "pending")
      .map((p) => {
        const profile = profileMap[p.user_id];
        return {
          trackingId: p.bookings?.tracking_id || "-",
          customer: profile?.full_name || "Unknown",
          installment: p.installment_number ?? "-",
          amount: Number(p.amount),
          dueDate: p.due_date ? format(parseISO(p.due_date), "dd MMM yyyy") : "-",
        };
      });
  }, [payments, profileMap]);

  // ── Overdue Report ──
  const overdueRows = useMemo(() => {
    const today = new Date();
    return payments
      .filter((p) => p.status === "pending" && p.due_date && parseISO(p.due_date) < today)
      .map((p) => {
        const profile = profileMap[p.user_id];
        return {
          trackingId: p.bookings?.tracking_id || "-",
          customer: profile?.full_name || "Unknown",
          installment: p.installment_number ?? "-",
          amount: Number(p.amount),
          dueDate: p.due_date ? format(parseISO(p.due_date), "dd MMM yyyy") : "-",
          daysOverdue: differenceInDays(today, parseISO(p.due_date)),
        };
      });
  }, [payments, profileMap]);

  // ── Export helpers ──
  const getExportData = () => {
    switch (activeTab) {
      case "daily":
        return { title: `Daily Report - ${format(selectedDate, "dd MMM yyyy")}`, columns: ["Tracking ID","Package","Amount","Paid","Due","Status"], rows: dailyRows.map((r) => [r.trackingId, r.package, r.amount, r.paid, r.due, r.status]) };
      case "monthly":
        return { title: `Monthly Report - ${selectedYear}`, columns: ["Month","Bookings","Revenue","Expenses","Net Profit"], rows: monthlyRows.map((r) => [r.month, r.bookings, r.revenue, r.expenses, r.profit]) };
      case "yearly":
        return { title: "Yearly Report", columns: ["Year","Bookings","Revenue","Expenses","Net Profit"], rows: yearlyRows.map((r) => [r.year, r.bookings, r.revenue, r.expenses, r.profit]) };
      case "package":
        return { title: "Package-wise Revenue", columns: ["Package","Type","Bookings","Revenue","Expenses","Profit"], rows: packageRows.map((r) => [r.name, r.type, r.count, r.revenue, r.expenses, r.profit]) };
      case "hajji":
        return { title: "Hajji-wise Revenue", columns: ["Customer","Phone","Passport","Bookings","Travelers","Revenue","Due","Expenses","Profit"], rows: hajjiRows.map((r) => [r.name, r.phone, r.passport, r.count, r.travelers, r.revenue, r.due, r.expenses, r.profit]) };
      case "due":
        return { title: "Due Report", columns: ["Tracking ID","Customer","Installment","Amount","Due Date"], rows: dueRows.map((r) => [r.trackingId, r.customer, r.installment, r.amount, r.dueDate]) };
      case "overdue":
        return { title: "Overdue Report", columns: ["Tracking ID","Customer","Installment","Amount","Due Date","Days Overdue"], rows: overdueRows.map((r) => [r.trackingId, r.customer, r.installment, r.amount, r.dueDate, r.daysOverdue]) };
      default:
        return { title: "Report", columns: [], rows: [] };
    }
  };

  // ── Summary cards per tab ──
  const summaryCards = useMemo(() => {
    switch (activeTab) {
      case "daily": {
        const total = dailyRows.reduce((s, r) => s + r.amount, 0);
        const paid = dailyRows.reduce((s, r) => s + r.paid, 0);
        return [
          { label: "Bookings", value: dailyRows.length },
          { label: "Total Amount", value: fmt(total) },
          { label: "Paid", value: fmt(paid) },
          { label: "Due", value: fmt(total - paid) },
        ];
      }
      case "monthly": {
        const totals = monthlyRows.reduce((a, r) => ({ bk: a.bk + r.bookings, rev: a.rev + r.revenue, exp: a.exp + r.expenses }), { bk: 0, rev: 0, exp: 0 });
        return [
          { label: "Total Bookings", value: totals.bk },
          { label: "Revenue", value: fmt(totals.rev) },
          { label: "Expenses", value: fmt(totals.exp) },
          { label: "Net Profit", value: fmt(totals.rev - totals.exp) },
        ];
      }
      case "yearly": {
        const totals = yearlyRows.reduce((a, r) => ({ bk: a.bk + r.bookings, rev: a.rev + r.revenue, exp: a.exp + r.expenses }), { bk: 0, rev: 0, exp: 0 });
        return [
          { label: "Total Bookings", value: totals.bk },
          { label: "Revenue", value: fmt(totals.rev) },
          { label: "Expenses", value: fmt(totals.exp) },
          { label: "Net Profit", value: fmt(totals.rev - totals.exp) },
        ];
      }
      case "package": {
        const totals = packageRows.reduce((a, r) => ({ rev: a.rev + r.revenue, exp: a.exp + r.expenses }), { rev: 0, exp: 0 });
        return [
          { label: "Packages", value: packageRows.length },
          { label: "Revenue", value: fmt(totals.rev) },
          { label: "Expenses", value: fmt(totals.exp) },
          { label: "Net Profit", value: fmt(totals.rev - totals.exp) },
        ];
      }
      case "hajji": {
        const totals = hajjiRows.reduce((a, r) => ({ rev: a.rev + r.revenue, due: a.due + r.due, exp: a.exp + r.expenses, travelers: a.travelers + r.travelers }), { rev: 0, due: 0, exp: 0, travelers: 0 });
        return [
          { label: "Customers", value: hajjiRows.length },
          { label: "Total Travelers", value: totals.travelers },
          { label: "Revenue", value: fmt(totals.rev) },
          { label: "Total Due", value: fmt(totals.due) },
        ];
      }
      case "due":
        return [
          { label: "Pending Payments", value: dueRows.length },
          { label: "Total Due", value: fmt(dueRows.reduce((s, r) => s + r.amount, 0)) },
        ];
      case "overdue":
        return [
          { label: "Overdue Payments", value: overdueRows.length },
          { label: "Total Overdue", value: fmt(overdueRows.reduce((s, r) => s + r.amount, 0)) },
        ];
      default:
        return [];
    }
  }, [activeTab, dailyRows, monthlyRows, yearlyRows, packageRows, hajjiRows, dueRows, overdueRows]);

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="font-heading text-xl font-bold">Reports</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportPDF(getExportData())}>
            <FileDown className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportExcel(getExportData())}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="yearly">Yearly</TabsTrigger>
          <TabsTrigger value="package">Package-wise</TabsTrigger>
          <TabsTrigger value="hajji">Hajji-wise</TabsTrigger>
          <TabsTrigger value="due">Due</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex items-center gap-3 py-3 flex-wrap">
          {(activeTab === "daily") && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal w-[200px]")}>
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {format(selectedDate, "dd MMM yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          )}
          {(activeTab === "monthly") && (
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {summaryCards.map((c) => (
            <Card key={c.label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-lg font-heading font-bold">{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Daily */}
        <TabsContent value="daily">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Tracking ID</TableHead><TableHead>Package</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Paid</TableHead><TableHead className="text-right">Due</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {dailyRows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No bookings on this date</TableCell></TableRow>}
              {dailyRows.map((r, i) => (
                <TableRow key={i}><TableCell className="font-mono text-xs">{r.trackingId}</TableCell><TableCell>{r.package}</TableCell><TableCell className="text-right">{fmt(r.amount)}</TableCell><TableCell className="text-right">{fmt(r.paid)}</TableCell><TableCell className="text-right">{fmt(r.due)}</TableCell><TableCell className="capitalize">{r.status}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Monthly */}
        <TabsContent value="monthly">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Month</TableHead><TableHead className="text-right">Bookings</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Expenses</TableHead><TableHead className="text-right">Net Profit</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {monthlyRows.map((r) => (
                <TableRow key={r.month}><TableCell>{r.month}</TableCell><TableCell className="text-right">{r.bookings}</TableCell><TableCell className="text-right">{fmt(r.revenue)}</TableCell><TableCell className="text-right">{fmt(r.expenses)}</TableCell><TableCell className={cn("text-right font-bold", r.profit >= 0 ? "text-emerald" : "text-destructive")}>{fmt(r.profit)}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Yearly */}
        <TabsContent value="yearly">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Year</TableHead><TableHead className="text-right">Bookings</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Expenses</TableHead><TableHead className="text-right">Net Profit</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {yearlyRows.map((r) => (
                <TableRow key={r.year}><TableCell>{r.year}</TableCell><TableCell className="text-right">{r.bookings}</TableCell><TableCell className="text-right">{fmt(r.revenue)}</TableCell><TableCell className="text-right">{fmt(r.expenses)}</TableCell><TableCell className={cn("text-right font-bold", r.profit >= 0 ? "text-emerald" : "text-destructive")}>{fmt(r.profit)}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Package-wise */}
        <TabsContent value="package">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Package</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Bookings</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Expenses</TableHead><TableHead className="text-right">Profit</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {packageRows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No data</TableCell></TableRow>}
              {packageRows.map((r, i) => (
                <TableRow key={i}><TableCell>{r.name}</TableCell><TableCell className="capitalize">{r.type}</TableCell><TableCell className="text-right">{r.count}</TableCell><TableCell className="text-right">{fmt(r.revenue)}</TableCell><TableCell className="text-right">{fmt(r.expenses)}</TableCell><TableCell className={cn("text-right font-bold", r.profit >= 0 ? "text-emerald" : "text-destructive")}>{fmt(r.profit)}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="hajji">
          <HajjiReportTable rows={hajjiRows} fmt={fmt} />
        </TabsContent>

        {/* Due */}
        <TabsContent value="due">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Tracking ID</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Installment</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Due Date</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {dueRows.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No pending payments</TableCell></TableRow>}
              {dueRows.map((r, i) => (
                <TableRow key={i}><TableCell className="font-mono text-xs">{r.trackingId}</TableCell><TableCell>{r.customer}</TableCell><TableCell className="text-right">{r.installment}</TableCell><TableCell className="text-right">{fmt(r.amount)}</TableCell><TableCell>{r.dueDate}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Overdue */}
        <TabsContent value="overdue">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Tracking ID</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Installment</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Due Date</TableHead><TableHead className="text-right">Days Overdue</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {overdueRows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No overdue payments</TableCell></TableRow>}
              {overdueRows.map((r, i) => (
                <TableRow key={i}><TableCell className="font-mono text-xs">{r.trackingId}</TableCell><TableCell>{r.customer}</TableCell><TableCell className="text-right">{r.installment}</TableCell><TableCell className="text-right">{fmt(r.amount)}</TableCell><TableCell>{r.dueDate}</TableCell><TableCell className="text-right text-destructive font-bold">{r.daysOverdue}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Hajji Report Expandable Table ──
import { ChevronDown, ChevronUp, Users } from "lucide-react";

function HajjiReportTable({ rows, fmt }: { rows: any[]; fmt: (n: number) => string }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const totals = rows.reduce(
    (a, r) => ({ bookings: a.bookings + r.count, travelers: a.travelers + r.travelers, revenue: a.revenue + r.revenue, due: a.due + r.due, expenses: a.expenses + r.expenses, profit: a.profit + r.profit }),
    { bookings: 0, travelers: 0, revenue: 0, due: 0, expenses: 0, profit: 0 }
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8"></TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Passport</TableHead>
          <TableHead className="text-right">Bookings</TableHead>
          <TableHead className="text-right">Travelers</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
          <TableHead className="text-right">Due</TableHead>
          <TableHead className="text-right">Expenses</TableHead>
          <TableHead className="text-right">Profit</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && (
          <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">No data</TableCell></TableRow>
        )}
        {rows.map((r, i) => (
          <Fragment key={i}>
            <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setExpanded(expanded === i ? null : i)}>
              <TableCell className="px-2">
                {expanded === i ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Users className="h-3.5 w-3.5 text-primary" />
                  </div>
                  {r.name}
                </div>
              </TableCell>
              <TableCell>{r.phone}</TableCell>
              <TableCell className="text-xs">{r.passport}</TableCell>
              <TableCell className="text-right">{r.count}</TableCell>
              <TableCell className="text-right">{r.travelers}</TableCell>
              <TableCell className="text-right">{fmt(r.revenue)}</TableCell>
              <TableCell className="text-right text-destructive">{fmt(r.due)}</TableCell>
              <TableCell className="text-right">{fmt(r.expenses)}</TableCell>
              <TableCell className={cn("text-right font-bold", r.profit >= 0 ? "text-emerald" : "text-destructive")}>{fmt(r.profit)}</TableCell>
            </TableRow>
            {expanded === i && (
              <TableRow>
                <TableCell colSpan={10} className="bg-muted/20 p-0">
                  <div className="p-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Booking Details for {r.name}</p>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-muted-foreground border-b border-border/50">
                          <th className="pb-2 pr-3">Tracking ID</th>
                          <th className="pb-2 pr-3">Package</th>
                          <th className="pb-2 pr-3">Date</th>
                          <th className="pb-2 pr-3 text-right">Total</th>
                          <th className="pb-2 pr-3 text-right">Paid</th>
                          <th className="pb-2 pr-3 text-right">Due</th>
                          <th className="pb-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.bookingDetails.map((bd: any, j: number) => (
                          <tr key={j} className="border-b border-border/30">
                            <td className="py-2 pr-3 font-mono text-xs text-primary">{bd.trackingId}</td>
                            <td className="py-2 pr-3">{bd.packageName}</td>
                            <td className="py-2 pr-3 text-muted-foreground">{bd.date}</td>
                            <td className="py-2 pr-3 text-right">{fmt(bd.total)}</td>
                            <td className="py-2 pr-3 text-right text-emerald">{fmt(bd.paid)}</td>
                            <td className="py-2 pr-3 text-right text-destructive">{fmt(bd.due)}</td>
                            <td className="py-2 capitalize">
                              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full",
                                bd.status === "completed" ? "bg-emerald/10 text-emerald" :
                                bd.status === "cancelled" ? "bg-destructive/10 text-destructive" :
                                "bg-primary/10 text-primary"
                              )}>{bd.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </Fragment>
        ))}
        {/* Totals row */}
        {rows.length > 0 && (
          <TableRow className="bg-muted/40 font-bold border-t-2 border-border">
            <TableCell></TableCell>
            <TableCell>Total</TableCell>
            <TableCell></TableCell>
            <TableCell></TableCell>
            <TableCell className="text-right">{totals.bookings}</TableCell>
            <TableCell className="text-right">{totals.travelers}</TableCell>
            <TableCell className="text-right">{fmt(totals.revenue)}</TableCell>
            <TableCell className="text-right text-destructive">{fmt(totals.due)}</TableCell>
            <TableCell className="text-right">{fmt(totals.expenses)}</TableCell>
            <TableCell className={cn("text-right", totals.profit >= 0 ? "text-emerald" : "text-destructive")}>{fmt(totals.profit)}</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}