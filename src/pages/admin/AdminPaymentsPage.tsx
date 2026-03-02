import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Edit2, Trash2, Save, X, Plus, Wallet, Search, CheckCircle, XCircle, Users } from "lucide-react";
import { generateReceipt, CompanyInfo, InvoicePayment } from "@/lib/invoiceGenerator";
import { getCompanyInfoForPdf } from "@/lib/entityPdfGenerator";
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

type PaymentType = "customer" | "moallem";

export default function AdminPaymentsPage() {
  const isViewer = useIsViewer();
  const canModify = useCanModifyFinancials();
  const [payments, setPayments] = useState<any[]>([]);
  const [moallemPayments, setMoallemPayments] = useState<any[]>([]);
  const [walletAccounts, setWalletAccounts] = useState<any[]>([]);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<PaymentType>("customer");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewTab, setViewTab] = useState<"all" | "customer" | "moallem">("all");

  const [showAddModal, setShowAddModal] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("action") === "add";
  });
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerBookings, setCustomerBookings] = useState<any[]>([]);
  const [moallems, setMoallems] = useState<any[]>([]);
  const [moallemBookings, setMoallemBookings] = useState<any[]>([]);
  const [paymentType, setPaymentType] = useState<PaymentType>("customer");
  const [addForm, setAddForm] = useState({
    customer_id: "", booking_id: "", amount: "",
    payment_method: "cash", transaction_id: "", paid_date: new Date().toISOString().split("T")[0],
    notes: "", wallet_account_id: "", moallem_id: "",
  });
  const [addLoading, setAddLoading] = useState(false);
  const [selectedBookingInfo, setSelectedBookingInfo] = useState<any>(null);

  const fetchPayments = async () => {
    const [payRes, moallemPayRes, walletRes, profileRes] = await Promise.all([
      supabase.from("payments").select("*, bookings(tracking_id, total_amount, paid_amount, due_amount, guest_name, guest_passport, num_travelers, status, packages(name, type, duration_days))").order("created_at", { ascending: false }),
      supabase.from("moallem_payments").select("*, moallems(name, phone), bookings:booking_id(tracking_id, total_amount, paid_amount, due_amount, paid_by_moallem, moallem_due, guest_name, packages(name, type))").order("created_at", { ascending: false }),
      supabase.from("accounts" as any).select("*").eq("type", "asset"),
      supabase.from("profiles").select("user_id, full_name, phone"),
    ]);
    const profileMap = new Map((profileRes.data || []).map((p: any) => [p.user_id, p]));
    const paymentsWithProfiles = (payRes.data || []).map((p: any) => ({
      ...p,
      profiles: profileMap.get(p.user_id) || null,
      _type: "customer" as PaymentType,
    }));
    setPayments(paymentsWithProfiles);
    setMoallemPayments((moallemPayRes.data || []).map((p: any) => ({
      ...p,
      _type: "moallem" as PaymentType,
    })));
    setWalletAccounts((walletRes.data as any[]) || []);
  };

  useEffect(() => { fetchPayments(); }, []);

  const openAddModal = async () => {
    setShowAddModal(true);
    setPaymentType("customer");
    resetAddForm();
    const [{ data: profileData }, { data: moallemData }] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, phone").order("full_name"),
      supabase.from("moallems").select("id, name, phone, total_due, total_deposit").eq("status", "active").order("name"),
    ]);
    setCustomers(profileData || []);
    setMoallems(moallemData || []);
  };

  const resetAddForm = () => {
    setAddForm({ customer_id: "", booking_id: "", amount: "", payment_method: "cash", transaction_id: "", paid_date: new Date().toISOString().split("T")[0], notes: "", wallet_account_id: "", moallem_id: "" });
    setSelectedBookingInfo(null);
    setCustomerBookings([]);
    setMoallemBookings([]);
  };

  const handlePaymentTypeChange = (type: PaymentType) => {
    setPaymentType(type);
    resetAddForm();
  };

  const handleCustomerChange = async (customerId: string) => {
    setAddForm((prev) => ({ ...prev, customer_id: customerId, booking_id: "" }));
    setSelectedBookingInfo(null);
    if (!customerId) { setCustomerBookings([]); return; }
    
    const { data: byUserId } = await supabase.from("bookings")
      .select("id, tracking_id, total_amount, paid_amount, due_amount, packages(name)")
      .eq("user_id", customerId)
      .order("created_at", { ascending: false });
    
    const { data: profile } = await supabase.from("profiles")
      .select("phone, email")
      .eq("user_id", customerId)
      .maybeSingle();
    
    let allBookings = [...(byUserId || [])];
    const existingIds = new Set(allBookings.map(b => b.id));
    
    if (profile?.phone) {
      const { data: byPhone } = await supabase.from("bookings")
        .select("id, tracking_id, total_amount, paid_amount, due_amount, packages(name)")
        .eq("guest_phone", profile.phone)
        .order("created_at", { ascending: false });
      (byPhone || []).forEach(b => { if (!existingIds.has(b.id)) { allBookings.push(b); existingIds.add(b.id); } });
    }
    
    if (profile?.email) {
      const { data: byEmail } = await supabase.from("bookings")
        .select("id, tracking_id, total_amount, paid_amount, due_amount, packages(name)")
        .eq("guest_email", profile.email)
        .order("created_at", { ascending: false });
      (byEmail || []).forEach(b => { if (!existingIds.has(b.id)) { allBookings.push(b); existingIds.add(b.id); } });
    }
    
    setCustomerBookings(allBookings);
  };

  const handleMoallemChange = async (moallemId: string) => {
    setAddForm((prev) => ({ ...prev, moallem_id: moallemId, booking_id: "" }));
    setSelectedBookingInfo(null);
    if (!moallemId) { setMoallemBookings([]); return; }
    
    const { data } = await supabase.from("bookings")
      .select("id, tracking_id, total_amount, paid_amount, due_amount, paid_by_moallem, moallem_due, guest_name, packages(name)")
      .eq("moallem_id", moallemId)
      .order("created_at", { ascending: false });
    
    setMoallemBookings(data || []);
  };

  const handleBookingChange = (bookingId: string) => {
    if (paymentType === "customer") {
      const booking = customerBookings.find((b) => b.id === bookingId);
      setSelectedBookingInfo(booking);
    } else {
      const booking = moallemBookings.find((b) => b.id === bookingId);
      setSelectedBookingInfo(booking);
    }
    setAddForm((prev) => ({ ...prev, booking_id: bookingId }));
  };

  const handleAddPayment = async () => {
    if (!addForm.amount || parseFloat(addForm.amount) <= 0) { toast.error("সঠিক পরিমাণ দিন"); return; }
    
    if (paymentType === "customer") {
      if (!addForm.booking_id) { toast.error("বুকিং নির্বাচন করুন"); return; }
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
        resetAddForm();
        fetchPayments();
      } catch (err: any) { toast.error(err.message); } finally { setAddLoading(false); }
    } else {
      // Moallem payment
      if (!addForm.moallem_id) { toast.error("মোয়াল্লেম নির্বাচন করুন"); return; }
      setAddLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const { error } = await supabase.from("moallem_payments").insert({
          moallem_id: addForm.moallem_id,
          booking_id: addForm.booking_id || null,
          amount: parseFloat(addForm.amount),
          payment_method: addForm.payment_method,
          date: addForm.paid_date,
          notes: addForm.notes.trim() || null,
          wallet_account_id: addForm.wallet_account_id || null,
          recorded_by: session?.user?.id || null,
        });
        if (error) throw error;
        toast.success("মোয়াল্লেম পেমেন্ট সফলভাবে যোগ হয়েছে");
        setShowAddModal(false);
        resetAddForm();
        fetchPayments();
      } catch (err: any) { toast.error(err.message); } finally { setAddLoading(false); }
    }
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
    if (deleteType === "moallem") {
      const { error } = await supabase.from("moallem_payments").delete().eq("id", deleteId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("payments").delete().eq("id", deleteId);
      if (error) { toast.error(error.message); return; }
    }
    toast.success("পেমেন্ট মুছে ফেলা হয়েছে"); setDeleteId(null); fetchPayments();
  };

  const handleReceipt = async (p: any) => {
    setGeneratingId(p.id);
    try {
      const { data: profile } = await supabase.from("profiles").select("full_name, phone, passport_number, address").eq("user_id", p.user_id).maybeSingle();
      const { data: allPayments } = await supabase.from("payments").select("*").eq("booking_id", p.booking_id);
      const company = await getCompanyInfoForPdf();
      const booking = p.bookings || {};
      await generateReceipt(p as InvoicePayment, { ...booking, packages: booking.packages }, profile || {}, company, (allPayments || []) as InvoicePayment[]);
      toast.success("রসিদ ডাউনলোড হয়েছে");
    } catch { toast.error("রসিদ তৈরি ব্যর্থ"); }
    setGeneratingId(null);
  };

  const [markPaidId, setMarkPaidId] = useState<string | null>(null);
  const [markPaidWallet, setMarkPaidWallet] = useState("");
  const [viewPayment, setViewPayment] = useState<any>(null);

  // Combine and filter all payments
  const allCombined = useMemo(() => {
    const customerItems = payments.map(p => ({
      ...p,
      _type: "customer" as PaymentType,
      _sortDate: p.paid_at || p.due_date || p.created_at,
      _displayName: p.profiles?.full_name || p.bookings?.guest_name || "—",
      _trackingId: p.bookings?.tracking_id || "—",
      _amount: Number(p.amount),
    }));
    const moallemItems = moallemPayments.map(p => ({
      ...p,
      _type: "moallem" as PaymentType,
      _sortDate: p.date || p.created_at,
      _displayName: p.moallems?.name || "—",
      _trackingId: p.bookings?.tracking_id || "—",
      _amount: Number(p.amount),
    }));
    let combined = viewTab === "customer" ? customerItems : viewTab === "moallem" ? moallemItems : [...customerItems, ...moallemItems];
    combined.sort((a, b) => new Date(b._sortDate).getTime() - new Date(a._sortDate).getTime());
    
    if (!searchQuery) return combined;
    const q = searchQuery.toLowerCase();
    return combined.filter(p => 
      p._displayName?.toLowerCase().includes(q) ||
      p._trackingId?.toLowerCase().includes(q) ||
      p.payment_method?.toLowerCase().includes(q) ||
      (p as any).transaction_id?.toLowerCase().includes(q)
    );
  }, [payments, moallemPayments, searchQuery, viewTab]);

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

      {/* View tabs */}
      <div className="flex gap-1 mb-4 border-b border-border">
        {[
          { key: "all" as const, label: `সব (${payments.length + moallemPayments.length})` },
          { key: "customer" as const, label: `কাস্টমার (${payments.length})` },
          { key: "moallem" as const, label: `মোয়াল্লেম (${moallemPayments.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setViewTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${viewTab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="pb-3 pr-4">ধরন</th>
              <th className="pb-3 pr-4">বুকিং</th>
              <th className="pb-3 pr-4">নাম</th>
              <th className="pb-3 pr-4">পরিমাণ</th>
              <th className="pb-3 pr-4">পদ্ধতি</th>
              <th className="pb-3 pr-4">তারিখ</th>
              <th className="pb-3 pr-4">স্ট্যাটাস</th>
              <th className="pb-3">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody>
            {allCombined.map((p: any) => (
              <tr key={`${p._type}-${p.id}`} className="border-b border-border/50 cursor-pointer hover:bg-secondary/30 transition-colors"
                onClick={() => { if (editingId !== p.id && markPaidId !== p.id) setViewPayment(p); }}>
                {p._type === "customer" && editingId === p.id ? (
                  <>
                    <td className="py-3 pr-4"><span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">কাস্টমার</span></td>
                    <td className="py-3 pr-4 font-mono text-xs">{p._trackingId}</td>
                    <td className="py-3 pr-4 text-xs">{p._displayName}</td>
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
                    <td className="py-3 pr-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p._type === "moallem" ? "bg-accent/20 text-accent-foreground" : "bg-primary/10 text-primary"}`}>
                        {p._type === "moallem" ? "মোয়াল্লেম" : "কাস্টমার"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">{p._trackingId}</td>
                    <td className="py-3 pr-4 text-xs">{p._displayName}</td>
                    <td className="py-3 pr-4 font-medium">{fmt(p._amount)}</td>
                    <td className="py-3 pr-4 capitalize text-xs">{p.payment_method || "—"}{p.transaction_id ? <span className="block text-muted-foreground">TxID: {p.transaction_id}</span> : ""}</td>
                    <td className="py-3 pr-4 text-xs">
                      {p._type === "moallem" 
                        ? (p.date ? new Date(p.date).toLocaleDateString() : "—")
                        : (p.paid_at ? new Date(p.paid_at).toLocaleDateString() : p.due_date ? new Date(p.due_date).toLocaleDateString() : "—")
                      }
                    </td>
                    <td className="py-3 pr-4">
                      {p._type === "moallem" ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-emerald bg-emerald/10">completed</span>
                      ) : (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${p.status === "completed" ? "text-emerald bg-emerald/10" : p.status === "pending" ? "text-primary bg-primary/10" : "text-destructive bg-destructive/10"}`}>
                          {p.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3" onClick={(e) => e.stopPropagation()}>
                      {p._type === "moallem" ? (
                        <AdminActionMenu inlineCount={1} actions={[
                          { label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, onClick: () => { setDeleteId(p.id); setDeleteType("moallem"); }, variant: "destructive", hidden: !canModify },
                        ]} />
                      ) : p.status === "pending" && markPaidId === p.id ? (
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
                            { label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, onClick: () => { setDeleteId(p.id); setDeleteType("customer"); }, variant: "destructive", hidden: !canModify, separator: true },
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
      {allCombined.length === 0 && <p className="text-center text-muted-foreground py-12">কোনো পেমেন্ট নেই।</p>}

      {/* Add Payment Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">নতুন পেমেন্ট যোগ করুন</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Payment Type Toggle */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">পেমেন্টের ধরন *</label>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePaymentTypeChange("customer")}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold border transition-colors ${paymentType === "customer" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"}`}>
                  কাস্টমার পেমেন্ট
                </button>
                <button
                  onClick={() => handlePaymentTypeChange("moallem")}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold border transition-colors ${paymentType === "moallem" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"}`}>
                  মোয়াল্লেম পেমেন্ট
                </button>
              </div>
            </div>

            {paymentType === "customer" ? (
              <>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">কাস্টমার নির্বাচন *</label>
                  <CustomerSearchSelect
                    selectedId={addForm.customer_id || null}
                    onSelect={(c) => {
                      if (c) handleCustomerChange(c.user_id);
                      else handleCustomerChange("");
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
              </>
            ) : (
              <>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">মোয়াল্লেম নির্বাচন *</label>
                  <select className={inputClass} value={addForm.moallem_id} onChange={(e) => handleMoallemChange(e.target.value)}>
                    <option value="">-- মোয়াল্লেম বাছাই করুন --</option>
                    {moallems.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}{m.phone ? ` (${m.phone})` : ""} — বকেয়া: {fmt(Number(m.total_due || 0))}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">বুকিং নির্বাচন (ঐচ্ছিক)</label>
                  <select className={inputClass} value={addForm.booking_id} onChange={(e) => handleBookingChange(e.target.value)} disabled={!addForm.moallem_id}>
                    <option value="">-- সব বুকিংয়ে বণ্টন --</option>
                    {moallemBookings.map((b) => (
                      <option key={b.id} value={b.id}>{b.tracking_id} — {b.guest_name || "N/A"} (মোয়াল্লেম বকেয়া: {fmt(Number(b.moallem_due || 0))})</option>
                    ))}
                  </select>
                  {addForm.moallem_id && moallemBookings.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">এই মোয়াল্লেমের কোনো বুকিং নেই।</p>
                  )}
                </div>
              </>
            )}

            {selectedBookingInfo && (
              <div className="bg-secondary/50 rounded-lg p-3 grid grid-cols-3 gap-2 text-xs">
                {paymentType === "customer" ? (
                  <>
                    <div><span className="text-muted-foreground block">মোট</span><span className="font-bold">{fmt(Number(selectedBookingInfo.total_amount))}</span></div>
                    <div><span className="text-muted-foreground block">পরিশোধিত</span><span className="font-bold text-emerald-500">{fmt(Number(selectedBookingInfo.paid_amount))}</span></div>
                    <div><span className="text-muted-foreground block">বকেয়া</span><span className="font-bold text-destructive">{fmt(Number(selectedBookingInfo.due_amount || 0))}</span></div>
                  </>
                ) : (
                  <>
                    <div><span className="text-muted-foreground block">মোট</span><span className="font-bold">{fmt(Number(selectedBookingInfo.total_amount))}</span></div>
                    <div><span className="text-muted-foreground block">মোয়াল্লেম পরিশোধিত</span><span className="font-bold text-emerald-500">{fmt(Number(selectedBookingInfo.paid_by_moallem || 0))}</span></div>
                    <div><span className="text-muted-foreground block">মোয়াল্লেম বকেয়া</span><span className="font-bold text-destructive">{fmt(Number(selectedBookingInfo.moallem_due || 0))}</span></div>
                  </>
                )}
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
              {paymentType === "customer" && (
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Transaction ID</label>
                  <input className={inputClass} value={addForm.transaction_id} onChange={(e) => setAddForm({ ...addForm, transaction_id: e.target.value })} placeholder="ঐচ্ছিক" maxLength={50} />
                </div>
              )}
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
              <div className="mb-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${viewPayment._type === "moallem" ? "bg-accent/20 text-accent-foreground" : "bg-primary/10 text-primary"}`}>
                  {viewPayment._type === "moallem" ? "মোয়াল্লেম পেমেন্ট" : "কাস্টমার পেমেন্ট"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground text-xs block">বুকিং</span><span className="font-mono font-medium">{viewPayment._trackingId}</span></div>
                <div><span className="text-muted-foreground text-xs block">নাম</span><span className="font-medium">{viewPayment._displayName}</span></div>
                <div><span className="text-muted-foreground text-xs block">পরিমাণ</span><span className="font-bold text-primary">{fmt(viewPayment._amount)}</span></div>
                <div><span className="text-muted-foreground text-xs block">পদ্ধতি</span><span className="font-medium capitalize">{viewPayment.payment_method || "—"}</span></div>
                {viewPayment._type === "customer" && (
                  <>
                    <div><span className="text-muted-foreground text-xs block">কিস্তি নং</span><span className="font-medium">{viewPayment.installment_number || "—"}</span></div>
                    <div>
                      <span className="text-muted-foreground text-xs block">স্ট্যাটাস</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${viewPayment.status === "completed" ? "text-emerald bg-emerald/10" : viewPayment.status === "pending" ? "text-primary bg-primary/10" : "text-destructive bg-destructive/10"}`}>
                        {viewPayment.status}
                      </span>
                    </div>
                  </>
                )}
                <div><span className="text-muted-foreground text-xs block">তারিখ</span><span className="font-medium">
                  {viewPayment._type === "moallem" 
                    ? (viewPayment.date ? new Date(viewPayment.date).toLocaleDateString() : "—")
                    : (viewPayment.paid_at ? new Date(viewPayment.paid_at).toLocaleDateString() : viewPayment.due_date ? new Date(viewPayment.due_date).toLocaleDateString() : "—")
                  }
                </span></div>
                {viewPayment.transaction_id && (
                  <div className="col-span-2"><span className="text-muted-foreground text-xs block">Transaction ID</span><span className="font-mono font-medium">{viewPayment.transaction_id}</span></div>
                )}
              </div>
              {viewPayment._type === "customer" && viewPayment.bookings && (
                <div className="border-t border-border/50 pt-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">বুকিং তথ্য</h4>
                  <div className="grid grid-cols-3 gap-3 bg-secondary/50 rounded-lg p-3">
                    <div><span className="text-muted-foreground text-xs block">মোট</span><span className="font-bold">{fmt(Number(viewPayment.bookings.total_amount))}</span></div>
                    <div><span className="text-muted-foreground text-xs block">পরিশোধিত</span><span className="font-bold text-emerald-500">{fmt(Number(viewPayment.bookings.paid_amount))}</span></div>
                    <div><span className="text-muted-foreground text-xs block">বকেয়া</span><span className="font-bold text-destructive">{fmt(Number(viewPayment.bookings.due_amount || 0))}</span></div>
                  </div>
                </div>
              )}
              {viewPayment._type === "moallem" && viewPayment.bookings && (
                <div className="border-t border-border/50 pt-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">বুকিং তথ্য</h4>
                  <div className="grid grid-cols-3 gap-3 bg-secondary/50 rounded-lg p-3">
                    <div><span className="text-muted-foreground text-xs block">মোট</span><span className="font-bold">{fmt(Number(viewPayment.bookings.total_amount))}</span></div>
                    <div><span className="text-muted-foreground text-xs block">মোয়াল্লেম পেইড</span><span className="font-bold text-emerald-500">{fmt(Number(viewPayment.bookings.paid_by_moallem || 0))}</span></div>
                    <div><span className="text-muted-foreground text-xs block">মোয়াল্লেম বকেয়া</span><span className="font-bold text-destructive">{fmt(Number(viewPayment.bookings.moallem_due || 0))}</span></div>
                  </div>
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
