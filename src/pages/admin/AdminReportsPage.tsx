import { useEffect, useMemo, useState, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, FileDown, FileSpreadsheet, ChevronDown, ChevronUp, Users, TrendingUp, TrendingDown, DollarSign, Filter } from "lucide-react";
import { format, parseISO, isSameDay, isSameMonth, isSameYear, differenceInDays, startOfMonth, endOfMonth, getYear, getMonth, isWithinInterval, eachDayOfInterval, eachMonthOfInterval, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { exportPDF, exportExcel, exportHajjiPDF, exportHajjiExcel } from "@/lib/reportExport";

const fmt = (n: number) => `৳${n.toLocaleString()}`;
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function AdminReportsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [expenseTransactions, setExpenseTransactions] = useState<any[]>([]);
  const [moallems, setMoallems] = useState<any[]>([]);
  const [moallemPayments, setMoallemPayments] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState("daily-financial");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedYear, setSelectedYear] = useState(String(getYear(new Date())));
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(subMonths(new Date(), 0)));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [moallemDateFrom, setMoallemDateFrom] = useState<Date>(startOfMonth(subMonths(new Date(), 5)));
  const [moallemDateTo, setMoallemDateTo] = useState<Date>(new Date());

  useEffect(() => {
    Promise.all([
      supabase.from("bookings").select("*, packages(name, type)").order("created_at", { ascending: false }),
      supabase.from("payments").select("*, bookings(tracking_id)").order("created_at", { ascending: false }),
      supabase.from("expenses").select("*").order("date", { ascending: false }),
      supabase.from("profiles").select("*"),
      supabase.from("transactions").select("*").eq("type", "expense"),
      supabase.from("moallems").select("*"),
      supabase.from("moallem_payments").select("*").order("date", { ascending: false }),
    ]).then(([bk, py, ex, pr, tx, ml, mp]) => {
      setBookings(bk.data || []);
      setPayments(py.data || []);
      setExpenses(ex.data || []);
      setProfiles(pr.data || []);
      setExpenseTransactions(tx.data || []);
      setMoallems(ml.data || []);
      setMoallemPayments(mp.data || []);
    });
  }, []);

  const profileMap = useMemo(() => {
    const m: Record<string, any> = {};
    profiles.forEach((p) => { m[p.user_id] = p; });
    return m;
  }, [profiles]);

  const moallemMap = useMemo(() => {
    const m: Record<string, any> = {};
    moallems.forEach((ml) => { m[ml.id] = ml; });
    return m;
  }, [moallems]);

  const years = useMemo(() => {
    const s = new Set<number>();
    bookings.forEach((b) => s.add(getYear(parseISO(b.created_at))));
    payments.forEach((p) => s.add(getYear(parseISO(p.created_at))));
    if (s.size === 0) s.add(getYear(new Date()));
    return Array.from(s).sort((a, b) => b - a);
  }, [bookings, payments]);

  // ── Daily Financial Report (date range) ──
  const dailyFinancialRows = useMemo(() => {
    const days = eachDayOfInterval({ start: dateFrom, end: dateTo });
    return days.map((day) => {
      const income = payments
        .filter((p) => p.status === "completed" && p.paid_at && isSameDay(parseISO(p.paid_at), day))
        .reduce((s: number, p: any) => s + Number(p.amount), 0);
      const expense = expenses
        .filter((e) => isSameDay(parseISO(e.date), day))
        .reduce((s: number, e: any) => s + Number(e.amount), 0);
      const bookingCount = bookings.filter((b) => isSameDay(parseISO(b.created_at), day)).length;
      return { date: format(day, "dd MMM yyyy"), income, expense, profit: income - expense, bookings: bookingCount };
    }).reverse();
  }, [payments, expenses, bookings, dateFrom, dateTo]);

  // ── Monthly Financial Report ──
  const monthlyFinancialRows = useMemo(() => {
    const yr = Number(selectedYear);
    return Array.from({ length: 12 }, (_, i) => {
      const income = payments
        .filter((p) => p.status === "completed" && p.paid_at && getYear(parseISO(p.paid_at)) === yr && getMonth(parseISO(p.paid_at)) === i)
        .reduce((s: number, p: any) => s + Number(p.amount), 0);
      const expense = expenses
        .filter((e) => getYear(parseISO(e.date)) === yr && getMonth(parseISO(e.date)) === i)
        .reduce((s: number, e: any) => s + Number(e.amount), 0);
      const bookingCount = bookings.filter((b) => getYear(parseISO(b.created_at)) === yr && getMonth(parseISO(b.created_at)) === i).length;
      return { month: MONTHS[i], income, expense, profit: income - expense, bookings: bookingCount };
    });
  }, [payments, expenses, bookings, selectedYear]);

  // ── Yearly Summary ──
  const yearlyRows = useMemo(() => {
    const map: Record<number, { income: number; expense: number; bookings: number }> = {};
    years.forEach((y) => { map[y] = { income: 0, expense: 0, bookings: 0 }; });
    payments.filter((p) => p.status === "completed" && p.paid_at).forEach((p) => {
      const y = getYear(parseISO(p.paid_at));
      if (map[y]) map[y].income += Number(p.amount);
    });
    expenses.forEach((e) => {
      const y = getYear(parseISO(e.date));
      if (map[y]) map[y].expense += Number(e.amount);
    });
    bookings.forEach((b) => {
      const y = getYear(parseISO(b.created_at));
      if (map[y]) map[y].bookings++;
    });
    return Object.entries(map).map(([y, d]) => ({ year: y, ...d, profit: d.income - d.expense })).sort((a, b) => Number(b.year) - Number(a.year));
  }, [bookings, payments, expenses, years]);

  // ── Profit & Loss ──
  const pnlData = useMemo(() => {
    const yr = Number(selectedYear);
    const completedPayments = payments.filter((p) => p.status === "completed" && p.paid_at && getYear(parseISO(p.paid_at)) === yr);
    const yearExpenses = expenses.filter((e) => getYear(parseISO(e.date)) === yr);
    const incomeByType: Record<string, number> = {};
    completedPayments.forEach((p) => {
      const bk = bookings.find((b) => b.id === p.booking_id);
      const cat = bk?.packages?.type ? `${bk.packages.type.charAt(0).toUpperCase() + bk.packages.type.slice(1)} Package` : "Other Income";
      incomeByType[cat] = (incomeByType[cat] || 0) + Number(p.amount);
    });
    const expenseByType: Record<string, number> = {};
    yearExpenses.forEach((e) => {
      const label = (e.expense_type || "other").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
      expenseByType[label] = (expenseByType[label] || 0) + Number(e.amount);
    });
    const totalIncome = Object.values(incomeByType).reduce((s, v) => s + v, 0);
    const totalExpense = Object.values(expenseByType).reduce((s, v) => s + v, 0);
    const grossProfit = totalIncome;
    const netProfit = totalIncome - totalExpense;
    return { incomeByType, expenseByType, totalIncome, totalExpense, grossProfit, netProfit };
  }, [payments, expenses, bookings, selectedYear]);

  // ── Legacy tabs ──
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

  const hajjiRows = useMemo(() => {
    const map: Record<string, { name: string; phone: string; passport: string; count: number; travelers: number; revenue: number; due: number; expenses: number; bookingDetails: any[] }> = {};
    bookings.forEach((b) => {
      const uid = b.user_id;
      const profile = profileMap[uid];
      if (!map[uid]) map[uid] = { name: profile?.full_name || "Unknown", phone: profile?.phone || "-", passport: profile?.passport_number || "-", count: 0, travelers: 0, revenue: 0, due: 0, expenses: 0, bookingDetails: [] };
      map[uid].count++;
      map[uid].travelers += Number(b.num_travelers || 1);
      map[uid].bookingDetails.push({ trackingId: b.tracking_id, packageName: b.packages?.name || "-", total: Number(b.total_amount), paid: Number(b.paid_amount), due: Number(b.due_amount ?? b.total_amount - b.paid_amount), status: b.status, date: format(parseISO(b.created_at), "dd MMM yyyy") });
    });
    payments.forEach((p) => { if (p.status === "completed" && map[p.user_id]) map[p.user_id].revenue += Number(p.amount); if (p.status === "pending" && map[p.user_id]) map[p.user_id].due += Number(p.amount); });
    expenseTransactions.forEach((t) => { if (t.booking_id) { const bk = bookings.find((b) => b.id === t.booking_id); if (bk && map[bk.user_id]) map[bk.user_id].expenses += Number(t.amount); } });
    return Object.values(map).map((d) => ({ ...d, profit: d.revenue - d.expenses }));
  }, [bookings, payments, expenseTransactions, profileMap]);

  const dueRows = useMemo(() => payments.filter((p) => p.status === "pending").map((p) => {
    const profile = profileMap[p.user_id];
    return { trackingId: p.bookings?.tracking_id || "-", customer: profile?.full_name || "Unknown", installment: p.installment_number ?? "-", amount: Number(p.amount), dueDate: p.due_date ? format(parseISO(p.due_date), "dd MMM yyyy") : "-" };
  }), [payments, profileMap]);

  const overdueRows = useMemo(() => {
    const today = new Date();
    return payments.filter((p) => p.status === "pending" && p.due_date && parseISO(p.due_date) < today).map((p) => {
      const profile = profileMap[p.user_id];
      return { trackingId: p.bookings?.tracking_id || "-", customer: profile?.full_name || "Unknown", installment: p.installment_number ?? "-", amount: Number(p.amount), dueDate: p.due_date ? format(parseISO(p.due_date), "dd MMM yyyy") : "-", daysOverdue: differenceInDays(today, parseISO(p.due_date)) };
    });
  }, [payments, profileMap]);

  // ── Moallem-wise Reports ──
  const moallemRows = useMemo(() => {
    const map: Record<string, {
      name: string; phone: string; status: string;
      bookingCount: number; travelers: number;
      totalAmount: number; paidAmount: number; dueAmount: number;
      deposit: number; expenses: number;
      totalCommission: number; commissionPaid: number; commissionDue: number;
      bookingDetails: any[];
      paymentDetails: any[];
    }> = {};

    // Build per-moallem data from bookings
    const mlInterval = { start: moallemDateFrom, end: moallemDateTo };
    bookings.filter((b) => b.moallem_id && isWithinInterval(parseISO(b.created_at), mlInterval)).forEach((b) => {
      const ml = moallemMap[b.moallem_id];
      if (!map[b.moallem_id]) {
        map[b.moallem_id] = {
          name: ml?.name || "Unknown",
          phone: ml?.phone || "-",
          status: ml?.status || "active",
          bookingCount: 0, travelers: 0,
          totalAmount: 0, paidAmount: 0, dueAmount: 0,
          deposit: 0, expenses: 0,
          totalCommission: 0, commissionPaid: 0, commissionDue: 0,
          bookingDetails: [], paymentDetails: [],
        };
      }
      const m = map[b.moallem_id];
      m.bookingCount++;
      m.travelers += Number(b.num_travelers || 1);
      m.totalAmount += Number(b.total_amount || 0);
      m.paidAmount += Number(b.paid_amount || 0);
      m.dueAmount += Number(b.due_amount ?? (b.total_amount - b.paid_amount));
      m.totalCommission += Number(b.total_commission || 0);
      m.commissionPaid += Number(b.commission_paid || 0);
      m.commissionDue += Number(b.commission_due || 0);
      m.bookingDetails.push({
        trackingId: b.tracking_id,
        guestName: b.guest_name || profileMap[b.user_id]?.full_name || "-",
        packageName: b.packages?.name || "-",
        total: Number(b.total_amount),
        paid: Number(b.paid_amount),
        due: Number(b.due_amount ?? (b.total_amount - b.paid_amount)),
        status: b.status,
        date: format(parseISO(b.created_at), "dd MMM yyyy"),
      });
    });

    // Add expenses linked to moallem bookings
    const moallemBookingIds = new Set(bookings.filter((b) => b.moallem_id && isWithinInterval(parseISO(b.created_at), mlInterval)).map((b) => b.id));
    expenses.forEach((e) => {
      if (e.booking_id && moallemBookingIds.has(e.booking_id)) {
        const bk = bookings.find((b) => b.id === e.booking_id);
        if (bk && map[bk.moallem_id]) {
          map[bk.moallem_id].expenses += Number(e.amount);
        }
      }
    });

    // Add moallem deposits
    moallemPayments.filter((mp) => isWithinInterval(parseISO(mp.date), mlInterval)).forEach((mp) => {
      if (map[mp.moallem_id]) {
        map[mp.moallem_id].deposit += Number(mp.amount);
        map[mp.moallem_id].paymentDetails.push({
          amount: Number(mp.amount),
          date: format(parseISO(mp.date), "dd MMM yyyy"),
          method: mp.payment_method || "cash",
          notes: mp.notes || "-",
        });
      } else {
        const ml = moallemMap[mp.moallem_id];
        if (ml) {
          map[mp.moallem_id] = {
            name: ml.name, phone: ml.phone || "-", status: ml.status || "active",
            bookingCount: 0, travelers: 0, totalAmount: 0, paidAmount: 0, dueAmount: 0,
            deposit: Number(mp.amount), expenses: 0,
            totalCommission: 0, commissionPaid: 0, commissionDue: 0,
            bookingDetails: [],
            paymentDetails: [{
              amount: Number(mp.amount),
              date: format(parseISO(mp.date), "dd MMM yyyy"),
              method: mp.payment_method || "cash",
              notes: mp.notes || "-",
            }],
          };
        }
      }
    });

    return Object.values(map).map((d) => ({
      ...d,
      profit: d.totalAmount - d.expenses - d.totalCommission,
    }));
  }, [bookings, expenses, moallemPayments, moallemMap, profileMap, moallemDateFrom, moallemDateTo]);

  // ── Export ──
  const getExportData = () => {
    switch (activeTab) {
      case "daily-financial":
        return { title: `Daily Financial Report ${format(dateFrom, "dd MMM")} - ${format(dateTo, "dd MMM yyyy")}`, columns: ["Date", "Income", "Expenses", "Profit", "Bookings"], rows: dailyFinancialRows.map((r) => [r.date, r.income, r.expense, r.profit, r.bookings]) };
      case "monthly-financial":
        return { title: `Monthly Financial Report - ${selectedYear}`, columns: ["Month", "Income", "Expenses", "Profit", "Bookings"], rows: monthlyFinancialRows.map((r) => [r.month, r.income, r.expense, r.profit, r.bookings]) };
      case "yearly":
        return { title: "Yearly Financial Summary", columns: ["Year", "Income", "Expenses", "Profit", "Bookings"], rows: yearlyRows.map((r) => [r.year, r.income, r.expense, r.profit, r.bookings]) };
      case "package":
        return { title: "Package-wise Revenue", columns: ["Package","Type","Bookings","Revenue","Expenses","Profit"], rows: packageRows.map((r) => [r.name, r.type, r.count, r.revenue, r.expenses, r.profit]) };
      case "hajji":
        return { title: "Hajji-wise Revenue", columns: ["Customer","Phone","Passport","Bookings","Travelers","Revenue","Due","Expenses","Profit"], rows: hajjiRows.map((r) => [r.name, r.phone, r.passport, r.count, r.travelers, r.revenue, r.due, r.expenses, r.profit]) };
      case "due":
        return { title: "Due Report", columns: ["Tracking ID","Customer","Installment","Amount","Due Date"], rows: dueRows.map((r) => [r.trackingId, r.customer, r.installment, r.amount, r.dueDate]) };
      case "overdue":
        return { title: "Overdue Report", columns: ["Tracking ID","Customer","Installment","Amount","Due Date","Days Overdue"], rows: overdueRows.map((r) => [r.trackingId, r.customer, r.installment, r.amount, r.dueDate, r.daysOverdue]) };
      case "pnl": {
        const incRows = Object.entries(pnlData.incomeByType).map(([k, v]) => [k, v]);
        const expRows = Object.entries(pnlData.expenseByType).map(([k, v]) => [k, v]);
        return { title: `Profit & Loss Statement - ${selectedYear}`, columns: ["Category", "Amount (BDT)"], rows: [
          ["── INCOME ──", ""], ...incRows, ["Total Income", pnlData.totalIncome],
          ["", ""], ["── EXPENSES ──", ""], ...expRows, ["Total Expenses", pnlData.totalExpense],
          ["", ""], ["Gross Profit", pnlData.grossProfit], ["Net Profit", pnlData.netProfit],
        ] };
      }
      case "moallem-bookings":
        return { title: "Moallem-wise Bookings", columns: ["Moallem","Phone","Status","Bookings","Travelers","Total Amount","Paid","Due"], rows: moallemRows.map((r) => [r.name, r.phone, r.status, r.bookingCount, r.travelers, r.totalAmount, r.paidAmount, r.dueAmount]) };
      case "moallem-payments":
        return { title: "Moallem-wise Payments", columns: ["Moallem","Phone","Total Deposit","Total Package","Paid Amount","Due Amount"], rows: moallemRows.map((r) => [r.name, r.phone, r.deposit, r.totalAmount, r.paidAmount, r.dueAmount]) };
      case "moallem-due":
        return { title: "Moallem-wise Due", columns: ["Moallem","Phone","Total Amount","Paid","Due","Deposit","Collection %"], rows: moallemRows.filter((r) => r.dueAmount > 0).map((r) => [r.name, r.phone, r.totalAmount, r.paidAmount, r.dueAmount, r.deposit, r.totalAmount > 0 ? `${Math.round((r.paidAmount / r.totalAmount) * 100)}%` : "0%"]) };
      case "moallem-profit":
        return { title: "Moallem-wise Profit", columns: ["Moallem","Phone","Revenue (Paid)","Expenses","Profit","Margin %"], rows: moallemRows.map((r) => [r.name, r.phone, r.paidAmount, r.expenses, r.profit, r.paidAmount > 0 ? `${Math.round((r.profit / r.paidAmount) * 100)}%` : "0%"]) };
      default:
        return { title: "Report", columns: [], rows: [] };
    }
  };

  // ── Summary cards ──
  const summaryCards = useMemo(() => {
    switch (activeTab) {
      case "daily-financial": {
        const t = dailyFinancialRows.reduce((a, r) => ({ i: a.i + r.income, e: a.e + r.expense, b: a.b + r.bookings }), { i: 0, e: 0, b: 0 });
        return [
          { label: "Total Income", value: fmt(t.i), icon: TrendingUp, color: "text-primary" },
          { label: "Total Expenses", value: fmt(t.e), icon: TrendingDown, color: "text-destructive" },
          { label: "Net Profit", value: fmt(t.i - t.e), icon: DollarSign, color: t.i - t.e >= 0 ? "text-primary" : "text-destructive" },
          { label: "Total Bookings", value: t.b, icon: CalendarIcon, color: "text-foreground" },
        ];
      }
      case "monthly-financial": {
        const t = monthlyFinancialRows.reduce((a, r) => ({ i: a.i + r.income, e: a.e + r.expense, b: a.b + r.bookings }), { i: 0, e: 0, b: 0 });
        return [
          { label: "Total Income", value: fmt(t.i), icon: TrendingUp, color: "text-primary" },
          { label: "Total Expenses", value: fmt(t.e), icon: TrendingDown, color: "text-destructive" },
          { label: "Net Profit", value: fmt(t.i - t.e), icon: DollarSign, color: t.i - t.e >= 0 ? "text-primary" : "text-destructive" },
          { label: "Total Bookings", value: t.b, icon: CalendarIcon, color: "text-foreground" },
        ];
      }
      case "yearly": {
        const t = yearlyRows.reduce((a, r) => ({ i: a.i + r.income, e: a.e + r.expense, b: a.b + r.bookings }), { i: 0, e: 0, b: 0 });
        return [
          { label: "Total Income", value: fmt(t.i), icon: TrendingUp, color: "text-primary" },
          { label: "Total Expenses", value: fmt(t.e), icon: TrendingDown, color: "text-destructive" },
          { label: "Net Profit", value: fmt(t.i - t.e), icon: DollarSign, color: t.i - t.e >= 0 ? "text-primary" : "text-destructive" },
          { label: "Total Bookings", value: t.b, icon: CalendarIcon, color: "text-foreground" },
        ];
      }
      case "package": {
        const t = packageRows.reduce((a, r) => ({ rev: a.rev + r.revenue, exp: a.exp + r.expenses }), { rev: 0, exp: 0 });
        return [
          { label: "Packages", value: packageRows.length, icon: CalendarIcon, color: "text-foreground" },
          { label: "Revenue", value: fmt(t.rev), icon: TrendingUp, color: "text-primary" },
          { label: "Expenses", value: fmt(t.exp), icon: TrendingDown, color: "text-destructive" },
          { label: "Profit", value: fmt(t.rev - t.exp), icon: DollarSign, color: t.rev - t.exp >= 0 ? "text-primary" : "text-destructive" },
        ];
      }
      case "hajji": {
        const t = hajjiRows.reduce((a, r) => ({ rev: a.rev + r.revenue, due: a.due + r.due, travelers: a.travelers + r.travelers }), { rev: 0, due: 0, travelers: 0 });
        return [
          { label: "Customers", value: hajjiRows.length, icon: Users, color: "text-foreground" },
          { label: "Travelers", value: t.travelers, icon: Users, color: "text-foreground" },
          { label: "Revenue", value: fmt(t.rev), icon: TrendingUp, color: "text-primary" },
          { label: "Due", value: fmt(t.due), icon: TrendingDown, color: "text-destructive" },
        ];
      }
      case "due":
        return [
          { label: "Pending", value: dueRows.length, icon: CalendarIcon, color: "text-foreground" },
          { label: "Total Due", value: fmt(dueRows.reduce((s, r) => s + r.amount, 0)), icon: TrendingDown, color: "text-destructive" },
        ];
      case "overdue":
        return [
          { label: "Overdue", value: overdueRows.length, icon: CalendarIcon, color: "text-destructive" },
          { label: "Total Overdue", value: fmt(overdueRows.reduce((s, r) => s + r.amount, 0)), icon: TrendingDown, color: "text-destructive" },
        ];
      case "pnl": {
        return [
          { label: "Total Income", value: fmt(pnlData.totalIncome), icon: TrendingUp, color: "text-primary" },
          { label: "Total Expenses", value: fmt(pnlData.totalExpense), icon: TrendingDown, color: "text-destructive" },
          { label: "Gross Profit", value: fmt(pnlData.grossProfit), icon: DollarSign, color: pnlData.grossProfit >= 0 ? "text-primary" : "text-destructive" },
          { label: "Net Profit", value: fmt(pnlData.netProfit), icon: DollarSign, color: pnlData.netProfit >= 0 ? "text-primary" : "text-destructive" },
        ];
      }
      case "moallem-bookings":
      case "moallem-payments":
      case "moallem-due":
      case "moallem-profit": {
        const t = moallemRows.reduce((a, r) => ({
          moallems: a.moallems + 1, bookings: a.bookings + r.bookingCount, travelers: a.travelers + r.travelers,
          total: a.total + r.totalAmount, paid: a.paid + r.paidAmount, due: a.due + r.dueAmount,
          deposit: a.deposit + r.deposit, expenses: a.expenses + r.expenses, profit: a.profit + r.profit,
        }), { moallems: 0, bookings: 0, travelers: 0, total: 0, paid: 0, due: 0, deposit: 0, expenses: 0, profit: 0 });
        if (activeTab === "moallem-bookings") return [
          { label: "মোয়াল্লেম", value: t.moallems, icon: Users, color: "text-foreground" },
          { label: "বুকিং", value: t.bookings, icon: CalendarIcon, color: "text-foreground" },
          { label: "হাজী", value: t.travelers, icon: Users, color: "text-primary" },
          { label: "মোট পরিমাণ", value: fmt(t.total), icon: DollarSign, color: "text-foreground" },
        ];
        if (activeTab === "moallem-payments") return [
          { label: "মোট ডিপোজিট", value: fmt(t.deposit), icon: TrendingUp, color: "text-primary" },
          { label: "মোট প্যাকেজ", value: fmt(t.total), icon: DollarSign, color: "text-foreground" },
          { label: "মোট পেইড", value: fmt(t.paid), icon: TrendingUp, color: "text-primary" },
          { label: "মোট বকেয়া", value: fmt(t.due), icon: TrendingDown, color: "text-destructive" },
        ];
        if (activeTab === "moallem-due") return [
          { label: "বকেয়া মোয়াল্লেম", value: moallemRows.filter((r) => r.dueAmount > 0).length, icon: Users, color: "text-destructive" },
          { label: "মোট বকেয়া", value: fmt(t.due), icon: TrendingDown, color: "text-destructive" },
          { label: "আদায় হার", value: t.total > 0 ? `${Math.round((t.paid / t.total) * 100)}%` : "0%", icon: TrendingUp, color: "text-primary" },
        ];
        return [
          { label: "মোট রেভিনিউ", value: fmt(t.paid), icon: TrendingUp, color: "text-primary" },
          { label: "মোট খরচ", value: fmt(t.expenses), icon: TrendingDown, color: "text-destructive" },
          { label: "মোট লাভ", value: fmt(t.profit), icon: DollarSign, color: t.profit >= 0 ? "text-primary" : "text-destructive" },
          { label: "মার্জিন", value: t.paid > 0 ? `${Math.round((t.profit / t.paid) * 100)}%` : "0%", icon: TrendingUp, color: "text-primary" },
        ];
      }
      default: return [];
    }
  }, [activeTab, dailyFinancialRows, monthlyFinancialRows, yearlyRows, packageRows, hajjiRows, dueRows, overdueRows, moallemRows, pnlData]);

  const showDateRange = activeTab === "daily-financial";
  const showYearSelect = activeTab === "monthly-financial" || activeTab === "pnl";
  const showMoallemDateRange = activeTab.startsWith("moallem-");

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="font-heading text-xl font-bold">Financial Reports</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => {
            if (activeTab === "hajji") {
              exportHajjiPDF({ title: "Hajji-wise Full Booking Report", customers: hajjiRows.map(r => ({ ...r, bookings: r.count })) });
            } else { exportPDF(getExportData()); }
          }}><FileDown className="h-4 w-4 mr-1" /> PDF</Button>
          <Button size="sm" variant="outline" onClick={() => {
            if (activeTab === "hajji") {
              exportHajjiExcel({ title: "Hajji-wise Full Booking Report", customers: hajjiRows.map(r => ({ ...r, bookings: r.count })) });
            } else { exportExcel(getExportData()); }
          }}><FileSpreadsheet className="h-4 w-4 mr-1" /> Excel</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="daily-financial">Daily Income/Expense</TabsTrigger>
          <TabsTrigger value="monthly-financial">Monthly Income/Expense</TabsTrigger>
          <TabsTrigger value="yearly">Yearly Summary</TabsTrigger>
          <TabsTrigger value="pnl">Profit & Loss</TabsTrigger>
          <TabsTrigger value="package">Package-wise</TabsTrigger>
          <TabsTrigger value="hajji">Hajji-wise</TabsTrigger>
          <TabsTrigger value="due">Due</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="moallem-bookings">মোয়াল্লেম বুকিং</TabsTrigger>
          <TabsTrigger value="moallem-payments">মোয়াল্লেম পেমেন্ট</TabsTrigger>
          <TabsTrigger value="moallem-due">মোয়াল্লেম বকেয়া</TabsTrigger>
          <TabsTrigger value="moallem-profit">মোয়াল্লেম লাভ</TabsTrigger>
          <TabsTrigger value="moallem-commission">কমিশন রিপোর্ট</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex items-center gap-3 py-3 flex-wrap">
          {showDateRange && (
            <>
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">From:</span>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-[160px] justify-start text-left font-normal">
                    <CalendarIcon className="h-4 w-4 mr-2" />{format(dateFrom, "dd MMM yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={(d) => d && setDateFrom(d)} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <span className="text-xs text-muted-foreground">To:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-[160px] justify-start text-left font-normal">
                    <CalendarIcon className="h-4 w-4 mr-2" />{format(dateTo, "dd MMM yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={(d) => d && setDateTo(d)} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { setDateFrom(new Date()); setDateTo(new Date()); }}>Today</Button>
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { setDateFrom(startOfMonth(new Date())); setDateTo(new Date()); }}>This Month</Button>
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { setDateFrom(startOfMonth(subMonths(new Date(), 2))); setDateTo(new Date()); }}>Last 3 Months</Button>
              </div>
            </>
          )}
          {showYearSelect && (
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {showMoallemDateRange && (
            <>
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">From:</span>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-[160px] justify-start text-left font-normal">
                    <CalendarIcon className="h-4 w-4 mr-2" />{format(moallemDateFrom, "dd MMM yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={moallemDateFrom} onSelect={(d) => d && setMoallemDateFrom(d)} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <span className="text-xs text-muted-foreground">To:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-[160px] justify-start text-left font-normal">
                    <CalendarIcon className="h-4 w-4 mr-2" />{format(moallemDateTo, "dd MMM yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={moallemDateTo} onSelect={(d) => d && setMoallemDateTo(d)} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { setMoallemDateFrom(new Date()); setMoallemDateTo(new Date()); }}>আজ</Button>
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { setMoallemDateFrom(startOfMonth(new Date())); setMoallemDateTo(new Date()); }}>এই মাস</Button>
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { setMoallemDateFrom(startOfMonth(subMonths(new Date(), 2))); setMoallemDateTo(new Date()); }}>৩ মাস</Button>
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { setMoallemDateFrom(startOfMonth(subMonths(new Date(), 11))); setMoallemDateTo(new Date()); }}>১ বছর</Button>
              </div>
            </>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {summaryCards.map((c) => (
            <Card key={c.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <c.icon className={cn("h-4 w-4", c.color)} />
                </div>
                <p className={cn("text-lg font-heading font-bold", c.color)}>{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Daily Financial */}
        <TabsContent value="daily-financial">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Income</TableHead>
              <TableHead className="text-right">Expenses</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="text-right">Bookings</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {dailyFinancialRows.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No data for selected range</TableCell></TableRow>}
              {dailyFinancialRows.filter((r) => r.income > 0 || r.expense > 0 || r.bookings > 0).map((r) => (
                <TableRow key={r.date}>
                  <TableCell className="font-medium">{r.date}</TableCell>
                  <TableCell className="text-right text-primary">{fmt(r.income)}</TableCell>
                  <TableCell className="text-right text-destructive">{fmt(r.expense)}</TableCell>
                  <TableCell className={cn("text-right font-bold", r.profit >= 0 ? "text-primary" : "text-destructive")}>{fmt(r.profit)}</TableCell>
                  <TableCell className="text-right">{r.bookings}</TableCell>
                </TableRow>
              ))}
              {dailyFinancialRows.filter((r) => r.income > 0 || r.expense > 0 || r.bookings > 0).length > 0 && (
                <TableRow className="bg-muted/40 font-bold border-t-2 border-border">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right text-primary">{fmt(dailyFinancialRows.reduce((s, r) => s + r.income, 0))}</TableCell>
                  <TableCell className="text-right text-destructive">{fmt(dailyFinancialRows.reduce((s, r) => s + r.expense, 0))}</TableCell>
                  <TableCell className={cn("text-right", dailyFinancialRows.reduce((s, r) => s + r.profit, 0) >= 0 ? "text-primary" : "text-destructive")}>{fmt(dailyFinancialRows.reduce((s, r) => s + r.profit, 0))}</TableCell>
                  <TableCell className="text-right">{dailyFinancialRows.reduce((s, r) => s + r.bookings, 0)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Monthly Financial */}
        <TabsContent value="monthly-financial">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Income</TableHead>
              <TableHead className="text-right">Expenses</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="text-right">Bookings</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {monthlyFinancialRows.map((r) => (
                <TableRow key={r.month}>
                  <TableCell>{r.month}</TableCell>
                  <TableCell className="text-right text-primary">{fmt(r.income)}</TableCell>
                  <TableCell className="text-right text-destructive">{fmt(r.expense)}</TableCell>
                  <TableCell className={cn("text-right font-bold", r.profit >= 0 ? "text-primary" : "text-destructive")}>{fmt(r.profit)}</TableCell>
                  <TableCell className="text-right">{r.bookings}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/40 font-bold border-t-2 border-border">
                <TableCell>Total</TableCell>
                <TableCell className="text-right text-primary">{fmt(monthlyFinancialRows.reduce((s, r) => s + r.income, 0))}</TableCell>
                <TableCell className="text-right text-destructive">{fmt(monthlyFinancialRows.reduce((s, r) => s + r.expense, 0))}</TableCell>
                <TableCell className={cn("text-right", monthlyFinancialRows.reduce((s, r) => s + r.profit, 0) >= 0 ? "text-primary" : "text-destructive")}>{fmt(monthlyFinancialRows.reduce((s, r) => s + r.profit, 0))}</TableCell>
                <TableCell className="text-right">{monthlyFinancialRows.reduce((s, r) => s + r.bookings, 0)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TabsContent>

        {/* Yearly */}
        <TabsContent value="yearly">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Year</TableHead>
              <TableHead className="text-right">Income</TableHead>
              <TableHead className="text-right">Expenses</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="text-right">Bookings</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {yearlyRows.map((r) => (
                <TableRow key={r.year}>
                  <TableCell className="font-medium">{r.year}</TableCell>
                  <TableCell className="text-right text-primary">{fmt(r.income)}</TableCell>
                  <TableCell className="text-right text-destructive">{fmt(r.expense)}</TableCell>
                  <TableCell className={cn("text-right font-bold", r.profit >= 0 ? "text-primary" : "text-destructive")}>{fmt(r.profit)}</TableCell>
                  <TableCell className="text-right">{r.bookings}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Profit & Loss */}
        <TabsContent value="pnl">
          <div className="bg-card border border-border rounded-xl p-6 space-y-6">
            <div className="text-center mb-4">
              <h3 className="font-heading text-lg font-bold">Profit & Loss Statement</h3>
              <p className="text-sm text-muted-foreground">For the year {selectedYear}</p>
            </div>

            {/* Income Section */}
            <div>
              <h4 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3 border-b border-border pb-2">Income</h4>
              <div className="space-y-2">
                {Object.entries(pnlData.incomeByType).map(([cat, amount]) => (
                  <div key={cat} className="flex justify-between items-center px-2">
                    <span className="text-sm">{cat}</span>
                    <span className="text-sm font-medium text-primary">{fmt(amount)}</span>
                  </div>
                ))}
                {Object.keys(pnlData.incomeByType).length === 0 && <p className="text-sm text-muted-foreground px-2">No income recorded</p>}
              </div>
              <div className="flex justify-between items-center px-2 mt-3 pt-2 border-t border-border font-bold">
                <span>Total Income</span>
                <span className="text-primary">{fmt(pnlData.totalIncome)}</span>
              </div>
            </div>

            {/* Expense Section */}
            <div>
              <h4 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3 border-b border-border pb-2">Expenses</h4>
              <div className="space-y-2">
                {Object.entries(pnlData.expenseByType).map(([cat, amount]) => (
                  <div key={cat} className="flex justify-between items-center px-2">
                    <span className="text-sm">{cat}</span>
                    <span className="text-sm font-medium text-destructive">{fmt(amount)}</span>
                  </div>
                ))}
                {Object.keys(pnlData.expenseByType).length === 0 && <p className="text-sm text-muted-foreground px-2">No expenses recorded</p>}
              </div>
              <div className="flex justify-between items-center px-2 mt-3 pt-2 border-t border-border font-bold">
                <span>Total Expenses</span>
                <span className="text-destructive">{fmt(pnlData.totalExpense)}</span>
              </div>
            </div>

            {/* Summary */}
            <div className="border-t-2 border-border pt-4 space-y-3">
              <div className="flex justify-between items-center px-2">
                <span className="font-semibold">Gross Profit</span>
                <span className={cn("font-bold text-lg", pnlData.grossProfit >= 0 ? "text-primary" : "text-destructive")}>{fmt(pnlData.grossProfit)}</span>
              </div>
              <div className="flex justify-between items-center px-2 bg-muted/40 rounded-lg py-3">
                <span className="font-heading font-bold text-lg">Net Profit</span>
                <span className={cn("font-heading font-bold text-xl", pnlData.netProfit >= 0 ? "text-primary" : "text-destructive")}>{fmt(pnlData.netProfit)}</span>
              </div>
            </div>
          </div>
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
                <TableRow key={i}><TableCell>{r.name}</TableCell><TableCell className="capitalize">{r.type}</TableCell><TableCell className="text-right">{r.count}</TableCell><TableCell className="text-right">{fmt(r.revenue)}</TableCell><TableCell className="text-right">{fmt(r.expenses)}</TableCell><TableCell className={cn("text-right font-bold", r.profit >= 0 ? "text-primary" : "text-destructive")}>{fmt(r.profit)}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="hajji"><HajjiReportTable rows={hajjiRows} fmt={fmt} /></TabsContent>

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

        {/* Moallem Bookings */}
        <TabsContent value="moallem-bookings">
          <MoallemExpandableTable rows={moallemRows} fmt={fmt} view="bookings" />
        </TabsContent>

        {/* Moallem Payments */}
        <TabsContent value="moallem-payments">
          <MoallemExpandableTable rows={moallemRows} fmt={fmt} view="payments" />
        </TabsContent>

        {/* Moallem Due */}
        <TabsContent value="moallem-due">
          <MoallemExpandableTable rows={moallemRows.filter((r) => r.dueAmount > 0)} fmt={fmt} view="due" />
        </TabsContent>

        {/* Moallem Profit */}
        <TabsContent value="moallem-profit">
          <MoallemExpandableTable rows={moallemRows} fmt={fmt} view="profit" />
        </TabsContent>

        {/* Moallem Commission */}
        <TabsContent value="moallem-commission">
          <Table>
            <TableHeader><TableRow>
              <TableHead>মোয়াল্লেম</TableHead><TableHead>ফোন</TableHead>
              <TableHead className="text-right">হাজী</TableHead>
              <TableHead className="text-right">মোট কমিশন</TableHead>
              <TableHead className="text-right">কমিশন পরিশোধিত</TableHead>
              <TableHead className="text-right">কমিশন বকেয়া</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {moallemRows.filter(r => (r.totalCommission || 0) > 0).length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">কোনো কমিশন ডেটা নেই</TableCell></TableRow>
              )}
              {moallemRows.filter(r => (r.totalCommission || 0) > 0).map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.phone}</TableCell>
                  <TableCell className="text-right">{r.travelers}</TableCell>
                  <TableCell className="text-right font-bold">{fmt(r.totalCommission)}</TableCell>
                  <TableCell className="text-right text-emerald-500">{fmt(r.commissionPaid)}</TableCell>
                  <TableCell className="text-right text-destructive font-bold">{fmt(r.commissionDue)}</TableCell>
                </TableRow>
              ))}
              {moallemRows.filter(r => (r.totalCommission || 0) > 0).length > 0 && (
                <TableRow className="font-bold border-t-2">
                  <TableCell colSpan={3}>মোট</TableCell>
                  <TableCell className="text-right">{fmt(moallemRows.reduce((s, r) => s + (r.totalCommission || 0), 0))}</TableCell>
                  <TableCell className="text-right text-emerald-500">{fmt(moallemRows.reduce((s, r) => s + (r.commissionPaid || 0), 0))}</TableCell>
                  <TableCell className="text-right text-destructive">{fmt(moallemRows.reduce((s, r) => s + (r.commissionDue || 0), 0))}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Moallem Expandable Report Table ──
function MoallemExpandableTable({ rows, fmt, view }: { rows: any[]; fmt: (n: number) => string; view: "bookings" | "payments" | "due" | "profit" }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const totals = rows.reduce((a, r) => ({
    bookings: a.bookings + r.bookingCount, travelers: a.travelers + r.travelers,
    total: a.total + r.totalAmount, paid: a.paid + r.paidAmount, due: a.due + r.dueAmount,
    deposit: a.deposit + r.deposit, expenses: a.expenses + r.expenses, profit: a.profit + r.profit,
    commission: a.commission + (r.totalCommission || 0), commissionPaid: a.commissionPaid + (r.commissionPaid || 0), commissionDue: a.commissionDue + (r.commissionDue || 0),
  }), { bookings: 0, travelers: 0, total: 0, paid: 0, due: 0, deposit: 0, expenses: 0, profit: 0, commission: 0, commissionPaid: 0, commissionDue: 0 });

  const headers: Record<string, string[]> = {
    bookings: ["", "মোয়াল্লেম", "ফোন", "স্ট্যাটাস", "বুকিং", "হাজী", "মোট পরিমাণ", "পেইড", "বকেয়া"],
    payments: ["", "মোয়াল্লেম", "ফোন", "মোট ডিপোজিট", "মোট প্যাকেজ", "পেইড", "বকেয়া"],
    due: ["", "মোয়াল্লেম", "ফোন", "মোট পরিমাণ", "পেইড", "বকেয়া", "ডিপোজিট", "আদায় %"],
    profit: ["", "মোয়াল্লেম", "ফোন", "বিক্রয়", "খরচ", "কমিশন", "লাভ", "মার্জিন %"],
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {headers[view].map((h, i) => (
            <TableHead key={i} className={i > 2 ? "text-right" : i === 0 ? "w-8" : ""}>{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && <TableRow><TableCell colSpan={headers[view].length} className="text-center text-muted-foreground">কোনো ডেটা নেই</TableCell></TableRow>}
        {rows.map((r, i) => (
          <Fragment key={i}>
            <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setExpanded(expanded === i ? null : i)}>
              <TableCell className="px-2">{expanded === i ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}</TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><Users className="h-3.5 w-3.5 text-primary" /></div>
                  <div>
                    <p>{r.name}</p>
                    <span className={cn("text-xs px-1.5 py-0.5 rounded-full", r.status === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{r.status}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>{r.phone}</TableCell>
              {view === "bookings" && (
                <>
                  <TableCell className="text-right capitalize"><span className={cn("text-xs px-1.5 py-0.5 rounded-full", r.status === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{r.status}</span></TableCell>
                  <TableCell className="text-right">{r.bookingCount}</TableCell>
                  <TableCell className="text-right">{r.travelers}</TableCell>
                  <TableCell className="text-right">{fmt(r.totalAmount)}</TableCell>
                  <TableCell className="text-right text-primary">{fmt(r.paidAmount)}</TableCell>
                  <TableCell className="text-right text-destructive">{fmt(r.dueAmount)}</TableCell>
                </>
              )}
              {view === "payments" && (
                <>
                  <TableCell className="text-right text-primary font-bold">{fmt(r.deposit)}</TableCell>
                  <TableCell className="text-right">{fmt(r.totalAmount)}</TableCell>
                  <TableCell className="text-right text-primary">{fmt(r.paidAmount)}</TableCell>
                  <TableCell className="text-right text-destructive">{fmt(r.dueAmount)}</TableCell>
                </>
              )}
              {view === "due" && (
                <>
                  <TableCell className="text-right">{fmt(r.totalAmount)}</TableCell>
                  <TableCell className="text-right text-primary">{fmt(r.paidAmount)}</TableCell>
                  <TableCell className="text-right text-destructive font-bold">{fmt(r.dueAmount)}</TableCell>
                  <TableCell className="text-right">{fmt(r.deposit)}</TableCell>
                  <TableCell className="text-right">{r.totalAmount > 0 ? `${Math.round((r.paidAmount / r.totalAmount) * 100)}%` : "0%"}</TableCell>
                </>
              )}
              {view === "profit" && (
                <>
                  <TableCell className="text-right text-primary">{fmt(r.totalAmount)}</TableCell>
                  <TableCell className="text-right text-destructive">{fmt(r.expenses)}</TableCell>
                  <TableCell className="text-right text-yellow-600">{fmt(r.totalCommission || 0)}</TableCell>
                  <TableCell className={cn("text-right font-bold", r.profit >= 0 ? "text-primary" : "text-destructive")}>{fmt(r.profit)}</TableCell>
                  <TableCell className="text-right">{r.totalAmount > 0 ? `${Math.round((r.profit / r.totalAmount) * 100)}%` : "0%"}</TableCell>
                </>
              )}
            </TableRow>
            {expanded === i && (
              <TableRow>
                <TableCell colSpan={headers[view].length} className="bg-muted/20 p-0">
                  <div className="p-4 space-y-4">
                    {/* Booking Details */}
                    {r.bookingDetails.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">বুকিং বিবরণ — {r.name}</p>
                        <table className="w-full text-sm">
                          <thead><tr className="text-left text-muted-foreground border-b border-border/50">
                            <th className="pb-2 pr-3">Tracking ID</th><th className="pb-2 pr-3">হাজী</th><th className="pb-2 pr-3">প্যাকেজ</th><th className="pb-2 pr-3">তারিখ</th>
                            <th className="pb-2 pr-3 text-right">মোট</th><th className="pb-2 pr-3 text-right">পেইড</th><th className="pb-2 pr-3 text-right">বকেয়া</th><th className="pb-2">স্ট্যাটাস</th>
                          </tr></thead>
                          <tbody>
                            {r.bookingDetails.map((bd: any, j: number) => (
                              <tr key={j} className="border-b border-border/30">
                                <td className="py-2 pr-3 font-mono text-xs text-primary">{bd.trackingId}</td>
                                <td className="py-2 pr-3">{bd.guestName}</td>
                                <td className="py-2 pr-3">{bd.packageName}</td>
                                <td className="py-2 pr-3 text-muted-foreground">{bd.date}</td>
                                <td className="py-2 pr-3 text-right">{fmt(bd.total)}</td>
                                <td className="py-2 pr-3 text-right text-primary">{fmt(bd.paid)}</td>
                                <td className="py-2 pr-3 text-right text-destructive">{fmt(bd.due)}</td>
                                <td className="py-2 capitalize"><span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", bd.status === "completed" ? "bg-primary/10 text-primary" : bd.status === "cancelled" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>{bd.status}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {/* Payment Details */}
                    {(view === "payments" || view === "due") && r.paymentDetails.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">ডিপোজিট ইতিহাস — {r.name}</p>
                        <table className="w-full text-sm">
                          <thead><tr className="text-left text-muted-foreground border-b border-border/50">
                            <th className="pb-2 pr-3">তারিখ</th><th className="pb-2 pr-3 text-right">পরিমাণ</th><th className="pb-2 pr-3">পদ্ধতি</th><th className="pb-2">নোট</th>
                          </tr></thead>
                          <tbody>
                            {r.paymentDetails.map((pd: any, j: number) => (
                              <tr key={j} className="border-b border-border/30">
                                <td className="py-2 pr-3 text-muted-foreground">{pd.date}</td>
                                <td className="py-2 pr-3 text-right text-primary font-medium">{fmt(pd.amount)}</td>
                                <td className="py-2 pr-3 capitalize">{pd.method}</td>
                                <td className="py-2 text-muted-foreground">{pd.notes}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </Fragment>
        ))}
        {rows.length > 0 && (
          <TableRow className="bg-muted/40 font-bold border-t-2 border-border">
            <TableCell></TableCell><TableCell>মোট</TableCell><TableCell></TableCell>
            {view === "bookings" && (
              <><TableCell></TableCell><TableCell className="text-right">{totals.bookings}</TableCell><TableCell className="text-right">{totals.travelers}</TableCell><TableCell className="text-right">{fmt(totals.total)}</TableCell><TableCell className="text-right text-primary">{fmt(totals.paid)}</TableCell><TableCell className="text-right text-destructive">{fmt(totals.due)}</TableCell></>
            )}
            {view === "payments" && (
              <><TableCell className="text-right text-primary">{fmt(totals.deposit)}</TableCell><TableCell className="text-right">{fmt(totals.total)}</TableCell><TableCell className="text-right text-primary">{fmt(totals.paid)}</TableCell><TableCell className="text-right text-destructive">{fmt(totals.due)}</TableCell></>
            )}
            {view === "due" && (
              <><TableCell className="text-right">{fmt(totals.total)}</TableCell><TableCell className="text-right text-primary">{fmt(totals.paid)}</TableCell><TableCell className="text-right text-destructive">{fmt(totals.due)}</TableCell><TableCell className="text-right">{fmt(totals.deposit)}</TableCell><TableCell className="text-right">{totals.total > 0 ? `${Math.round((totals.paid / totals.total) * 100)}%` : "0%"}</TableCell></>
            )}
            {view === "profit" && (
              <><TableCell className="text-right text-primary">{fmt(totals.paid)}</TableCell><TableCell className="text-right text-destructive">{fmt(totals.expenses)}</TableCell><TableCell className={cn("text-right", totals.profit >= 0 ? "text-primary" : "text-destructive")}>{fmt(totals.profit)}</TableCell><TableCell className="text-right">{totals.paid > 0 ? `${Math.round((totals.profit / totals.paid) * 100)}%` : "0%"}</TableCell></>
            )}
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

// ── Hajji Report Expandable Table ──
function HajjiReportTable({ rows, fmt }: { rows: any[]; fmt: (n: number) => string }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const totals = rows.reduce((a, r) => ({ bookings: a.bookings + r.count, travelers: a.travelers + r.travelers, revenue: a.revenue + r.revenue, due: a.due + r.due, expenses: a.expenses + r.expenses, profit: a.profit + r.profit }), { bookings: 0, travelers: 0, revenue: 0, due: 0, expenses: 0, profit: 0 });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8"></TableHead><TableHead>Customer</TableHead><TableHead>Phone</TableHead><TableHead>Passport</TableHead>
          <TableHead className="text-right">Bookings</TableHead><TableHead className="text-right">Travelers</TableHead><TableHead className="text-right">Revenue</TableHead>
          <TableHead className="text-right">Due</TableHead><TableHead className="text-right">Expenses</TableHead><TableHead className="text-right">Profit</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">No data</TableCell></TableRow>}
        {rows.map((r, i) => (
          <Fragment key={i}>
            <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setExpanded(expanded === i ? null : i)}>
              <TableCell className="px-2">{expanded === i ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}</TableCell>
              <TableCell className="font-medium"><div className="flex items-center gap-2"><div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><Users className="h-3.5 w-3.5 text-primary" /></div>{r.name}</div></TableCell>
              <TableCell>{r.phone}</TableCell><TableCell className="text-xs">{r.passport}</TableCell>
              <TableCell className="text-right">{r.count}</TableCell><TableCell className="text-right">{r.travelers}</TableCell>
              <TableCell className="text-right">{fmt(r.revenue)}</TableCell><TableCell className="text-right text-destructive">{fmt(r.due)}</TableCell>
              <TableCell className="text-right">{fmt(r.expenses)}</TableCell><TableCell className={cn("text-right font-bold", r.profit >= 0 ? "text-primary" : "text-destructive")}>{fmt(r.profit)}</TableCell>
            </TableRow>
            {expanded === i && (
              <TableRow>
                <TableCell colSpan={10} className="bg-muted/20 p-0">
                  <div className="p-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Booking Details for {r.name}</p>
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-muted-foreground border-b border-border/50">
                        <th className="pb-2 pr-3">Tracking ID</th><th className="pb-2 pr-3">Package</th><th className="pb-2 pr-3">Date</th>
                        <th className="pb-2 pr-3 text-right">Total</th><th className="pb-2 pr-3 text-right">Paid</th><th className="pb-2 pr-3 text-right">Due</th><th className="pb-2">Status</th>
                      </tr></thead>
                      <tbody>
                        {r.bookingDetails.map((bd: any, j: number) => (
                          <tr key={j} className="border-b border-border/30">
                            <td className="py-2 pr-3 font-mono text-xs text-primary">{bd.trackingId}</td>
                            <td className="py-2 pr-3">{bd.packageName}</td>
                            <td className="py-2 pr-3 text-muted-foreground">{bd.date}</td>
                            <td className="py-2 pr-3 text-right">{fmt(bd.total)}</td>
                            <td className="py-2 pr-3 text-right text-primary">{fmt(bd.paid)}</td>
                            <td className="py-2 pr-3 text-right text-destructive">{fmt(bd.due)}</td>
                            <td className="py-2 capitalize"><span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", bd.status === "completed" ? "bg-primary/10 text-primary" : bd.status === "cancelled" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>{bd.status}</span></td>
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
        {rows.length > 0 && (
          <TableRow className="bg-muted/40 font-bold border-t-2 border-border">
            <TableCell></TableCell><TableCell>Total</TableCell><TableCell></TableCell><TableCell></TableCell>
            <TableCell className="text-right">{totals.bookings}</TableCell><TableCell className="text-right">{totals.travelers}</TableCell>
            <TableCell className="text-right">{fmt(totals.revenue)}</TableCell><TableCell className="text-right text-destructive">{fmt(totals.due)}</TableCell>
            <TableCell className="text-right">{fmt(totals.expenses)}</TableCell><TableCell className={cn("text-right", totals.profit >= 0 ? "text-primary" : "text-destructive")}>{fmt(totals.profit)}</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}