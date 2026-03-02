import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Edit2, Trash2, Save, X, Plus, Wallet, Search, CheckCircle, XCircle } from "lucide-react";
import { generateReceipt, CompanyInfo, InvoicePayment } from "@/lib/invoiceGenerator";
import { useIsViewer, useCanModifyFinancials } from "@/components/admin/AdminLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AdminActionMenu from "@/components/admin/AdminActionMenu";
import CustomerSearchSelect from "@/components/admin/CustomerSearchSelect";

const inputClass = "w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";
const fmt = (n: number) => `৳${Number(n || 0).toLocaleString()}`;

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bkash", label: "bKash" },
  { value: "nagad", label: "Nagad" },
  { value: "bank", label: "Bank Transfer" },
  { value: "manual", label: "Manual" },
];

export default function AdminPaymentsPage() {
  const isViewer = useIsViewer();
  const canModify = useCanModifyFinancials();
  const [payments, setPayments] = useState<any[]>([]);
  const [walletAccounts, setWalletAccounts] = useState<any[]>([]);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [showAddModal, setShowAddModal] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("action") === "add";
  });
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerBookings, setCustomerBookings] = useState<any[]>([]);
  const [addForm, setAddForm] = useState({
    customer_id: "", booking_id: "", amount: "",
    payment_method: "cash", transaction_id: "", paid_date: new Date().toISOString().split("T")[0],
    notes: "", wallet_account_id: "",
  });
  const [addLoading, setAddLoading] = useState(false);
  const [selectedBookingInfo, setSelectedBookingInfo] = useState<any>(null);

  const fetchPayments = async () => {
    const [payRes, walletRes, profileRes] = await Promise.all([
      supabase.from("payments").select("*, bookings(tracking_id, total_amount, paid_amount, due_amount, guest_name, num_travelers, status, packages(name, type, duration_days))").order("created_at", { ascending: false }),
      supabase.from("accounts" as any).select("*").eq("type", "asset"),
      supabase.from("profiles").select("user_id, full_name, phone"),
    ]);
    const profileMap = new Map((profileRes.data || []).map((p: any) => [p.user_id, p]));
    const paymentsWithProfiles = (payRes.data || []).map((p: any) => ({
      ...p,
      profiles: profileMap.get(p.user_id) || null,
    }));
    setPayments(paymentsWithProfiles);
    setWalletAccounts((walletRes.data as any[]) || []);
  };

  useEffect(() => { fetchPayments(); }, []);

  const openAddModal = async () => {
    setShowAddModal(true);
    const { data } = await supabase.from("profiles").select("user_id, full_name, phone").order("full_name");
    setCustomers(data || []);
  };

  const handleCustomerChange = async (customerId: string) => {
    setAddForm((prev) => ({ ...prev, customer_id: customerId, booking_id: "" }));
    setSelectedBookingInfo(null);
    if (!customerId) { setCustomerBookings([]); return; }
    
    // Fetch bookings by user_id
    const { data: byUserId } = await supabase.from("bookings")
      .select("id, tracking_id, total_amount, paid_amount, due_amount, packages(name)")
      .eq("user_id", customerId)
      .order("created_at", { ascending: false });
    
    // Also fetch customer profile to find bookings by phone/email
    const { data: profile } = await supabase.from("profiles")
      .select("phone, email")
      .eq("user_id", customerId)
      .maybeSingle();
    
    let allBookings = [...(byUserId || [])];
    const existingIds = new Set(allBookings.map(b => b.id));
    
    // Search by guest_phone if profile has phone
    if (profile?.phone) {
      const { data: byPhone } = await supabase.from("bookings")
        .select("id, tracking_id, total_amount, paid_amount, due_amount, packages(name)")
        .eq("guest_phone", profile.phone)
        .order("created_at", { ascending: false });
      (byPhone || []).forEach(b => { if (!existingIds.has(b.id)) { allBookings.push(b); existingIds.add(b.id); } });
    }
    
    // Search by guest_email if profile has email
    if (profile?.email) {
      const { data: byEmail } = await supabase.from("bookings")
        .select("id, tracking_id, total_amount, paid_amount, due_amount, packages(name)")
        .eq("guest_email", profile.email)
        .order("created_at", { ascending: false });
      (byEmail || []).forEach(b => { if (!existingIds.has(b.id)) { allBookings.push(b); existingIds.add(b.id); } });
    }
    
    setCustomerBookings(allBookings);
  };

  const handleBookingChange = (bookingId: string) => {
    const booking = customerBookings.find((b) => b.id === bookingId);
    setSelectedBookingInfo(booking);
    setAddForm((prev) => ({ ...prev, booking_id: bookingId }));
  };

  const handleAddPayment = async () => {
    if (!addForm.booking_id) { toast.error("বুকিং নির্বাচন করুন"); return; }
    if (!addForm.amount || parseFloat(addForm.amount) <= 0) { toast.error("সঠিক পরিমাণ দিন"); return; }
    setAddLoading(true);
    try {
      const maxInstallment = payments
        .filter((p) => p.booking_id === addForm.booking_id)
        .reduce((max, p) => Math.max(max, p.installment_number || 0), 0);
      const { error } = await supabase.from("payments").insert({
        booking_id: addForm.booking_id, user_id: addForm.customer_id,
        customer_id: addForm.customer_id, amount: parseFloat(addForm.amount),
        payment_method: addForm.payment_method, transaction_id: addForm.transaction_id.trim() || null,
        status: "completed", paid_at: new Date(addForm.paid_date).toISOString(),
        due_date: addForm.paid_date, installment_number: maxInstallment + 1,
        notes: addForm.notes.trim() || null, wallet_account_id: addForm.wallet_account_id || null,
      } as any);
      if (error) throw error;
      toast.success("পেমেন্ট সফলভাবে যোগ হয়েছে");
      setShowAddModal(false);
      setAddForm({ customer_id: "", booking_id: "", amount: "", payment_method: "cash", transaction_id: "", paid_date: new Date().toISOString().split("T")[0], notes: "", wallet_account_id: "" });
      setSelectedBookingInfo(null); setCustomerBookings([]);
      fetchPayments();
    } catch (err: any) { toast.error(err.message); } finally { setAddLoading(false); }
  };

  const markPaid = async (id: string, walletId?: string) => {
    const update: any = { status: "completed", paid_at: new Date().toISOString() };
    if (walletId) update.wallet_account_id = walletId;
    const { error } = await supabase.from("payments").update(update).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("পেমেন্ট সম্পন্ন হয়েছে"); fetchPayments();
  };

  const startEdit = (p: any) => {
    setEditingId(p.id);
    setEditForm({ amount: p.amount, due_date: p.due_date || "", status: p.status, payment_method: p.payment_method || "manual", notes: p.notes || "", transaction_id: p.transaction_id || "" });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase.from("payments").update({
      amount: parseFloat(editForm.amount), due_date: editForm.due_date || null,
      status: editForm.status, payment_method: editForm.payment_method,
      notes: editForm.notes || null, transaction_id: editForm.transaction_id || null,
      ...(editForm.status === "completed" && !payments.find(p => p.id === editingId)?.paid_at ? { paid_at: new Date().toISOString() } : {}),
    }).eq("id", editingId);
    if (error) { toast.error(error.message); return; }
    toast.success("পেমেন্ট আপডেট হয়েছে"); setEditingId(null); fetchPayments();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("payments").delete().eq("id", deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success("পেমেন্ট মুছে ফেলা হয়েছে"); setDeleteId(null); fetchPayments();
  };

  const handleReceipt = async (p: any) => {
    setGeneratingId(p.id);
    try {
      const { data: profile } = await supabase.from("profiles").select("full_name, phone, passport_number, address").eq("user_id", p.user_id).maybeSingle();
      const { data: allPayments } = await supabase.from("payments").select("*").eq("booking_id", p.booking_id);
      const { data: cms } = await supabase.from("site_content" as any).select("content").eq("section_key", "contact").maybeSingle();
      const cmsContent = (cms as any)?.content || {};
      const company: CompanyInfo = { name: cmsContent.company_name || "RAHE KABA Tours & Travels", phone: cmsContent.phone || "+880 1601-505050", email: cmsContent.email || "rahekaba.info@gmail.com", address: "Dailorbagh Palli Bidyut Adjacent, Sonargaon Thana Road, Narayanganj-Dhaka" };
      const booking = p.bookings || {};
      await generateReceipt(p as InvoicePayment, { ...booking, packages: booking.packages }, profile || {}, company, (allPayments || []) as InvoicePayment[]);
      toast.success("রসিদ ডাউনলোড হয়েছে");
    } catch { toast.error("রসিদ তৈরি ব্যর্থ"); }
    setGeneratingId(null);
  };

  const [markPaidId, setMarkPaidId] = useState<string | null>(null);
  const [markPaidWallet, setMarkPaidWallet] = useState("");
  const [viewPayment, setViewPayment] = useState<any>(null);

  const filtered = payments.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.bookings?.tracking_id?.toLowerCase().includes(q) ||
      p.bookings?.guest_name?.toLowerCase().includes(q) ||
      (p as any).profiles?.full_name?.toLowerCase().includes(q) ||
      p.payment_method?.toLowerCase().includes(q) ||
      p.transaction_id?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {walletAccounts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {walletAccounts.map((w) => (
            <div key={w.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-3.5 w-3.5 text-primary" />
                <p className="text-xs text-muted-foreground">{w.name}</p>
              </div>
              <p className="text-lg font-heading font-bold text-primary">{fmt(w.balance)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h2 className="font-heading text-xl font-bold">পেমেন্ট ব্যবস্থাপনা</h2>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {canModify && (
            <button onClick={openAddModal}
              className="inline-flex items-center gap-1.5 text-sm bg-gradient-gold text-primary-foreground font-semibold px-4 py-2 rounded-md hover:opacity-90 transition-opacity shadow-gold whitespace-nowrap">
              <Plus className="h-4 w-4" /> নতুন পেমেন্ট
            </button>
          )}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input className={inputClass + " pl-9"} placeholder="ট্র্যাকিং ID, নাম দিয়ে খুঁজুন..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="pb-3 pr-4">বুকিং</th>
              <th className="pb-3 pr-4">কাস্টমার</th>
              <th className="pb-3 pr-4">পরিমাণ</th>
              <th className="pb-3 pr-4">পদ্ধতি</th>
              <th className="pb-3 pr-4">তারিখ</th>
              <th className="pb-3 pr-4">স্ট্যাটাস</th>
              <th className="pb-3">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p: any) => (
              <tr key={p.id} className="border-b border-border/50 cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => { if (editingId !== p.id && markPaidId !== p.id) setViewPayment(p); }}>
                {editingId === p.id ? (
                  <>
                    <td className="py-3 pr-4 font-mono text-xs">{p.bookings?.tracking_id || "—"}</td>
                    <td className="py-3 pr-4 text-xs">{(p as any).profiles?.full_name || p.bookings?.guest_name || "—"}</td>
                    <td className="py-3 pr-4"><input className={inputClass + " w-24"} type="number" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} /></td>
                    <td className="py-3 pr-4">
                      <select className={inputClass + " w-24"} value={editForm.payment_method} onChange={(e) => setEditForm({ ...editForm, payment_method: e.target.value })}>
                        {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </td>
                    <td className="py-3 pr-4"><input className={inputClass + " w-32"} type="date" value={editForm.due_date} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} /></td>
                    <td className="py-3 pr-4">
                      <select className={inputClass + " w-28"} value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                        {["pending", "completed", "failed", "refunded"].map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button onClick={saveEdit} className="text-xs text-primary hover:underline flex items-center gap-1"><Save className="h-3 w-3" /> Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-muted-foreground hover:underline"><X className="h-3 w-3" /></button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-3 pr-4 font-mono text-xs">{p.bookings?.tracking_id || "—"}</td>
                    <td className="py-3 pr-4 text-xs">{(p as any).profiles?.full_name || p.bookings?.guest_name || "—"}</td>
                    <td className="py-3 pr-4 font-medium">{fmt(Number(p.amount))}</td>
                    <td className="py-3 pr-4 capitalize text-xs">{p.payment_method || "—"}{p.transaction_id ? <span className="block text-muted-foreground">TxID: {p.transaction_id}</span> : ""}</td>
                    <td className="py-3 pr-4 text-xs">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : p.due_date ? new Date(p.due_date).toLocaleDateString() : "—"}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${p.status === "completed" ? "text-emerald bg-emerald/10" : p.status === "pending" ? "text-primary bg-primary/10" : "text-destructive bg-destructive/10"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3" onClick={(e) => e.stopPropagation()}>
                      {p.status === "pending" && markPaidId === p.id ? (
                        <div className="flex items-center gap-1.5">
                          <select className={inputClass + " w-28 !py-1 text-xs"} value={markPaidWallet} onChange={(e) => setMarkPaidWallet(e.target.value)}>
                            <option value="">Wallet</option>
                            {walletAccounts.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                          </select>
                          <button onClick={() => { markPaid(p.id, markPaidWallet || undefined); setMarkPaidId(null); }} className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">✓</button>
                          <button onClick={() => setMarkPaidId(null)} className="text-xs text-muted-foreground">✕</button>
                        </div>
                      ) : (
                        <AdminActionMenu
                          inlineCount={2}
                          actions={[
                            { label: "Edit", icon: <Edit2 className="h-3.5 w-3.5" />, onClick: () => startEdit(p), variant: "warning", hidden: !canModify },
                            { label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, onClick: () => setDeleteId(p.id), variant: "destructive", hidden: !canModify, separator: true },
                            { label: "Approve", icon: <CheckCircle className="h-3.5 w-3.5" />, onClick: () => { setMarkPaidId(p.id); setMarkPaidWallet(""); }, variant: "success", hidden: !canModify || p.status !== "pending" },
                            { label: "Reject", icon: <XCircle className="h-3.5 w-3.5" />, onClick: async () => {
                              const { error } = await supabase.from("payments").update({ status: "failed" }).eq("id", p.id);
                              if (error) toast.error(error.message);
                              else { toast.success("পেমেন্ট প্রত্যাখ্যাত"); fetchPayments(); }
                            }, variant: "destructive", hidden: !canModify || p.status !== "pending" },
                            { label: "Receipt", icon: <Download className="h-3.5 w-3.5" />, onClick: () => handleReceipt(p), disabled: generatingId === p.id, hidden: p.status !== "completed", separator: true },
                          ]}
                        />
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">কোনো পেমেন্ট নেই।</p>}

      {/* Add Payment Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">নতুন পেমেন্ট যোগ করুন</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">কাস্টমার নির্বাচন *</label>
              <CustomerSearchSelect
                selectedId={addForm.customer_id || null}
                onSelect={(c) => {
                  if (c) {
                    handleCustomerChange(c.user_id);
                  } else {
                    handleCustomerChange("");
                  }
                }}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">বুকিং নির্বাচন *</label>
              <select className={inputClass} value={addForm.booking_id} onChange={(e) => handleBookingChange(e.target.value)} disabled={!addForm.customer_id}>
                <option value="">-- বুকিং বাছাই করুন --</option>
                {customerBookings.map((b) => (
                  <option key={b.id} value={b.id}>{b.tracking_id} — {b.packages?.name || "N/A"} (বকেয়া: {fmt(Number(b.due_amount || 0))})</option>
                ))}
              </select>
              {addForm.customer_id && customerBookings.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">এই কাস্টমারের কোনো সক্রিয় বুকিং নেই।</p>
              )}
            </div>
            {selectedBookingInfo && (
              <div className="bg-secondary/50 rounded-lg p-3 grid grid-cols-3 gap-2 text-xs">
                <div><span className="text-muted-foreground block">মোট</span><span className="font-bold">{fmt(Number(selectedBookingInfo.total_amount))}</span></div>
                <div><span className="text-muted-foreground block">পরিশোধিত</span><span className="font-bold text-emerald-500">{fmt(Number(selectedBookingInfo.paid_amount))}</span></div>
                <div><span className="text-muted-foreground block">বকেয়া</span><span className="font-bold text-destructive">{fmt(Number(selectedBookingInfo.due_amount || 0))}</span></div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">পরিমাণ (৳) *</label>
                <input className={inputClass} type="number" min={1} value={addForm.amount} onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">পদ্ধতি *</label>
                <select className={inputClass} value={addForm.payment_method} onChange={(e) => setAddForm({ ...addForm, payment_method: e.target.value })}>
                  {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Transaction ID</label>
                <input className={inputClass} value={addForm.transaction_id} onChange={(e) => setAddForm({ ...addForm, transaction_id: e.target.value })} placeholder="ঐচ্ছিক" maxLength={50} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">তারিখ *</label>
                <input className={inputClass} type="date" value={addForm.paid_date} onChange={(e) => setAddForm({ ...addForm, paid_date: e.target.value })} />
              </div>
            </div>
            {walletAccounts.length > 0 && (
              <div>
                <label className="text-xs text-muted-foreground block mb-1">ওয়ালেট অ্যাকাউন্ট</label>
                <select className={inputClass} value={addForm.wallet_account_id} onChange={(e) => setAddForm({ ...addForm, wallet_account_id: e.target.value })}>
                  <option value="">-- ঐচ্ছিক --</option>
                  {walletAccounts.map((w) => <option key={w.id} value={w.id}>{w.name} — {fmt(w.balance)}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">নোট</label>
              <textarea className={inputClass + " resize-none"} rows={2} value={addForm.notes} onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })} placeholder="অতিরিক্ত তথ্য..." maxLength={500} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowAddModal(false)} className="text-sm px-4 py-2 rounded-md bg-secondary">বাতিল</button>
              <button onClick={handleAddPayment} disabled={addLoading}
                className="text-sm px-4 py-2 rounded-md bg-gradient-gold text-primary-foreground font-semibold hover:opacity-90 transition-opacity shadow-gold disabled:opacity-50 flex items-center gap-2">
                <Save className="h-4 w-4" />
                {addLoading ? "যোগ হচ্ছে..." : "পেমেন্ট যোগ করুন"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Payment Detail Modal */}
      <Dialog open={!!viewPayment} onOpenChange={(o) => { if (!o) setViewPayment(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">পেমেন্ট বিবরণ</DialogTitle>
          </DialogHeader>
          {viewPayment && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground text-xs block">বুকিং</span><span className="font-mono font-medium">{viewPayment.bookings?.tracking_id || "—"}</span></div>
                <div><span className="text-muted-foreground text-xs block">কাস্টমার</span><span className="font-medium">{viewPayment.profiles?.full_name || viewPayment.bookings?.guest_name || "—"}</span></div>
                <div><span className="text-muted-foreground text-xs block">পরিমাণ</span><span className="font-bold text-primary">{fmt(Number(viewPayment.amount))}</span></div>
                <div><span className="text-muted-foreground text-xs block">পদ্ধতি</span><span className="font-medium capitalize">{viewPayment.payment_method || "—"}</span></div>
                <div><span className="text-muted-foreground text-xs block">কিস্তি নং</span><span className="font-medium">{viewPayment.installment_number || "—"}</span></div>
                <div>
                  <span className="text-muted-foreground text-xs block">স্ট্যাটাস</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${viewPayment.status === "completed" ? "text-emerald bg-emerald/10" : viewPayment.status === "pending" ? "text-primary bg-primary/10" : "text-destructive bg-destructive/10"}`}>
                    {viewPayment.status}
                  </span>
                </div>
                <div><span className="text-muted-foreground text-xs block">Due Date</span><span className="font-medium">{viewPayment.due_date ? new Date(viewPayment.due_date).toLocaleDateString() : "—"}</span></div>
                <div><span className="text-muted-foreground text-xs block">Paid Date</span><span className="font-medium">{viewPayment.paid_at ? new Date(viewPayment.paid_at).toLocaleDateString() : "—"}</span></div>
                {viewPayment.transaction_id && (
                  <div className="col-span-2"><span className="text-muted-foreground text-xs block">Transaction ID</span><span className="font-mono font-medium">{viewPayment.transaction_id}</span></div>
                )}
              </div>
              {viewPayment.bookings && (
                <div className="border-t border-border/50 pt-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">বুকিং তথ্য</h4>
                  <div className="grid grid-cols-3 gap-3 bg-secondary/50 rounded-lg p-3">
                    <div><span className="text-muted-foreground text-xs block">মোট</span><span className="font-bold">{fmt(Number(viewPayment.bookings.total_amount))}</span></div>
                    <div><span className="text-muted-foreground text-xs block">পরিশোধিত</span><span className="font-bold text-emerald-500">{fmt(Number(viewPayment.bookings.paid_amount))}</span></div>
                    <div><span className="text-muted-foreground text-xs block">বকেয়া</span><span className="font-bold text-destructive">{fmt(Number(viewPayment.bookings.due_amount || 0))}</span></div>
                  </div>
                  {viewPayment.bookings.packages && (
                    <p className="text-xs text-muted-foreground mt-2">প্যাকেজ: <span className="text-foreground font-medium">{viewPayment.bookings.packages.name}</span> ({viewPayment.bookings.packages.type})</p>
                  )}
                </div>
              )}
              {viewPayment.notes && (
                <div><span className="text-muted-foreground text-xs block">নোট</span><p>{viewPayment.notes}</p></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setDeleteId(null)}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading font-bold text-lg mb-2">পেমেন্ট মুছবেন?</h3>
            <p className="text-sm text-muted-foreground mb-4">এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="text-sm px-4 py-2 rounded-md bg-secondary">বাতিল</button>
              <button onClick={confirmDelete} className="text-sm px-4 py-2 rounded-md bg-destructive text-destructive-foreground">মুছুন</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
