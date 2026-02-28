import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, Search, AlertTriangle, DollarSign, TrendingDown, CheckCircle, Clock } from "lucide-react";
import { differenceInDays, format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { exportPDF } from "@/lib/reportExport";

const fmt = (n: number) => `৳${Number(n || 0).toLocaleString()}`;

interface BookingReceivable {
  id: string;
  tracking_id: string;
  guest_name: string | null;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  status: string;
  created_at: string;
  user_id: string | null;
  package_name: string;
  package_type: string;
  num_travelers: number;
  pendingPayments: PendingPayment[];
}

interface PendingPayment {
  id: string;
  amount: number;
  due_date: string | null;
  installment_number: number | null;
  daysOverdue: number;
}

export default function AdminReceivablesPage() {
  const [bookings, setBookings] = useState<BookingReceivable[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "overdue" | "upcoming" | "paid">("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [bkRes, payRes, profRes] = await Promise.all([
        supabase.from("bookings").select("id, tracking_id, guest_name, total_amount, paid_amount, due_amount, status, created_at, user_id, num_travelers, packages(name, type)").order("created_at", { ascending: false }),
        supabase.from("payments").select("id, booking_id, amount, due_date, installment_number, status").eq("status", "pending"),
        supabase.from("profiles").select("user_id, full_name"),
      ]);

      const profMap: Record<string, string> = {};
      (profRes.data || []).forEach((p: any) => { profMap[p.user_id] = p.full_name || ""; });
      setProfiles(profMap);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const pendingByBooking: Record<string, PendingPayment[]> = {};
      (payRes.data || []).forEach((p: any) => {
        if (!pendingByBooking[p.booking_id]) pendingByBooking[p.booking_id] = [];
        const dueDate = p.due_date ? new Date(p.due_date) : null;
        pendingByBooking[p.booking_id].push({
          id: p.id,
          amount: Number(p.amount),
          due_date: p.due_date,
          installment_number: p.installment_number,
          daysOverdue: dueDate && dueDate < today ? differenceInDays(today, dueDate) : 0,
        });
      });

      const mapped: BookingReceivable[] = (bkRes.data || []).map((b: any) => ({
        id: b.id,
        tracking_id: b.tracking_id,
        guest_name: b.guest_name,
        total_amount: Number(b.total_amount),
        paid_amount: Number(b.paid_amount),
        due_amount: Number(b.due_amount ?? b.total_amount - b.paid_amount),
        status: b.status,
        created_at: b.created_at,
        user_id: b.user_id,
        package_name: b.packages?.name || "—",
        package_type: b.packages?.type || "—",
        num_travelers: b.num_travelers || 1,
        pendingPayments: pendingByBooking[b.id] || [],
      }));

      setBookings(mapped);
      setLoading(false);
    })();
  }, []);

  const getCustomerName = (b: BookingReceivable) =>
    b.guest_name || (b.user_id ? profiles[b.user_id] : null) || "Unknown";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filtered = useMemo(() => {
    let list = bookings;
    if (filter === "overdue") list = list.filter((b) => b.pendingPayments.some((p) => p.daysOverdue > 0));
    else if (filter === "upcoming") list = list.filter((b) => b.due_amount > 0 && !b.pendingPayments.some((p) => p.daysOverdue > 0));
    else if (filter === "paid") list = list.filter((b) => b.due_amount <= 0);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((b) =>
        b.tracking_id.toLowerCase().includes(q) ||
        getCustomerName(b).toLowerCase().includes(q) ||
        b.package_name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [bookings, filter, search, profiles]);

  const totalReceivable = bookings.reduce((s, b) => s + Math.max(0, b.due_amount), 0);
  const overdueReceivable = bookings.reduce((s, b) => {
    const overdueAmt = b.pendingPayments.filter((p) => p.daysOverdue > 0).reduce((ss, p) => ss + p.amount, 0);
    return s + overdueAmt;
  }, 0);
  const totalCollected = bookings.reduce((s, b) => s + b.paid_amount, 0);
  const overdueCount = bookings.filter((b) => b.pendingPayments.some((p) => p.daysOverdue > 0)).length;

  const handleExportPDF = () => {
    exportPDF({
      title: "Accounts Receivable Report",
      columns: ["Tracking ID", "Customer", "Package", "Total", "Paid", "Due", "Status"],
      rows: filtered.map((b) => [
        b.tracking_id,
        getCustomerName(b),
        b.package_name,
        b.total_amount,
        b.paid_amount,
        b.due_amount,
        b.status,
      ]),
    });
  };

  if (loading) return <div className="flex justify-center py-12 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="font-heading text-xl font-bold flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" /> Accounts Receivable
        </h2>
        <Button size="sm" variant="outline" onClick={handleExportPDF}>
          <FileDown className="h-4 w-4 mr-1" /> Export PDF
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Receivable", value: fmt(totalReceivable), icon: DollarSign, color: "text-primary", bg: "bg-primary/10" },
          { label: "Overdue Receivable", value: fmt(overdueReceivable), icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
          { label: "Total Collected", value: fmt(totalCollected), icon: CheckCircle, color: "text-primary", bg: "bg-primary/10" },
          { label: "Overdue Bookings", value: overdueCount, icon: Clock, color: "text-destructive", bg: "bg-destructive/10" },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", c.bg)}>
                  <c.icon className={cn("h-3.5 w-3.5", c.color)} />
                </div>
              </div>
              <p className={cn("text-xl font-heading font-bold", c.color)}>{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overdue Alert Banner */}
      {overdueCount > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
          <div>
            <p className="font-semibold text-destructive text-sm">
              {overdueCount} booking{overdueCount > 1 ? "s" : ""} with overdue payments totaling {fmt(overdueReceivable)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Review and send reminders from the Due Alerts page.</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by ID, customer, or package..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Bookings</SelectItem>
            <SelectItem value="overdue">Overdue Only</SelectItem>
            <SelectItem value="upcoming">Due (Not Overdue)</SelectItem>
            <SelectItem value="paid">Fully Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Receivables Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tracking ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Package</TableHead>
              <TableHead className="text-right">Total Price</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Overdue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-12">No bookings found</TableCell></TableRow>
            )}
            {filtered.map((b) => {
              const hasOverdue = b.pendingPayments.some((p) => p.daysOverdue > 0);
              const maxOverdue = Math.max(0, ...b.pendingPayments.map((p) => p.daysOverdue));
              const paidPercent = b.total_amount > 0 ? Math.round((b.paid_amount / b.total_amount) * 100) : 0;

              return (
                <TableRow key={b.id} className={hasOverdue ? "bg-destructive/5" : ""}>
                  <TableCell className="font-mono text-xs text-primary">{b.tracking_id}</TableCell>
                  <TableCell className="font-medium">{getCustomerName(b)}</TableCell>
                  <TableCell>
                    <span className="text-sm">{b.package_name}</span>
                    <span className="text-xs text-muted-foreground ml-1 capitalize">({b.package_type})</span>
                  </TableCell>
                  <TableCell className="text-right font-medium">{fmt(b.total_amount)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-primary font-medium">{fmt(b.paid_amount)}</span>
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${paidPercent}%` }} />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={cn("font-bold", b.due_amount > 0 ? "text-destructive" : "text-primary")}>
                      {fmt(b.due_amount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={b.status === "completed" ? "default" : b.status === "cancelled" ? "destructive" : "secondary"} className="capitalize text-xs">
                      {b.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {hasOverdue ? (
                      <Badge variant="destructive" className="text-xs gap-1">
                        <AlertTriangle className="h-3 w-3" /> {maxOverdue}d
                      </Badge>
                    ) : b.due_amount > 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <CheckCircle className="h-4 w-4 text-primary" />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}

            {/* Totals Row */}
            {filtered.length > 0 && (
              <TableRow className="bg-muted/40 font-bold border-t-2 border-border">
                <TableCell colSpan={3}>Total ({filtered.length} bookings)</TableCell>
                <TableCell className="text-right">{fmt(filtered.reduce((s, b) => s + b.total_amount, 0))}</TableCell>
                <TableCell className="text-right text-primary">{fmt(filtered.reduce((s, b) => s + b.paid_amount, 0))}</TableCell>
                <TableCell className="text-right text-destructive">{fmt(filtered.reduce((s, b) => s + Math.max(0, b.due_amount), 0))}</TableCell>
                <TableCell colSpan={2}></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
