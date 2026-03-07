import { useEffect, useMemo, useState, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CalendarIcon, FileDown, FileSpreadsheet, ChevronDown, ChevronUp, Users,
  TrendingUp, TrendingDown, DollarSign, Filter, Search, Package, Building2,
  BarChart3, Briefcase, ClipboardList
} from "lucide-react";
import {
  format, parseISO, isSameDay, getYear, getMonth, isWithinInterval,
  eachDayOfInterval, startOfMonth, subMonths
} from "date-fns";
import { cn } from "@/lib/utils";
import { exportPDF, exportExcel, exportHajjiPDF, exportHajjiExcel } from "@/lib/reportExport";
import { useCanSeeProfit } from "@/components/admin/AdminLayout";

const fmt = (n: number) => `৳${Number(n || 0).toLocaleString()}`;
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function AdminReportsPage() {
  const canSeeProfit = useCanSeeProfit();
  const [bookings, setBookings] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [expenseTransactions, setExpenseTransactions] = useState<any[]>([]);
  const [moallems, setMoallems] = useState<any[]>([]);
  const [moallemPayments, setMoallemPayments] = useState<any[]>([]);
  const [supplierAgents, setSupplierAgents] = useState<any[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [supplierContracts, setSupplierContracts] = useState<any[]>([]);
  const [supplierContractPayments, setSupplierContractPayments] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState("financial");
  const [searchQuery, setSearchQuery] = useState("");

  // Filters
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(subMonths(new Date(), 5)));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [selectedYear, setSelectedYear] = useState(String(getYear(new Date())));
  const [filterPackage, setFilterPackage] = useState("all");
  const [filterMoallem, setFilterMoallem] = useState("all");
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    Promise.all([
      supabase.from("bookings").select("*, packages(name, type)").order("created_at", { ascending: false }),
      supabase.from("payments").select("*, bookings(tracking_id)").order("created_at", { ascending: false }),
      supabase.from("expenses").select("*").order("date", { ascending: false }),
      supabase.from("profiles").select("*"),
      supabase.from("transactions").select("*").eq("type", "expense"),
      supabase.from("moallems").select("*"),
      supabase.from("moallem_payments").select("*").order("date", { ascending: false }),
      supabase.from("supplier_agents").select("*"),
      supabase.from("supplier_agent_payments").select("*").order("date", { ascending: false }),
      supabase.from("packages").select("*"),
      supabase.from("supplier_contracts").select("*").order("created_at", { ascending: false }),
      supabase.from("supplier_contract_payments").select("*").order("payment_date", { ascending: false }),
    ]).then(([bk, py, ex, pr, tx, ml, mp, sa, sp, pk, sc, scp]) => {
      setBookings(bk.data || []);
      setPayments(py.data || []);
      setExpenses(ex.data || []);
      setProfiles(pr.data || []);
      setExpenseTransactions(tx.data || []);
      setMoallems(ml.data || []);
      setMoallemPayments(mp.data || []);
      setSupplierAgents(sa.data || []);
      setSupplierPayments(sp.data || []);
      setPackages(pk.data || []);
      setSupplierContracts(sc.data || []);
      setSupplierContractPayments(scp.data || []);
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

  const supplierMap = useMemo(() => {
    const m: Record<string, any> = {};
    supplierAgents.forEach((sa) => { m[sa.id] = sa; });
    return m;
  }, [supplierAgents]);

  const years = useMemo(() => {
    const s = new Set<number>();
    bookings.forEach((b) => s.add(getYear(parseISO(b.created_at))));
    payments.forEach((p) => p.paid_at && s.add(getYear(parseISO(p.paid_at))));
    if (s.size === 0) s.add(getYear(new Date()));
    return Array.from(s).sort((a, b) => b - a);
  }, [bookings, payments]);

  const dateInterval = useMemo(() => ({ start: dateFrom, end: dateTo }), [dateFrom, dateTo]);

  // Filtered bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const d = parseISO(b.created_at);
      if (!isWithinInterval(d, dateInterval)) return false;
      if (filterPackage !== "all" && b.package_id !== filterPackage) return false;
      if (filterMoallem !== "all" && b.moallem_id !== filterMoallem) return false;
      if (filterSupplier !== "all" && b.supplier_agent_id !== filterSupplier) return false;
      if (filterStatus !== "all" && b.status !== filterStatus) return false;
      return true;
    });
  }, [bookings, dateInterval, filterPackage, filterMoallem, filterSupplier, filterStatus]);

  // ══════════════════════════════════════════════
  //  FINANCIAL SUMMARY
  // ══════════════════════════════════════════════
  const financialSummary = useMemo(() => {
    const yr = Number(selectedYear);
    const completedPayments = payments.filter(p => p.status === "completed" && p.paid_at && getYear(parseISO(p.paid_at)) === yr);
    const yearExpenses = expenses.filter(e => getYear(parseISO(e.date)) === yr);
    const totalIncome = completedPayments.reduce((s, p) => s + Number(p.amount), 0);
    const totalExpense = yearExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const yearBookings = bookings.filter(b => getYear(parseISO(b.created_at)) === yr);
    const totalSelling = yearBookings.reduce((s, b) => s + Number(b.total_amount || 0), 0);
    const totalDue = yearBookings.reduce((s, b) => s + Number(b.due_amount || 0), 0);
    const totalCost = yearBookings.reduce((s, b) => s + Number(b.total_cost || 0), 0);
    const totalCommission = yearBookings.reduce((s, b) => s + Number(b.total_commission || 0), 0);

    // Monthly breakdown
    const monthly = Array.from({ length: 12 }, (_, i) => {
      const mIncome = completedPayments.filter(p => getMonth(parseISO(p.paid_at)) === i).reduce((s, p) => s + Number(p.amount), 0);
      const mExpense = yearExpenses.filter(e => getMonth(parseISO(e.date)) === i).reduce((s, e) => s + Number(e.amount), 0);
      const mBookings = yearBookings.filter(b => getMonth(parseISO(b.created_at)) === i).length;
      return { month: MONTHS[i], income: mIncome, expense: mExpense, profit: mIncome - mExpense, bookings: mBookings };
    });

    // P&L
    const incomeByType: Record<string, number> = {};
    completedPayments.forEach(p => {
      const bk = bookings.find(b => b.id === p.booking_id);
      const cat = bk?.packages?.type ? `${bk.packages.type.charAt(0).toUpperCase() + bk.packages.type.slice(1)} Package` : "Other Income";
      incomeByType[cat] = (incomeByType[cat] || 0) + Number(p.amount);
    });
    const expenseByType: Record<string, number> = {};
    yearExpenses.forEach(e => {
      const label = (e.expense_type || "other").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
      expenseByType[label] = (expenseByType[label] || 0) + Number(e.amount);
    });

    return { totalIncome, totalExpense, totalSelling, totalDue, totalCost, totalCommission, netProfit: totalIncome - totalExpense, monthly, incomeByType, expenseByType, bookingCount: yearBookings.length };
  }, [payments, expenses, bookings, selectedYear]);

  // ══════════════════════════════════════════════
  //  CUSTOMER REPORT
  // ══════════════════════════════════════════════
  const customerRows = useMemo(() => {
    const map: Record<string, any> = {};
    filteredBookings.forEach(b => {
      const key = b.guest_phone || b.user_id || b.guest_name || "unknown";
      const profile = profileMap[b.user_id];
      if (!map[key]) {
        map[key] = {
          name: b.guest_name || profile?.full_name || "Unknown",
          phone: b.guest_phone || profile?.phone || "-",
          passport: b.guest_passport || profile?.passport_number || "-",
          totalBookings: 0, totalPaid: 0, totalDue: 0, totalAmount: 0, travelers: 0,
          bookingDetails: [], paymentDetails: [],
        };
      }
      map[key].totalBookings++;
      map[key].travelers += Number(b.num_travelers || 1);
      map[key].totalPaid += Number(b.paid_amount || 0);
      map[key].totalDue += Number(b.due_amount || 0);
      map[key].totalAmount += Number(b.total_amount || 0);
      map[key].bookingDetails.push({
        trackingId: b.tracking_id, packageName: b.packages?.name || "-",
        total: Number(b.total_amount), paid: Number(b.paid_amount),
        due: Number(b.due_amount || 0), status: b.status,
        date: format(parseISO(b.created_at), "dd MMM yyyy"),
      });
    });
    // Add payments
    payments.filter(p => p.status === "completed").forEach(p => {
      const bk = bookings.find(b => b.id === p.booking_id);
      if (!bk) return;
      const key = bk.guest_phone || bk.user_id || bk.guest_name || "unknown";
      if (map[key]) {
        map[key].paymentDetails.push({
          amount: Number(p.amount), date: p.paid_at ? format(parseISO(p.paid_at), "dd MMM yyyy") : "-",
          method: p.payment_method || "manual", trackingId: p.bookings?.tracking_id || "-",
        });
      }
    });
    const q = searchQuery.toLowerCase();
    return Object.values(map)
      .filter((r: any) => !q || r.name.toLowerCase().includes(q) || r.phone.includes(q))
      .sort((a: any, b: any) => b.totalDue - a.totalDue);
  }, [filteredBookings, payments, bookings, profileMap, searchQuery]);

  // ══════════════════════════════════════════════
  //  PACKAGE REPORT
  // ══════════════════════════════════════════════
  const packageRows = useMemo(() => {
    const map: Record<string, any> = {};
    filteredBookings.forEach(b => {
      const key = b.package_id;
      if (!map[key]) map[key] = { name: b.packages?.name || "-", type: b.packages?.type || "-", totalHajji: 0, totalSelling: 0, totalCost: 0, totalExpenses: 0, bookingCount: 0 };
      map[key].totalHajji += Number(b.num_travelers || 1);
      map[key].totalSelling += Number(b.total_amount || 0);
      map[key].totalCost += Number(b.total_cost || 0);
      map[key].bookingCount++;
    });
    expenses.filter(e => e.package_id).forEach(e => {
      if (map[e.package_id]) map[e.package_id].totalExpenses += Number(e.amount);
    });
    const q = searchQuery.toLowerCase();
    return Object.values(map)
      .map((d: any) => ({ ...d, profit: d.totalSelling - d.totalCost - d.totalExpenses }))
      .filter((r: any) => !q || r.name.toLowerCase().includes(q))
      .sort((a: any, b: any) => b.totalSelling - a.totalSelling);
  }, [filteredBookings, expenses, searchQuery]);

  // ══════════════════════════════════════════════
  //  MOALLEM REPORT
  // ══════════════════════════════════════════════
  const moallemRows = useMemo(() => {
    const map: Record<string, any> = {};
    // Initialize from moallems table with contract-based due/received
    moallems.forEach(ml => {
      const deposit = Number(ml.total_deposit || 0);
      const contracted = Number(ml.contracted_amount || 0);
      map[ml.id] = {
        name: ml.name || "Unknown", phone: ml.phone || "-", status: ml.status || "active",
        totalHajji: ml.contracted_hajji || 0, totalSale: contracted,
        totalReceived: deposit, totalDue: Math.max(0, contracted - deposit),
        totalCommission: 0, commissionPaid: 0, commissionDue: 0,
        expenses: 0, deposit,
        bookingDetails: [], paymentDetails: [],
      };
    });
    // Add booking details
    filteredBookings.filter(b => b.moallem_id && map[b.moallem_id]).forEach(b => {
      const m = map[b.moallem_id];
      m.totalCommission += Number(b.total_commission || 0);
      m.commissionPaid += Number(b.commission_paid || 0);
      m.commissionDue += Number(b.commission_due || 0);
      m.bookingDetails.push({
        trackingId: b.tracking_id, guestName: b.guest_name || profileMap[b.user_id]?.full_name || "-",
        packageName: b.packages?.name || "-", total: Number(b.total_amount),
        paid: Number(b.paid_amount), due: Number(b.due_amount || 0),
        status: b.status, date: format(parseISO(b.created_at), "dd MMM yyyy"),
      });
    });
    moallemPayments.forEach(mp => {
      try {
        if (!isWithinInterval(parseISO(mp.date), dateInterval)) return;
      } catch { return; }
      if (map[mp.moallem_id]) {
        map[mp.moallem_id].paymentDetails.push({
          amount: Number(mp.amount), date: format(parseISO(mp.date), "dd MMM yyyy"),
          method: mp.payment_method || "cash", notes: mp.notes || "-",
        });
      }
    });
    const q = searchQuery.toLowerCase();
    return Object.values(map)
      .filter((r: any) => r.totalSale > 0)
      .map((d: any) => ({ ...d, profit: d.totalSale - d.expenses - d.totalCommission }))
      .filter((r: any) => !q || r.name.toLowerCase().includes(q))
      .sort((a: any, b: any) => b.totalSale - a.totalSale);
  }, [filteredBookings, moallemPayments, moallems, moallemMap, profileMap, dateInterval, searchQuery]);

  // ══════════════════════════════════════════════
  //  SUPPLIER REPORT
  // ══════════════════════════════════════════════
  const supplierRows = useMemo(() => {
    const map: Record<string, any> = {};
    filteredBookings.filter(b => b.supplier_agent_id).forEach(b => {
      const sa = supplierMap[b.supplier_agent_id];
      if (!map[b.supplier_agent_id]) {
        map[b.supplier_agent_id] = {
          name: sa?.agent_name || "Unknown", company: sa?.company_name || "-", phone: sa?.phone || "-",
          totalCost: 0, totalPaid: 0, totalDue: 0, bookingCount: 0,
          bookingDetails: [], paymentDetails: [],
        };
      }
      map[b.supplier_agent_id].totalCost += Number(b.total_cost || 0);
      map[b.supplier_agent_id].totalPaid += Number(b.paid_to_supplier || 0);
      map[b.supplier_agent_id].totalDue += Number(b.supplier_due || 0);
      map[b.supplier_agent_id].bookingCount++;
      map[b.supplier_agent_id].bookingDetails.push({
        trackingId: b.tracking_id, guestName: b.guest_name || profileMap[b.user_id]?.full_name || "-",
        packageName: b.packages?.name || "-", cost: Number(b.total_cost || 0),
        paid: Number(b.paid_to_supplier || 0), due: Number(b.supplier_due || 0),
        status: b.status, date: format(parseISO(b.created_at), "dd MMM yyyy"),
      });
    });
    supplierPayments.forEach(sp => {
      try {
        if (!isWithinInterval(parseISO(sp.date), dateInterval)) return;
      } catch { return; }
      if (map[sp.supplier_agent_id]) {
        map[sp.supplier_agent_id].paymentDetails.push({
          amount: Number(sp.amount), date: format(parseISO(sp.date), "dd MMM yyyy"),
          method: sp.payment_method || "cash", notes: sp.notes || "-",
        });
      }
    });
    const q = searchQuery.toLowerCase();
    return Object.values(map)
      .filter((r: any) => !q || r.name.toLowerCase().includes(q) || (r.company && r.company.toLowerCase().includes(q)))
      .sort((a: any, b: any) => b.totalCost - a.totalCost);
  }, [filteredBookings, supplierPayments, supplierMap, profileMap, dateInterval, searchQuery]);

  // ══════════════════════════════════════════════
  //  SUPPLIER CONTRACT REPORT
  // ══════════════════════════════════════════════
  const supplierContractRows = useMemo(() => {
    const map: Record<string, any> = {};
    supplierContracts.forEach(c => {
      const sa = supplierMap[c.supplier_id];
      if (!map[c.supplier_id]) {
        map[c.supplier_id] = {
          name: sa?.agent_name || "Unknown", company: sa?.company_name || "-",
          pilgrimCount: 0, contractAmount: 0, totalPaid: 0, totalDue: 0,
          contracts: [], paymentDetails: [],
        };
      }
      map[c.supplier_id].pilgrimCount += Number(c.pilgrim_count || 0);
      map[c.supplier_id].contractAmount += Number(c.contract_amount || 0);
      map[c.supplier_id].totalPaid += Number(c.total_paid || 0);
      map[c.supplier_id].totalDue += Number(c.total_due || 0);
      map[c.supplier_id].contracts.push(c);
    });
    supplierContractPayments.forEach(p => {
      const contract = supplierContracts.find(c => c.id === p.contract_id);
      if (contract && map[contract.supplier_id]) {
        map[contract.supplier_id].paymentDetails.push({
          amount: Number(p.amount), date: format(parseISO(p.payment_date), "dd MMM yyyy"),
          method: p.payment_method || "cash", notes: p.note || "-",
        });
      }
    });
    const q = searchQuery.toLowerCase();
    return Object.values(map)
      .filter((r: any) => !q || r.name.toLowerCase().includes(q))
      .sort((a: any, b: any) => b.contractAmount - a.contractAmount);
  }, [supplierContracts, supplierContractPayments, supplierMap, searchQuery]);

  // ══════════════════════════════════════════════
  //  DAILY BOOKING REPORT
  // ══════════════════════════════════════════════
  const dailyBookingRows = useMemo(() => {
    const map: Record<string, any> = {};
    filteredBookings.forEach(b => {
      const dateKey = format(parseISO(b.created_at), "yyyy-MM-dd");
      if (!map[dateKey]) {
        map[dateKey] = {
          date: dateKey,
          dateFormatted: format(parseISO(b.created_at), "dd MMM yyyy"),
          bookings: [],
          totalAmount: 0,
          totalPaid: 0,
          totalDue: 0,
          travelers: 0,
          count: 0,
        };
      }
      map[dateKey].count++;
      map[dateKey].totalAmount += Number(b.total_amount || 0);
      map[dateKey].totalPaid += Number(b.paid_amount || 0);
      map[dateKey].totalDue += Number(b.due_amount || 0);
      map[dateKey].travelers += Number(b.num_travelers || 0);
      map[dateKey].bookings.push({
        trackingId: b.tracking_id,
        guestName: b.guest_name || profileMap[b.user_id]?.full_name || "-",
        packageName: b.packages?.name || "-",
        travelers: b.num_travelers,
        totalAmount: Number(b.total_amount || 0),
        paidAmount: Number(b.paid_amount || 0),
        dueAmount: Number(b.due_amount || 0),
        status: b.status,
      });
    });
    return Object.values(map).sort((a: any, b: any) => b.date.localeCompare(a.date));
  }, [filteredBookings, profileMap]);

  // ══════════════════════════════════════════════
  //  EXPORT HANDLERS
  // ══════════════════════════════════════════════
  const handleExport = (type: "pdf" | "excel") => {
    let data: any;
    const makeSummary = (paid: number, due: number) => [`Total Paid: ৳${paid.toLocaleString()}`, `Total Due: ৳${due.toLocaleString()}`];
    switch (activeTab) {
      case "financial": {
        const cols = canSeeProfit ? ["Month","Income","Expenses","Profit","Bookings"] : ["Month","Income","Expenses","Bookings"];
        const rows = financialSummary.monthly.map(r => canSeeProfit ? [r.month, r.income, r.expense, r.profit, r.bookings] : [r.month, r.income, r.expense, r.bookings]);
        data = { title: `Financial Summary - ${selectedYear}`, columns: cols, rows };
        break;
      }
      case "customer": {
        const totalPaid = customerRows.reduce((s: number, r: any) => s + r.totalPaid, 0);
        const totalDue = customerRows.reduce((s: number, r: any) => s + r.totalDue, 0);
        data = { title: "Customer Report", columns: ["Name", "Phone", "Pilgrim Count", "Contract Amount", "Total Paid", "Total Due"], rows: customerRows.map((r: any) => [r.name, r.phone, r.travelers, r.totalAmount, r.totalPaid, r.totalDue]), summary: makeSummary(totalPaid, totalDue) };
        break;
      }
      case "package": {
        const cols = canSeeProfit ? ["Package","Type","Total Hajji","Total Selling","Total Cost","Profit"] : ["Package","Type","Total Hajji","Total Selling","Total Cost"];
        const rows = packageRows.map((r: any) => canSeeProfit ? [r.name, r.type, r.totalHajji, r.totalSelling, r.totalCost, r.profit] : [r.name, r.type, r.totalHajji, r.totalSelling, r.totalCost]);
        data = { title: "Package Report", columns: cols, rows };
        break;
      }
      case "moallem": {
        const totalPaid = moallemRows.reduce((s: number, r: any) => s + r.totalReceived, 0);
        const totalDue = moallemRows.reduce((s: number, r: any) => s + r.totalDue, 0);
        data = { title: "Moallem Report", columns: ["Name", "Phone", "Pilgrim Count", "Contract Amount", "Total Paid", "Total Due"], rows: moallemRows.map((r: any) => [r.name, r.phone, r.totalHajji, r.totalSale, r.totalReceived, r.totalDue]), summary: makeSummary(totalPaid, totalDue) };
        break;
      }
      case "supplier": {
        const totalPaid = supplierRows.reduce((s: number, r: any) => s + r.totalPaid, 0);
        const totalDue = supplierRows.reduce((s: number, r: any) => s + r.totalDue, 0);
        data = { title: "Supplier Agent Report", columns: ["Name", "Phone", "Pilgrim Count", "Contract Amount", "Total Paid", "Total Due"], rows: supplierRows.map((r: any) => [r.name, r.phone || "-", r.bookingCount, r.totalCost, r.totalPaid, r.totalDue]), summary: makeSummary(totalPaid, totalDue) };
        break;
      }
      case "supplier_contract": {
        const totalPaid = supplierContractRows.reduce((s: number, r: any) => s + r.totalPaid, 0);
        const totalDue = supplierContractRows.reduce((s: number, r: any) => s + r.totalDue, 0);
        data = { title: "Supplier Contract Report", columns: ["Name", "Phone", "Pilgrim Count", "Contract Amount", "Total Paid", "Total Due"], rows: supplierContractRows.map((r: any) => [r.name, "-", r.pilgrimCount, r.contractAmount, r.totalPaid, r.totalDue]), summary: makeSummary(totalPaid, totalDue) };
        break;
      }
      case "daily": {
        const totalPaid = dailyBookingRows.reduce((s: number, r: any) => s + r.totalPaid, 0);
        const totalDue = dailyBookingRows.reduce((s: number, r: any) => s + r.totalDue, 0);
        const totalAmount = dailyBookingRows.reduce((s: number, r: any) => s + r.totalAmount, 0);
        data = { title: "Daily Booking Report", columns: ["Date", "Bookings", "Travelers", "Total Amount", "Total Paid", "Total Due"], rows: dailyBookingRows.map((r: any) => [r.dateFormatted, r.count, r.travelers, r.totalAmount, r.totalPaid, r.totalDue]), summary: [`Total Amount: ৳${totalAmount.toLocaleString()}`, ...makeSummary(totalPaid, totalDue)] };
        break;
      }
      default:
        data = { title: "Report", columns: [], rows: [] };
    }
    if (type === "pdf") exportPDF(data);
    else exportExcel(data);
  };

  // ══════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════
  const tabItems = [
    { value: "financial", label: "Financial Summary", icon: BarChart3 },
    { value: "daily", label: "Daily Booking", icon: ClipboardList },
    { value: "customer", label: "Customer Wise", icon: Users },
    { value: "package", label: "Package Wise", icon: Package },
    { value: "moallem", label: "Moallem Wise", icon: Briefcase },
    { value: "supplier", label: "Supplier Agent Wise", icon: Building2 },
    { value: "supplier_contract", label: "Supplier Contract", icon: FileDown },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold">Reports</h2>
          <p className="text-sm text-muted-foreground">Detailed financial analytics and insights</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleExport("pdf")}>
            <FileDown className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleExport("excel")}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSearchQuery(""); }}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {tabItems.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5 text-xs sm:text-sm">
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Global Filters ── */}
        <div className="flex items-center gap-2 py-3 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {activeTab !== "financial" && activeTab !== "daily" && (
            <div className="relative w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-9 text-sm" />
            </div>
          )}
          {activeTab === "financial" ? (
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          ) : (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 w-[140px] justify-start text-left font-normal text-xs">
                    <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />{format(dateFrom, "dd MMM yy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={d => d && setDateFrom(d)} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <span className="text-xs text-muted-foreground">—</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 w-[140px] justify-start text-left font-normal text-xs">
                    <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />{format(dateTo, "dd MMM yy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={d => d && setDateTo(d)} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { setDateFrom(new Date()); setDateTo(new Date()); }}>Today</Button>
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { setDateFrom(startOfMonth(new Date())); setDateTo(new Date()); }}>This Month</Button>
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { setDateFrom(startOfMonth(subMonths(new Date(), 11))); setDateTo(new Date()); }}>1 Year</Button>
              </div>
            </>
          )}
          {(activeTab === "customer" || activeTab === "moallem" || activeTab === "supplier" || activeTab === "daily") && (
            <>
              <Select value={filterPackage} onValueChange={setFilterPackage}>
                <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue placeholder="All Packages" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Packages</SelectItem>
                  {packages.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
          {activeTab === "customer" && (
            <Select value={filterMoallem} onValueChange={setFilterMoallem}>
              <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue placeholder="All Moallems" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Moallems</SelectItem>
                {moallems.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {activeTab === "customer" && (
            <Select value={filterSupplier} onValueChange={setFilterSupplier}>
              <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue placeholder="All Suppliers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {supplierAgents.map(s => <SelectItem key={s.id} value={s.id}>{s.agent_name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* ═══════════════════════════════════════
            FINANCIAL SUMMARY TAB
        ═══════════════════════════════════════ */}
        <TabsContent value="financial">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <SummaryCard label="Total Income" value={fmt(financialSummary.totalIncome)} icon={TrendingUp} color="text-primary" />
            <SummaryCard label="Total Expenses" value={fmt(financialSummary.totalExpense)} icon={TrendingDown} color="text-destructive" />
            {canSeeProfit && <SummaryCard label="Net Profit" value={fmt(financialSummary.netProfit)} icon={DollarSign} color={financialSummary.netProfit >= 0 ? "text-primary" : "text-destructive"} />}
            <SummaryCard label="Total Bookings" value={financialSummary.bookingCount} icon={CalendarIcon} color="text-foreground" />
            <SummaryCard label="Total Selling" value={fmt(financialSummary.totalSelling)} icon={DollarSign} color="text-foreground" />
            <SummaryCard label="Total Due" value={fmt(financialSummary.totalDue)} icon={TrendingDown} color="text-destructive" />
            {canSeeProfit && <SummaryCard label="Total Cost" value={fmt(financialSummary.totalCost)} icon={TrendingDown} color="text-muted-foreground" />}
            {canSeeProfit && <SummaryCard label="Total Commission" value={fmt(financialSummary.totalCommission)} icon={DollarSign} color="text-muted-foreground" />}
          </div>

          {/* Monthly Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Income</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    {canSeeProfit && <TableHead className="text-right">Profit</TableHead>}
                    <TableHead className="text-right">Bookings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financialSummary.monthly.map(r => (
                    <TableRow key={r.month}>
                      <TableCell className="font-medium">{r.month}</TableCell>
                      <TableCell className="text-right text-primary">{fmt(r.income)}</TableCell>
                      <TableCell className="text-right text-destructive">{fmt(r.expense)}</TableCell>
                      {canSeeProfit && <TableCell className={cn("text-right font-bold", r.profit >= 0 ? "text-primary" : "text-destructive")}>{fmt(r.profit)}</TableCell>}
                      <TableCell className="text-right">{r.bookings}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/40 font-bold border-t-2 border-border">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right text-primary">{fmt(financialSummary.totalIncome)}</TableCell>
                    <TableCell className="text-right text-destructive">{fmt(financialSummary.totalExpense)}</TableCell>
                    {canSeeProfit && <TableCell className={cn("text-right", financialSummary.netProfit >= 0 ? "text-primary" : "text-destructive")}>{fmt(financialSummary.netProfit)}</TableCell>}
                    <TableCell className="text-right">{financialSummary.bookingCount}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* P&L Section (Admin only) */}
          {canSeeProfit && (
            <Card className="mt-5">
              <CardContent className="p-6 space-y-5">
                <div className="text-center">
                  <h3 className="font-heading text-lg font-bold">Profit & Loss Statement</h3>
                  <p className="text-sm text-muted-foreground">For the year {selectedYear}</p>
                </div>
                <div>
                  <h4 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3 border-b border-border pb-2">Income</h4>
                  <div className="space-y-2">
                    {Object.entries(financialSummary.incomeByType).map(([cat, amount]) => (
                      <div key={cat} className="flex justify-between items-center px-2"><span className="text-sm">{cat}</span><span className="text-sm font-medium text-primary">{fmt(amount)}</span></div>
                    ))}
                    {Object.keys(financialSummary.incomeByType).length === 0 && <p className="text-sm text-muted-foreground px-2">No income recorded</p>}
                  </div>
                  <div className="flex justify-between items-center px-2 mt-3 pt-2 border-t border-border font-bold"><span>Total Income</span><span className="text-primary">{fmt(financialSummary.totalIncome)}</span></div>
                </div>
                <div>
                  <h4 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3 border-b border-border pb-2">Expenses</h4>
                  <div className="space-y-2">
                    {Object.entries(financialSummary.expenseByType).map(([cat, amount]) => (
                      <div key={cat} className="flex justify-between items-center px-2"><span className="text-sm">{cat}</span><span className="text-sm font-medium text-destructive">{fmt(amount)}</span></div>
                    ))}
                    {Object.keys(financialSummary.expenseByType).length === 0 && <p className="text-sm text-muted-foreground px-2">No expenses recorded</p>}
                  </div>
                  <div className="flex justify-between items-center px-2 mt-3 pt-2 border-t border-border font-bold"><span>Total Expenses</span><span className="text-destructive">{fmt(financialSummary.totalExpense)}</span></div>
                </div>
                <div className="border-t-2 border-border pt-4">
                  <div className="flex justify-between items-center px-2 bg-muted/40 rounded-lg py-3">
                    <span className="font-heading font-bold text-lg">Net Profit</span>
                    <span className={cn("font-heading font-bold text-xl", financialSummary.netProfit >= 0 ? "text-primary" : "text-destructive")}>{fmt(financialSummary.netProfit)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════
            DAILY BOOKING TAB
        ═══════════════════════════════════════ */}
        <TabsContent value="daily">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <SummaryCard label="Total Days" value={dailyBookingRows.length} icon={CalendarIcon} color="text-foreground" />
            <SummaryCard label="Total Bookings" value={dailyBookingRows.reduce((s: number, r: any) => s + r.count, 0)} icon={ClipboardList} color="text-foreground" />
            <SummaryCard label="Total Paid" value={fmt(dailyBookingRows.reduce((s: number, r: any) => s + r.totalPaid, 0))} icon={TrendingUp} color="text-primary" />
            <SummaryCard label="Total Due" value={fmt(dailyBookingRows.reduce((s: number, r: any) => s + r.totalDue, 0))} icon={TrendingDown} color="text-destructive" />
          </div>
          <ExpandableReportTable
            rows={dailyBookingRows}
            headers={["", "Date", "Bookings", "Travelers", "Total Amount", "Total Paid", "Total Due"]}
            renderRow={(r: any) => (
              <>
                <TableCell className="font-medium">{r.dateFormatted}</TableCell>
                <TableCell className="text-right">{r.count}</TableCell>
                <TableCell className="text-right">{r.travelers}</TableCell>
                <TableCell className="text-right font-medium">{fmt(r.totalAmount)}</TableCell>
                <TableCell className="text-right text-primary">{fmt(r.totalPaid)}</TableCell>
                <TableCell className="text-right text-destructive">{fmt(r.totalDue)}</TableCell>
              </>
            )}
            renderExpanded={(r: any) => (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tracking ID</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead className="text-right">Travelers</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.bookings.map((b: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{b.trackingId}</TableCell>
                      <TableCell>{b.guestName}</TableCell>
                      <TableCell>{b.packageName}</TableCell>
                      <TableCell className="text-right">{b.travelers}</TableCell>
                      <TableCell className="text-right">{fmt(b.totalAmount)}</TableCell>
                      <TableCell className="text-right text-primary">{fmt(b.paidAmount)}</TableCell>
                      <TableCell className="text-right text-destructive">{fmt(b.dueAmount)}</TableCell>
                      <TableCell><StatusBadge status={b.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            totalRow={
              <>
                <TableCell className="font-bold">Total</TableCell>
                <TableCell className="text-right font-bold">{dailyBookingRows.reduce((s: number, r: any) => s + r.count, 0)}</TableCell>
                <TableCell className="text-right font-bold">{dailyBookingRows.reduce((s: number, r: any) => s + r.travelers, 0)}</TableCell>
                <TableCell className="text-right font-bold">{fmt(dailyBookingRows.reduce((s: number, r: any) => s + r.totalAmount, 0))}</TableCell>
                <TableCell className="text-right font-bold text-primary">{fmt(dailyBookingRows.reduce((s: number, r: any) => s + r.totalPaid, 0))}</TableCell>
                <TableCell className="text-right font-bold text-destructive">{fmt(dailyBookingRows.reduce((s: number, r: any) => s + r.totalDue, 0))}</TableCell>
              </>
            }
          />
        </TabsContent>

        {/*
            CUSTOMER WISE TAB
        ═══════════════════════════════════════ */}
        <TabsContent value="customer">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <SummaryCard label="Total Customers" value={customerRows.length} icon={Users} color="text-foreground" />
            <SummaryCard label="Total Paid" value={fmt(customerRows.reduce((s: number, r: any) => s + r.totalPaid, 0))} icon={TrendingUp} color="text-primary" />
            <SummaryCard label="Total Due" value={fmt(customerRows.reduce((s: number, r: any) => s + r.totalDue, 0))} icon={TrendingDown} color="text-destructive" />
            <SummaryCard label="Total Bookings" value={customerRows.reduce((s: number, r: any) => s + r.totalBookings, 0)} icon={CalendarIcon} color="text-foreground" />
          </div>
          <ExpandableReportTable
            rows={customerRows}
            headers={["", "Name", "Phone", "Pilgrim Count", "Contract Amount", "Total Paid", "Total Due"]}
            renderRow={(r: any) => (
              <>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><Users className="h-3.5 w-3.5 text-primary" /></div>
                    {r.name}
                  </div>
                </TableCell>
                <TableCell>{r.phone}</TableCell>
                <TableCell className="text-right">{r.travelers}</TableCell>
                <TableCell className="text-right font-medium">{fmt(r.totalAmount)}</TableCell>
                <TableCell className="text-right text-primary font-medium">{fmt(r.totalPaid)}</TableCell>
                <TableCell className="text-right text-destructive font-medium">{fmt(r.totalDue)}</TableCell>
              </>
            )}
            renderExpanded={(r: any) => (
              <div className="space-y-4">
                {r.bookingDetails.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Booking List — {r.name}</p>
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
                            <td className="py-2"><StatusBadge status={bd.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {r.paymentDetails.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Payment History</p>
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-muted-foreground border-b border-border/50">
                        <th className="pb-2 pr-3">Tracking ID</th><th className="pb-2 pr-3">Date</th><th className="pb-2 pr-3 text-right">Amount</th><th className="pb-2">Method</th>
                      </tr></thead>
                      <tbody>
                        {r.paymentDetails.map((pd: any, j: number) => (
                          <tr key={j} className="border-b border-border/30">
                            <td className="py-2 pr-3 font-mono text-xs">{pd.trackingId}</td>
                            <td className="py-2 pr-3 text-muted-foreground">{pd.date}</td>
                            <td className="py-2 pr-3 text-right text-primary font-medium">{fmt(pd.amount)}</td>
                            <td className="py-2 capitalize">{pd.method}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            totalRow={
              <>
                <TableCell>Total</TableCell>
                <TableCell></TableCell>
                <TableCell className="text-right font-bold">{customerRows.reduce((s: number, r: any) => s + r.travelers, 0)}</TableCell>
                <TableCell className="text-right font-bold">{fmt(customerRows.reduce((s: number, r: any) => s + r.totalAmount, 0))}</TableCell>
                <TableCell className="text-right font-bold text-primary">{fmt(customerRows.reduce((s: number, r: any) => s + r.totalPaid, 0))}</TableCell>
                <TableCell className="text-right font-bold text-destructive">{fmt(customerRows.reduce((s: number, r: any) => s + r.totalDue, 0))}</TableCell>
              </>
            }
          />
        </TabsContent>

        {/* ═══════════════════════════════════════
            PACKAGE WISE TAB
        ═══════════════════════════════════════ */}
        <TabsContent value="package">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <SummaryCard label="Total Packages" value={packageRows.length} icon={Package} color="text-foreground" />
            <SummaryCard label="Total Hajji" value={packageRows.reduce((s: number, r: any) => s + r.totalHajji, 0)} icon={Users} color="text-primary" />
            <SummaryCard label="Total Selling" value={fmt(packageRows.reduce((s: number, r: any) => s + r.totalSelling, 0))} icon={TrendingUp} color="text-primary" />
            {canSeeProfit && <SummaryCard label="Total Profit" value={fmt(packageRows.reduce((s: number, r: any) => s + r.profit, 0))} icon={DollarSign} color="text-primary" />}
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Package Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Total Hajji</TableHead>
                    <TableHead className="text-right">Total Selling</TableHead>
                    {canSeeProfit && <TableHead className="text-right">Total Cost</TableHead>}
                    {canSeeProfit && <TableHead className="text-right">Profit</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packageRows.length === 0 && <TableRow><TableCell colSpan={canSeeProfit ? 6 : 4} className="text-center text-muted-foreground">No data</TableCell></TableRow>}
                  {packageRows.map((r: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell><Badge variant="secondary" className="capitalize text-xs">{r.type}</Badge></TableCell>
                      <TableCell className="text-right">{r.totalHajji}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(r.totalSelling)}</TableCell>
                      {canSeeProfit && <TableCell className="text-right text-muted-foreground">{fmt(r.totalCost)}</TableCell>}
                      {canSeeProfit && <TableCell className={cn("text-right font-bold", r.profit >= 0 ? "text-primary" : "text-destructive")}>{fmt(r.profit)}</TableCell>}
                    </TableRow>
                  ))}
                  {packageRows.length > 0 && (
                    <TableRow className="bg-muted/40 font-bold border-t-2 border-border">
                      <TableCell>Total</TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right">{packageRows.reduce((s: number, r: any) => s + r.totalHajji, 0)}</TableCell>
                      <TableCell className="text-right text-primary">{fmt(packageRows.reduce((s: number, r: any) => s + r.totalSelling, 0))}</TableCell>
                      {canSeeProfit && <TableCell className="text-right">{fmt(packageRows.reduce((s: number, r: any) => s + r.totalCost, 0))}</TableCell>}
                      {canSeeProfit && <TableCell className={cn("text-right", packageRows.reduce((s: number, r: any) => s + r.profit, 0) >= 0 ? "text-primary" : "text-destructive")}>{fmt(packageRows.reduce((s: number, r: any) => s + r.profit, 0))}</TableCell>}
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════
            MOALLEM WISE TAB
        ═══════════════════════════════════════ */}
        <TabsContent value="moallem">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <SummaryCard label="Total Moallems" value={moallemRows.length} icon={Briefcase} color="text-foreground" />
            <SummaryCard label="Total Hajji" value={moallemRows.reduce((s: number, r: any) => s + r.totalHajji, 0)} icon={Users} color="text-primary" />
            <SummaryCard label="Total Received" value={fmt(moallemRows.reduce((s: number, r: any) => s + r.totalReceived, 0))} icon={TrendingUp} color="text-primary" />
            <SummaryCard label="Total Due" value={fmt(moallemRows.reduce((s: number, r: any) => s + r.totalDue, 0))} icon={TrendingDown} color="text-destructive" />
          </div>
          <ExpandableReportTable
            rows={moallemRows}
            headers={["", "Name", "Phone", "Pilgrim Count", "Contract Amount", "Total Paid", "Total Due"]}
            renderRow={(r: any) => (
              <>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><Briefcase className="h-3.5 w-3.5 text-primary" /></div>
                    <div>
                      <p>{r.name}</p>
                      <span className={cn("text-xs px-1.5 py-0.5 rounded-full", r.status === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{r.status}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{r.phone}</TableCell>
                <TableCell className="text-right">{r.totalHajji}</TableCell>
                <TableCell className="text-right font-medium">{fmt(r.totalSale)}</TableCell>
                <TableCell className="text-right text-primary font-medium">{fmt(r.totalReceived)}</TableCell>
                <TableCell className="text-right text-destructive font-medium">{fmt(r.totalDue)}</TableCell>
              </>
            )}
            renderExpanded={(r: any) => (
              <div className="space-y-4">
                {r.bookingDetails.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Booking List — {r.name}</p>
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-muted-foreground border-b border-border/50">
                        <th className="pb-2 pr-3">Tracking ID</th><th className="pb-2 pr-3">Hajji</th><th className="pb-2 pr-3">Package</th><th className="pb-2 pr-3">Date</th>
                        <th className="pb-2 pr-3 text-right">Total</th><th className="pb-2 pr-3 text-right">Paid</th><th className="pb-2 pr-3 text-right">Due</th><th className="pb-2">Status</th>
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
                            <td className="py-2"><StatusBadge status={bd.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {r.paymentDetails.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Payment History (Deposits)</p>
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-muted-foreground border-b border-border/50">
                        <th className="pb-2 pr-3">Date</th><th className="pb-2 pr-3 text-right">Amount</th><th className="pb-2 pr-3">Method</th><th className="pb-2">Notes</th>
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
            )}
            totalRow={
              <>
                <TableCell>Total</TableCell>
                <TableCell></TableCell>
                <TableCell className="text-right font-bold">{moallemRows.reduce((s: number, r: any) => s + r.totalHajji, 0)}</TableCell>
                <TableCell className="text-right font-bold">{fmt(moallemRows.reduce((s: number, r: any) => s + r.totalSale, 0))}</TableCell>
                <TableCell className="text-right font-bold text-primary">{fmt(moallemRows.reduce((s: number, r: any) => s + r.totalReceived, 0))}</TableCell>
                <TableCell className="text-right font-bold text-destructive">{fmt(moallemRows.reduce((s: number, r: any) => s + r.totalDue, 0))}</TableCell>
              </>
            }
          />
        </TabsContent>

        {/* ═══════════════════════════════════════
            SUPPLIER AGENT WISE TAB
        ═══════════════════════════════════════ */}
        <TabsContent value="supplier">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <SummaryCard label="Total Suppliers" value={supplierRows.length} icon={Building2} color="text-foreground" />
            <SummaryCard label="Total Cost" value={fmt(supplierRows.reduce((s: number, r: any) => s + r.totalCost, 0))} icon={DollarSign} color="text-foreground" />
            <SummaryCard label="Total Paid" value={fmt(supplierRows.reduce((s: number, r: any) => s + r.totalPaid, 0))} icon={TrendingUp} color="text-primary" />
            <SummaryCard label="Total Due" value={fmt(supplierRows.reduce((s: number, r: any) => s + r.totalDue, 0))} icon={TrendingDown} color="text-destructive" />
          </div>
          <ExpandableReportTable
            rows={supplierRows}
            headers={["", "Name", "Phone", "Pilgrim Count", "Contract Amount", "Total Paid", "Total Due"]}
            renderRow={(r: any) => (
              <>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><Building2 className="h-3.5 w-3.5 text-primary" /></div>
                    <div>
                      <p>{r.name}</p>
                      {r.company !== "-" && <p className="text-[11px] text-muted-foreground">{r.company}</p>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.phone}</TableCell>
                <TableCell className="text-right font-medium">{r.bookingCount}</TableCell>
                <TableCell className="text-right font-medium">{fmt(r.totalCost)}</TableCell>
                <TableCell className="text-right text-primary font-medium">{fmt(r.totalPaid)}</TableCell>
                <TableCell className="text-right text-destructive font-medium">{fmt(r.totalDue)}</TableCell>
              </>
            )}
            renderExpanded={(r: any) => (
              <div className="space-y-4">
                {r.bookingDetails.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Linked Bookings — {r.name}</p>
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-muted-foreground border-b border-border/50">
                        <th className="pb-2 pr-3">Tracking ID</th><th className="pb-2 pr-3">Hajji</th><th className="pb-2 pr-3">Package</th><th className="pb-2 pr-3">Date</th>
                        <th className="pb-2 pr-3 text-right">Cost</th><th className="pb-2 pr-3 text-right">Paid</th><th className="pb-2 pr-3 text-right">Due</th><th className="pb-2">Status</th>
                      </tr></thead>
                      <tbody>
                        {r.bookingDetails.map((bd: any, j: number) => (
                          <tr key={j} className="border-b border-border/30">
                            <td className="py-2 pr-3 font-mono text-xs text-primary">{bd.trackingId}</td>
                            <td className="py-2 pr-3">{bd.guestName}</td>
                            <td className="py-2 pr-3">{bd.packageName}</td>
                            <td className="py-2 pr-3 text-muted-foreground">{bd.date}</td>
                            <td className="py-2 pr-3 text-right">{fmt(bd.cost)}</td>
                            <td className="py-2 pr-3 text-right text-primary">{fmt(bd.paid)}</td>
                            <td className="py-2 pr-3 text-right text-destructive">{fmt(bd.due)}</td>
                            <td className="py-2"><StatusBadge status={bd.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {r.paymentDetails.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Payment History</p>
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-muted-foreground border-b border-border/50">
                        <th className="pb-2 pr-3">Date</th><th className="pb-2 pr-3 text-right">Amount</th><th className="pb-2 pr-3">Method</th><th className="pb-2">Notes</th>
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
                {/* Payable Summary */}
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Payable Summary</p>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Total Cost:</span> <span className="font-bold ml-1">{fmt(r.totalCost)}</span></div>
                    <div><span className="text-muted-foreground">Total Paid:</span> <span className="font-bold text-primary ml-1">{fmt(r.totalPaid)}</span></div>
                    <div><span className="text-muted-foreground">Outstanding:</span> <span className="font-bold text-destructive ml-1">{fmt(r.totalDue)}</span></div>
                  </div>
                </div>
              </div>
            )}
            totalRow={
              <>
                <TableCell>Total</TableCell>
                <TableCell></TableCell>
                <TableCell className="text-right font-bold">{supplierRows.reduce((s: number, r: any) => s + r.bookingCount, 0)}</TableCell>
                <TableCell className="text-right font-bold">{fmt(supplierRows.reduce((s: number, r: any) => s + r.totalCost, 0))}</TableCell>
                <TableCell className="text-right font-bold text-primary">{fmt(supplierRows.reduce((s: number, r: any) => s + r.totalPaid, 0))}</TableCell>
                <TableCell className="text-right font-bold text-destructive">{fmt(supplierRows.reduce((s: number, r: any) => s + r.totalDue, 0))}</TableCell>
              </>
            }
          />
        </TabsContent>

        {/* ═══════════════════════════════════════
            SUPPLIER CONTRACT TAB
        ═══════════════════════════════════════ */}
        <TabsContent value="supplier_contract">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <SummaryCard label="Total Suppliers" value={supplierContractRows.length} icon={Building2} color="text-foreground" />
            <SummaryCard label="Total Pilgrims" value={supplierContractRows.reduce((s: number, r: any) => s + r.pilgrimCount, 0)} icon={Users} color="text-foreground" />
            <SummaryCard label="Total Paid" value={fmt(supplierContractRows.reduce((s: number, r: any) => s + r.totalPaid, 0))} icon={TrendingUp} color="text-primary" />
            <SummaryCard label="Total Due" value={fmt(supplierContractRows.reduce((s: number, r: any) => s + r.totalDue, 0))} icon={TrendingDown} color="text-destructive" />
          </div>
          <ExpandableReportTable
            rows={supplierContractRows}
            headers={["", "Supplier Name", "Pilgrim Count", "Contract Amount", "Total Paid", "Total Due"]}
            renderRow={(r: any) => (
              <>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><Building2 className="h-3.5 w-3.5 text-primary" /></div>
                    <div>
                      <p>{r.name}</p>
                      {r.company !== "-" && <p className="text-[11px] text-muted-foreground">{r.company}</p>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">{r.pilgrimCount}</TableCell>
                <TableCell className="text-right font-bold">{fmt(r.contractAmount)}</TableCell>
                <TableCell className="text-right text-primary font-medium">{fmt(r.totalPaid)}</TableCell>
                <TableCell className="text-right text-destructive font-medium">{fmt(r.totalDue)}</TableCell>
              </>
            )}
            renderExpanded={(r: any) => (
              <div className="space-y-4">
                {r.contracts.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Contracts — {r.name}</p>
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-muted-foreground border-b border-border/50">
                        <th className="pb-2 pr-3">Date</th><th className="pb-2 pr-3 text-right">Pilgrims</th>
                        <th className="pb-2 pr-3 text-right">Amount</th><th className="pb-2 pr-3 text-right">Paid</th><th className="pb-2 text-right">Due</th>
                      </tr></thead>
                      <tbody>
                        {r.contracts.map((c: any, j: number) => (
                          <tr key={j} className="border-b border-border/30">
                            <td className="py-2 pr-3 text-muted-foreground">{format(parseISO(c.created_at), "dd MMM yyyy")}</td>
                            <td className="py-2 pr-3 text-right">{c.pilgrim_count}</td>
                            <td className="py-2 pr-3 text-right font-bold">{fmt(c.contract_amount)}</td>
                            <td className="py-2 pr-3 text-right text-primary">{fmt(c.total_paid)}</td>
                            <td className="py-2 text-right text-destructive">{fmt(c.total_due)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {r.paymentDetails.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Payment History</p>
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-muted-foreground border-b border-border/50">
                        <th className="pb-2 pr-3">Date</th><th className="pb-2 pr-3 text-right">Amount</th><th className="pb-2 pr-3">Method</th><th className="pb-2">Notes</th>
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
            )}
            totalRow={
              <>
                <TableCell>Total</TableCell>
                <TableCell className="text-right font-bold">{supplierContractRows.reduce((s: number, r: any) => s + r.pilgrimCount, 0)}</TableCell>
                <TableCell className="text-right font-bold">{fmt(supplierContractRows.reduce((s: number, r: any) => s + r.contractAmount, 0))}</TableCell>
                <TableCell className="text-right font-bold text-primary">{fmt(supplierContractRows.reduce((s: number, r: any) => s + r.totalPaid, 0))}</TableCell>
                <TableCell className="text-right font-bold text-destructive">{fmt(supplierContractRows.reduce((s: number, r: any) => s + r.totalDue, 0))}</TableCell>
              </>
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ══════════════════════════════════════════════
//  REUSABLE COMPONENTS
// ══════════════════════════════════════════════

function SummaryCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <Icon className={cn("h-4 w-4", color)} />
        </div>
        <p className={cn("text-lg font-heading font-bold", color)}>{value}</p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full",
      status === "completed" ? "bg-primary/10 text-primary" :
      status === "cancelled" ? "bg-destructive/10 text-destructive" :
      status === "confirmed" ? "bg-blue-500/10 text-blue-600" :
      "bg-muted text-muted-foreground"
    )}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function ExpandableReportTable({ rows, headers, renderRow, renderExpanded, totalRow }: {
  rows: any[];
  headers: string[];
  renderRow: (r: any) => React.ReactNode;
  renderExpanded: (r: any) => React.ReactNode;
  totalRow: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((h, i) => (
                <TableHead key={i} className={i === 0 ? "w-8" : i > 2 ? "text-right" : ""}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={headers.length} className="text-center text-muted-foreground py-8">No data found</TableCell></TableRow>}
            {rows.map((r, i) => (
              <Fragment key={i}>
                <TableRow className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setExpanded(expanded === i ? null : i)}>
                  <TableCell className="px-2">
                    {expanded === i ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </TableCell>
                  {renderRow(r)}
                </TableRow>
                {expanded === i && (
                  <TableRow>
                    <TableCell colSpan={headers.length} className="bg-muted/20 p-0">
                      <div className="p-4">{renderExpanded(r)}</div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
            {rows.length > 0 && (
              <TableRow className="bg-muted/40 font-bold border-t-2 border-border">
                <TableCell></TableCell>
                {totalRow}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
