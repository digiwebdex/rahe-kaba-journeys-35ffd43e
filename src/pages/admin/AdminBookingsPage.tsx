import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Download, Edit2, Trash2, Save, X, Search, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Plus, Eye, Copy, CreditCard, Receipt,
  FileText, RefreshCw, Upload as UploadIcon, User
} from "lucide-react";
import { generateInvoice, CompanyInfo, InvoicePayment } from "@/lib/invoiceGenerator";
import { useIsViewer } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AdminActionMenu, { ActionItem } from "@/components/admin/AdminActionMenu";
import CustomerSearchSelect from "@/components/admin/CustomerSearchSelect";

const inputClass = "w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";
const STATUSES = ["pending", "confirmed", "visa_processing", "ticket_issued", "completed", "cancelled"];
const fmt = (n: number) => `৳${Number(n || 0).toLocaleString()}`;

function BookingDetail({ bookingId }: { bookingId: string }) {
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [payRes, expRes] = await Promise.all([
        supabase.from("payments").select("*").eq("booking_id", bookingId).order("installment_number", { ascending: true }),
        supabase.from("expenses").select("*").eq("booking_id", bookingId).order("date", { ascending: false }),
      ]);
      setPayments(payRes.data || []);
      setExpenses(expRes.data || []);
      setLoading(false);
    };
    load();
  }, [bookingId]);

  if (loading) return <p className="text-xs text-muted-foreground py-3">Loading details...</p>;

  const totalPaid = payments.filter(p => p.status === "completed").reduce((s, p) => s + Number(p.amount), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const profit = totalPaid - totalExpenses;
  const totalDue = payments.filter(p => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0);

  const EXPENSE_LABELS: Record<string, string> = {
    visa: "Visa", ticket: "Ticket", hotel: "Hotel", transport: "Transport",
    food: "Food", guide: "Guide", office: "Office", other: "Other",
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/50 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-secondary/50 rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Payments Received</p>
          <p className="font-heading font-bold text-emerald-500 text-lg">{fmt(totalPaid)}</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Expenses Assigned</p>
          <p className="font-heading font-bold text-destructive text-lg">{fmt(totalExpenses)}</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Profit</p>
          <p className={`font-heading font-bold text-lg flex items-center gap-1 ${profit >= 0 ? "text-emerald-500" : "text-destructive"}`}>
            {profit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {fmt(profit)}
          </p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Due Amount</p>
          <p className="font-heading font-bold text-yellow-600 text-lg">{fmt(totalDue)}</p>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Installment History ({payments.length})</h4>
        {payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-3">#</th><th className="pb-2 pr-3">Amount</th>
                  <th className="pb-2 pr-3">Method</th><th className="pb-2 pr-3">Due Date</th>
                  <th className="pb-2 pr-3">Paid Date</th><th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: any) => (
                  <tr key={p.id} className="border-b border-border/30">
                    <td className="py-2 pr-3 font-medium">{p.installment_number || "—"}</td>
                    <td className="py-2 pr-3 font-medium">{fmt(p.amount)}</td>
                    <td className="py-2 pr-3 capitalize">{p.payment_method || "—"}</td>
                    <td className="py-2 pr-3">{p.due_date ? new Date(p.due_date).toLocaleDateString() : "—"}</td>
                    <td className="py-2 pr-3">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}</td>
                    <td className="py-2">
                      <Badge variant={p.status === "completed" ? "default" : "secondary"} className="text-[10px]">{p.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No installments recorded.</p>
        )}
      </div>

      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Assigned Expenses ({expenses.length})</h4>
        {expenses.length > 0 ? (
          <div className="space-y-1">
            {expenses.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between bg-secondary/30 rounded px-3 py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="text-[10px] capitalize shrink-0">{EXPENSE_LABELS[e.expense_type] || e.category || "other"}</Badge>
                  <span className="text-xs truncate">{e.title}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground">{new Date(e.date).toLocaleDateString()}</span>
                  <span className="text-xs font-bold text-destructive">{fmt(e.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No expenses assigned to this booking.</p>
        )}
      </div>
    </div>
  );
}

export default function AdminBookingsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isViewer = useIsViewer();
  const [bookings, setBookings] = useState<any[]>([]);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewBooking, setViewBooking] = useState<any>(null);
  const [statusChangeId, setStatusChangeId] = useState<string | null>(null);
  const [statusChangeVal, setStatusChangeVal] = useState("");

  const fetchBookings = () =>
    supabase.from("bookings").select("*, packages(name, type, duration_days, price)")
      .order("created_at", { ascending: false })
      .then(({ data }) => setBookings(data || []));

  useEffect(() => { fetchBookings(); }, []);

  useEffect(() => {
    if (searchParams.get("action") === "create") navigate("/admin/bookings/create", { replace: true });
  }, [searchParams]);

  const startEdit = (b: any) => {
    setEditingId(b.id);
    setEditForm({
      status: b.status, total_amount: b.total_amount, notes: b.notes || "",
      num_travelers: b.num_travelers, paid_amount: Number(b.paid_amount || 0),
      guest_name: b.guest_name || "", guest_phone: b.guest_phone || "",
      guest_email: b.guest_email || "", guest_address: b.guest_address || "",
      guest_passport: b.guest_passport || "", user_id: b.user_id || null,
    });
  };

  const editDue = editingId ? Math.max(0, Number(editForm.total_amount || 0) - Number(editForm.paid_amount || 0)) : 0;

  const saveEdit = async () => {
    if (!editingId) return;
    const total = Math.max(0, parseFloat(editForm.total_amount) || 0);
    const paid = Math.min(Math.max(0, parseFloat(editForm.paid_amount) || 0), total);
    const due = Math.max(0, total - paid);
    const { error } = await supabase.from("bookings").update({
      status: editForm.status, total_amount: total, paid_amount: paid,
      due_amount: due, notes: editForm.notes || null, num_travelers: parseInt(editForm.num_travelers),
      guest_name: editForm.guest_name?.trim() || null, guest_phone: editForm.guest_phone?.trim() || null,
      guest_email: editForm.guest_email?.trim() || null, guest_address: editForm.guest_address?.trim() || null,
      guest_passport: editForm.guest_passport?.trim() || null, user_id: editForm.user_id || null,
    }).eq("id", editingId);
    if (error) { toast.error(error.message); return; }
    toast.success("বুকিং আপডেট হয়েছে");
    setEditingId(null);
    fetchBookings();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("bookings").delete().eq("id", deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success("Booking deleted");
    setDeleteId(null);
    fetchBookings();
  };

  const handleDuplicate = async (b: any) => {
    const { error } = await supabase.from("bookings").insert({
      user_id: b.user_id, package_id: b.package_id, total_amount: b.total_amount,
      num_travelers: b.num_travelers, installment_plan_id: b.installment_plan_id,
      notes: `Duplicated from ${b.tracking_id}`, guest_name: b.guest_name,
      guest_phone: b.guest_phone, guest_email: b.guest_email,
      guest_address: b.guest_address, guest_passport: b.guest_passport,
      status: "pending", paid_amount: 0, due_amount: Number(b.total_amount),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("বুকিং ডুপ্লিকেট হয়েছে");
    fetchBookings();
  };

  const handleStatusChange = async () => {
    if (!statusChangeId || !statusChangeVal) return;
    const { error } = await supabase.from("bookings").update({ status: statusChangeVal }).eq("id", statusChangeId);
    if (error) { toast.error(error.message); return; }
    toast.success("স্ট্যাটাস পরিবর্তন হয়েছে");
    setStatusChangeId(null);
    fetchBookings();
  };

  const handleDownloadInvoice = async (b: any) => {
    setGeneratingId(b.id);
    try {
      const { data: payments } = await supabase.from("payments").select("*").eq("booking_id", b.id).order("installment_number", { ascending: true });
      const { data: cms } = await supabase.from("site_content" as any).select("content").eq("section_key", "contact").maybeSingle();
      const cmsContent = (cms as any)?.content || {};
      const company: CompanyInfo = { name: "RAHE KABA", phone: cmsContent.phone || "", email: cmsContent.email || "", address: cmsContent.location || "" };
      await generateInvoice({ ...b, packages: b.packages }, { full_name: b.guest_name, phone: b.guest_phone, passport_number: b.guest_passport, address: b.guest_address }, (payments || []) as InvoicePayment[], company);
      toast.success("Invoice downloaded");
    } catch { toast.error("Failed to generate invoice"); }
    setGeneratingId(null);
  };

  const filtered = bookings.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (b.tracking_id?.toLowerCase().includes(q) || b.guest_name?.toLowerCase()?.includes(q) || b.packages?.name?.toLowerCase().includes(q) || b.status?.toLowerCase().includes(q));
  });

  const getBookingActions = (b: any): ActionItem[] => [
    { label: "View Details", icon: <Eye className="h-3.5 w-3.5" />, onClick: () => setViewBooking(b) },
    { label: "Edit", icon: <Edit2 className="h-3.5 w-3.5" />, onClick: () => startEdit(b), variant: "warning", hidden: isViewer },
    { label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, onClick: () => setDeleteId(b.id), variant: "destructive", hidden: isViewer, separator: true },
    { label: "Duplicate", icon: <Copy className="h-3.5 w-3.5" />, onClick: () => handleDuplicate(b), variant: "purple", hidden: isViewer },
    { label: "Add Payment", icon: <CreditCard className="h-3.5 w-3.5" />, onClick: () => navigate(`/admin/payments?action=add`), variant: "success", hidden: isViewer, separator: true },
    { label: "Add Expense", icon: <Receipt className="h-3.5 w-3.5" />, onClick: () => navigate(`/admin/accounting?action=add`), variant: "success", hidden: isViewer },
    { label: "Change Status", icon: <RefreshCw className="h-3.5 w-3.5" />, onClick: () => { setStatusChangeId(b.id); setStatusChangeVal(b.status); }, hidden: isViewer },
    { label: "Download Invoice", icon: <Download className="h-3.5 w-3.5" />, onClick: () => handleDownloadInvoice(b), disabled: generatingId === b.id },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="font-heading text-xl font-bold">All Bookings</h2>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {!isViewer && (
            <button onClick={() => navigate("/admin/bookings/create")}
              className="inline-flex items-center gap-1.5 text-sm bg-gradient-gold text-primary-foreground font-semibold px-4 py-2 rounded-md hover:opacity-90 transition-opacity shadow-gold">
              <Plus className="h-4 w-4" /> নতুন বুকিং
            </button>
          )}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input className={inputClass + " pl-9"} placeholder="Search bookings..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {filtered.map((b: any) => (
        <div key={b.id} className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => { if (editingId !== b.id) setViewBooking(b); }}>
          {editingId === b.id ? (
            <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center">
                <p className="font-mono font-bold text-primary text-sm">{b.tracking_id}</p>
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md flex items-center gap-1"><Save className="h-3 w-3" /> সেভ</button>
                  <button onClick={() => setEditingId(null)} className="text-xs bg-secondary text-foreground px-3 py-1.5 rounded-md flex items-center gap-1"><X className="h-3 w-3" /> বাতিল</button>
                </div>
              </div>

              {/* Customer Search */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">কাস্টমার পরিবর্তন</label>
                <CustomerSearchSelect
                  selectedId={editForm.user_id}
                  onSelect={(c) => {
                    if (c) {
                      setEditForm((f: any) => ({
                        ...f, user_id: c.user_id,
                        guest_name: c.full_name || "", guest_phone: c.phone || "",
                        guest_email: c.email || "", guest_address: c.address || "",
                        guest_passport: c.passport_number || "",
                      }));
                    } else {
                      setEditForm((f: any) => ({
                        ...f, user_id: null,
                        guest_name: "", guest_phone: "", guest_email: "",
                        guest_address: "", guest_passport: "",
                      }));
                    }
                  }}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">কাস্টমার নাম</label>
                  <input className={inputClass} value={editForm.guest_name} onChange={(e) => setEditForm({ ...editForm, guest_name: e.target.value })} placeholder="নাম" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">ফোন</label>
                  <input className={inputClass} value={editForm.guest_phone} onChange={(e) => setEditForm({ ...editForm, guest_phone: e.target.value })} placeholder="ফোন" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">পাসপোর্ট</label>
                  <input className={inputClass} value={editForm.guest_passport} onChange={(e) => setEditForm({ ...editForm, guest_passport: e.target.value })} placeholder="পাসপোর্ট" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">স্ট্যাটাস</label>
                  <select className={inputClass} value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">মোট মূল্য (৳)</label>
                  <input className={inputClass} type="number" min={0} value={editForm.total_amount}
                    onChange={(e) => {
                      const total = Math.max(0, parseFloat(e.target.value) || 0);
                      setEditForm((f: any) => ({ ...f, total_amount: total, paid_amount: Math.min(f.paid_amount, total) }));
                    }} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">পরিশোধিত (৳)</label>
                  <input className={inputClass} type="number" min={0} max={editForm.total_amount} value={editForm.paid_amount}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, paid_amount: Math.min(Math.max(0, parseFloat(e.target.value) || 0), f.total_amount) }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">বকেয়া (৳)</label>
                  <div className={`${inputClass} bg-muted/50 font-bold ${editDue > 0 ? "text-destructive" : "text-emerald"}`}>
                    ৳{editDue.toLocaleString()}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">যাত্রী</label>
                  <input className={inputClass} type="number" min={1} value={editForm.num_travelers} onChange={(e) => setEditForm({ ...editForm, num_travelers: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">নোট</label>
                <input className={inputClass} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="অতিরিক্ত তথ্য..." />
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-mono font-bold text-primary text-sm">{b.tracking_id}</p>
                  <p className="text-sm text-muted-foreground">{b.guest_name || "Unknown"} • {b.packages?.name || "N/A"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${b.status === "completed" ? "text-emerald bg-emerald/10" : b.status === "cancelled" ? "text-destructive bg-destructive/10" : "text-primary bg-primary/10"}`}>
                    {b.status}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div><p className="text-muted-foreground text-xs">Package Price</p><p className="font-medium">{fmt(Number(b.packages?.price || b.total_amount))}</p></div>
                <div><p className="text-muted-foreground text-xs">Total</p><p className="font-medium">{fmt(Number(b.total_amount))}</p></div>
                <div><p className="text-muted-foreground text-xs">Paid</p><p className="font-medium text-emerald-500">{fmt(Number(b.paid_amount))}</p></div>
                <div><p className="text-muted-foreground text-xs">Due</p><p className="font-medium text-destructive">{fmt(Number(b.due_amount || 0))}</p></div>
              </div>
              <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  {expandedId === b.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {expandedId === b.id ? "Hide Details" : "View Details"}
                </button>
                <AdminActionMenu actions={getBookingActions(b)} inlineCount={3} />
              </div>
              {expandedId === b.id && <BookingDetail bookingId={b.id} />}
            </>
          )}
        </div>
      ))}
      {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">No bookings found.</p>}

      {/* View Booking Modal */}
      <Dialog open={!!viewBooking} onOpenChange={(o) => { if (!o) setViewBooking(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">বুকিং বিবরণ — {viewBooking?.tracking_id}</DialogTitle>
          </DialogHeader>
          {viewBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground text-xs block">কাস্টমার</span><span className="font-medium">{viewBooking.guest_name || "—"}</span></div>
                <div><span className="text-muted-foreground text-xs block">ফোন</span><span className="font-medium">{viewBooking.guest_phone || "—"}</span></div>
                <div><span className="text-muted-foreground text-xs block">প্যাকেজ</span><span className="font-medium">{viewBooking.packages?.name || "—"}</span></div>
                <div><span className="text-muted-foreground text-xs block">যাত্রী</span><span className="font-medium">{viewBooking.num_travelers}</span></div>
                <div><span className="text-muted-foreground text-xs block">মোট মূল্য</span><span className="font-medium">{fmt(Number(viewBooking.total_amount))}</span></div>
                <div><span className="text-muted-foreground text-xs block">পরিশোধিত</span><span className="font-medium text-emerald-500">{fmt(Number(viewBooking.paid_amount))}</span></div>
                <div><span className="text-muted-foreground text-xs block">বকেয়া</span><span className="font-medium text-destructive">{fmt(Number(viewBooking.due_amount || 0))}</span></div>
                <div><span className="text-muted-foreground text-xs block">স্ট্যাটাস</span><Badge variant={viewBooking.status === "completed" ? "default" : "secondary"} className="text-xs capitalize">{viewBooking.status}</Badge></div>
                <div><span className="text-muted-foreground text-xs block">পাসপোর্ট</span><span className="font-medium">{viewBooking.guest_passport || "—"}</span></div>
                <div><span className="text-muted-foreground text-xs block">তারিখ</span><span className="font-medium">{new Date(viewBooking.created_at).toLocaleDateString()}</span></div>
              </div>
              {viewBooking.notes && (
                <div><span className="text-muted-foreground text-xs block">নোট</span><p className="text-sm">{viewBooking.notes}</p></div>
              )}
              <BookingDetail bookingId={viewBooking.id} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Status Modal */}
      {statusChangeId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setStatusChangeId(null)}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading font-bold text-lg mb-3">স্ট্যাটাস পরিবর্তন করুন</h3>
            <select className={inputClass} value={statusChangeVal} onChange={(e) => setStatusChangeVal(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}</option>)}
            </select>
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setStatusChangeId(null)} className="text-sm px-4 py-2 rounded-md bg-secondary">বাতিল</button>
              <button onClick={handleStatusChange} className="text-sm px-4 py-2 rounded-md bg-gradient-gold text-primary-foreground font-semibold">আপডেট</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setDeleteId(null)}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading font-bold text-lg mb-2">Delete Booking?</h3>
            <p className="text-sm text-muted-foreground mb-4">This action cannot be undone. All associated payments will remain.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="text-sm px-4 py-2 rounded-md bg-secondary">Cancel</button>
              <button onClick={confirmDelete} className="text-sm px-4 py-2 rounded-md bg-destructive text-destructive-foreground">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
