import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Edit2, Trash2, Save, X, Plus, Wallet, Search, CheckCircle, XCircle, Upload, FileText, Loader2, FileDown, FileSpreadsheet, ChevronDown, ChevronRight } from "lucide-react";
import { exportPDF, exportExcel } from "@/lib/reportExport";
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

type PaymentType = "customer" | "moallem" | "supplier";

export default function AdminPaymentsPage() {
  const isViewer = useIsViewer();
  const canModify = useCanModifyFinancials();
  const [payments, setPayments] = useState<any[]>([]);
  const [moallemPayments, setMoallemPayments] = useState<any[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<any[]>([]);
  const [walletAccounts, setWalletAccounts] = useState<any[]>([]);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<PaymentType>("customer");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewTab, setViewTab] = useState<"all" | "customer" | "moallem" | "supplier">("all");

  const [showAddModal, setShowAddModal] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("action") === "add";
  });
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [moallems, setMoallems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [paymentType, setPaymentType] = useState<PaymentType>("customer");
  const [bookingSearch, setBookingSearch] = useState("");
  const [addForm, setAddForm] = useState({
    customer_id: "", booking_id: "", amount: "",
    payment_method: "cash", transaction_id: "", paid_date: new Date().toISOString().split("T")[0],
    notes: "", wallet_account_id: "", moallem_id: "", supplier_id: "",
  });
  const [addLoading, setAddLoading] = useState(false);
  const [selectedBookingInfo, setSelectedBookingInfo] = useState<any>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [markPaidId, setMarkPaidId] = useState<string | null>(null);
  const [markPaidWallet, setMarkPaidWallet] = useState("");
  const [viewPayment, setViewPayment] = useState<any>(null);
  const [expandedMoallemId, setExpandedMoallemId] = useState<string | null>(null);
  const [expandedSupplierId, setExpandedSupplierId] = useState<string | null>(null);
  const fetchPayments = async () => {
    const [payRes, moallemPayRes, supplierPayRes, walletRes, profileRes] = await Promise.all([
      supabase.from("payments").select("*, bookings(tracking_id, total_amount, paid_amount, due_amount, guest_name, guest_passport, num_travelers, status, packages(name, type, duration_days))").order("created_at", { ascending: false }),
      supabase.from("moallem_payments").select("*, moallems(name, phone), bookings:booking_id(tracking_id, total_amount, paid_amount, due_amount, paid_by_moallem, moallem_due, guest_name, packages(name, type))").order("created_at", { ascending: false }),
      supabase.from("supplier_agent_payments").select("*, supplier_agents(agent_name, company_name), bookings:booking_id(tracking_id, total_amount, total_cost, paid_to_supplier, supplier_due, guest_name, packages(name, type))").order("created_at", { ascending: false }),
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
    setSupplierPayments((supplierPayRes.data || []).map((p: any) => ({
      ...p,
      _type: "supplier" as PaymentType,
    })));
    setWalletAccounts((walletRes.data as any[]) || []);
  };

  useEffect(() => { fetchPayments(); }, []);

  const openAddModal = async () => {
    setShowAddModal(true);
    setPaymentType("customer");
    resetAddForm();
    const [{ data: moallemData }, { data: supplierData }, { data: bookingsData }] = await Promise.all([
      supabase.from("moallems").select("id, name, phone, total_due, total_deposit").eq("status", "active").order("name"),
      supabase.from("supplier_agents").select("id, agent_name, company_name, phone").eq("status", "active").order("agent_name"),
      supabase.from("bookings").select("id, tracking_id, total_amount, paid_amount, due_amount, paid_by_moallem, moallem_due, total_cost, paid_to_supplier, supplier_due, guest_name, guest_phone, guest_passport, user_id, moallem_id, supplier_agent_id, status, packages(name, type)").order("created_at", { ascending: false }),
    ]);
    setMoallems(moallemData || []);
    setSuppliers(supplierData || []);
    setAllBookings(bookingsData || []);
  };

  const resetAddForm = () => {
    setAddForm({ customer_id: "", booking_id: "", amount: "", payment_method: "cash", transaction_id: "", paid_date: new Date().toISOString().split("T")[0], notes: "", wallet_account_id: "", moallem_id: "", supplier_id: "" });
    setSelectedBookingInfo(null);
    setBookingSearch("");
    setReceiptFile(null);
  };

  const uploadReceiptFile = async (paymentId: string): Promise<string | null> => {
    if (!receiptFile) return null;
    const ext = receiptFile.name.split(".").pop();
    const path = `${paymentType}/${paymentId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("payment-receipts").upload(path, receiptFile, { upsert: true });
    if (error) { toast.error("রিসিট আপলোড ব্যর্থ: " + error.message); return null; }
    return path;
  };

  const handlePaymentTypeChange = (type: PaymentType) => {
    setPaymentType(type);
    resetAddForm();
  };

  // Filter bookings based on payment type and search
  const filteredBookings = useMemo(() => {
    let filtered = allBookings;

    // Filter by entity when selected
    if (paymentType === "moallem" && addForm.moallem_id) {
      filtered = filtered.filter(b => b.moallem_id === addForm.moallem_id);
    } else if (paymentType === "supplier" && addForm.supplier_id) {
      filtered = filtered.filter(b => b.supplier_agent_id === addForm.supplier_id);
    } else if (paymentType === "customer" && addForm.customer_id) {
      filtered = filtered.filter(b => 
        b.user_id === addForm.customer_id || 
        (b.guest_phone && b.guest_phone === allBookings.find(bk => bk.user_id === addForm.customer_id)?.guest_phone)
      );
    }

    // Search filter
    if (bookingSearch.trim()) {
      const q = bookingSearch.toLowerCase();
      filtered = filtered.filter(b =>
        b.tracking_id?.toLowerCase().includes(q) ||
        b.guest_name?.toLowerCase().includes(q) ||
        b.guest_phone?.toLowerCase().includes(q) ||
        b.guest_passport?.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [allBookings, paymentType, addForm.moallem_id, addForm.supplier_id, addForm.customer_id, bookingSearch]);

  const handleBookingChange = (bookingId: string) => {
    const booking = allBookings.find((b) => b.id === bookingId);
    setSelectedBookingInfo(booking || null);
    setAddForm((prev) => ({ ...prev, booking_id: bookingId }));
  };

  const handleMoallemChange = (moallemId: string) => {
    setAddForm((prev) => ({ ...prev, moallem_id: moallemId, booking_id: "" }));
    setSelectedBookingInfo(null);
    setBookingSearch("");
  };

  const handleSupplierChange = (supplierId: string) => {
    setAddForm((prev) => ({ ...prev, supplier_id: supplierId, booking_id: "" }));
    setSelectedBookingInfo(null);
    setBookingSearch("");
  };

  const handleAddPayment = async () => {
    if (!addForm.amount || parseFloat(addForm.amount) <= 0) { toast.error("Enter a valid amount"); return; }
    
    if (paymentType === "customer") {
      if (!addForm.booking_id) { toast.error("Please select a booking"); return; }
      setAddLoading(true);
      try {
        const booking = allBookings.find(b => b.id === addForm.booking_id);
        const userId = addForm.customer_id || booking?.user_id || "00000000-0000-0000-0000-000000000000";
        const maxInstallment = payments
          .filter((p) => p.booking_id === addForm.booking_id)
          .reduce((max, p) => Math.max(max, p.installment_number || 0), 0);
        const tempId = crypto.randomUUID();
        const receiptPath = await uploadReceiptFile(tempId);
        const { error } = await supabase.from("payments").insert({
          booking_id: addForm.booking_id, user_id: userId,
          customer_id: addForm.customer_id || null, amount: parseFloat(addForm.amount),
          payment_method: addForm.payment_method, transaction_id: addForm.transaction_id.trim() || null,
          status: "completed", paid_at: new Date(addForm.paid_date).toISOString(),
          due_date: addForm.paid_date, installment_number: maxInstallment + 1,
          notes: addForm.notes.trim() || null, wallet_account_id: addForm.wallet_account_id || null,
          receipt_file_path: receiptPath,
        } as any);
        if (error) throw error;
        toast.success("Payment added successfully");
        setShowAddModal(false);
        resetAddForm();
        fetchPayments();
      } catch (err: any) { toast.error(err.message); } finally { setAddLoading(false); }
    } else if (paymentType === "moallem") {
      if (!addForm.moallem_id) { toast.error("Please select a moallem"); return; }
      setAddLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const tempId = crypto.randomUUID();
        const receiptPath = await uploadReceiptFile(tempId);
        const { error } = await supabase.from("moallem_payments").insert({
          moallem_id: addForm.moallem_id,
          booking_id: addForm.booking_id || null,
          amount: parseFloat(addForm.amount),
          payment_method: addForm.payment_method,
          date: addForm.paid_date,
          notes: addForm.notes.trim() || null,
          wallet_account_id: addForm.wallet_account_id || null,
          recorded_by: session?.user?.id || null,
          receipt_file_path: receiptPath,
        });
        if (error) throw error;
        toast.success("Moallem payment added successfully");
        setShowAddModal(false);
        resetAddForm();
        fetchPayments();
      } catch (err: any) { toast.error(err.message); } finally { setAddLoading(false); }
    } else {
      if (!addForm.supplier_id) { toast.error("Please select a supplier"); return; }
      setAddLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const tempId = crypto.randomUUID();
        const receiptPath = await uploadReceiptFile(tempId);
        const { error } = await supabase.from("supplier_agent_payments").insert({
          supplier_agent_id: addForm.supplier_id,
          booking_id: addForm.booking_id || null,
          amount: parseFloat(addForm.amount),
          payment_method: addForm.payment_method,
          date: addForm.paid_date,
          notes: addForm.notes.trim() || null,
          wallet_account_id: addForm.wallet_account_id || null,
          recorded_by: session?.user?.id || null,
          receipt_file_path: receiptPath,
        });
        if (error) throw error;
        toast.success("Supplier payment added successfully");
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
    toast.success("Payment completed"); fetchPayments();
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
    toast.success("Payment updated"); setEditingId(null); fetchPayments();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    if (deleteType === "moallem") {
      const { error } = await supabase.from("moallem_payments").delete().eq("id", deleteId);
      if (error) { toast.error(error.message); return; }
    } else if (deleteType === "supplier") {
      const { error } = await supabase.from("supplier_agent_payments").delete().eq("id", deleteId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("payments").delete().eq("id", deleteId);
      if (error) { toast.error(error.message); return; }
    }
    toast.success("Payment deleted"); setDeleteId(null); fetchPayments();
  };

  const handleReceipt = async (p: any) => {
    setGeneratingId(p.id);
    try {
      const { data: profile } = await supabase.from("profiles").select("full_name, phone, passport_number, address").eq("user_id", p.user_id).maybeSingle();
      const { data: allPayments } = await supabase.from("payments").select("*").eq("booking_id", p.booking_id);
      const company = await getCompanyInfoForPdf();
      const booking = p.bookings || {};
      await generateReceipt(p as InvoicePayment, { ...booking, packages: booking.packages }, profile || {}, company, (allPayments || []) as InvoicePayment[]);
      toast.success("Receipt downloaded");
    } catch { toast.error("Failed to generate receipt"); }
    setGeneratingId(null);
  };

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
    const supplierItems = supplierPayments.map(p => ({
      ...p,
      _type: "supplier" as PaymentType,
      _sortDate: p.date || p.created_at,
      _displayName: p.supplier_agents?.agent_name || "—",
      _trackingId: p.bookings?.tracking_id || "—",
      _amount: Number(p.amount),
    }));
    let combined: any[] = [];
    if (viewTab === "customer") combined = customerItems;
    else if (viewTab === "moallem") combined = moallemItems;
    else if (viewTab === "supplier") combined = supplierItems;
    else combined = [...customerItems, ...moallemItems, ...supplierItems];
    
    combined.sort((a, b) => new Date(b._sortDate).getTime() - new Date(a._sortDate).getTime());
    
    if (!searchQuery) return combined;
    const q = searchQuery.toLowerCase();
    return combined.filter(p => 
      p._displayName?.toLowerCase().includes(q) ||
      p._trackingId?.toLowerCase().includes(q) ||
      p.payment_method?.toLowerCase().includes(q) ||
      (p as any).transaction_id?.toLowerCase().includes(q)
    );
  }, [payments, moallemPayments, supplierPayments, searchQuery, viewTab]);

  const getTypeBadge = (type: PaymentType) => {
    if (type === "moallem") return { label: "Moallem", cls: "bg-accent/20 text-accent-foreground" };
    if (type === "supplier") return { label: "Supplier", cls: "bg-destructive/10 text-destructive" };
    return { label: "Customer", cls: "bg-primary/10 text-primary" };
  };

  // Grouped moallem payments
  const groupedMoallems = useMemo(() => {
    const map: Record<string, { name: string; phone: string; totalPaid: number; payments: any[] }> = {};
    moallemPayments.forEach((p: any) => {
      const mid = p.moallem_id;
      if (!map[mid]) map[mid] = { name: p.moallems?.name || "—", phone: p.moallems?.phone || "", totalPaid: 0, payments: [] };
      map[mid].totalPaid += Number(p.amount || 0);
      map[mid].payments.push(p);
    });
    // Sort payments within each group
    Object.values(map).forEach(g => g.payments.sort((a: any, b: any) => new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime()));
    return map;
  }, [moallemPayments]);

  // Grouped supplier payments
  const groupedSuppliers = useMemo(() => {
    const map: Record<string, { name: string; company: string; totalPaid: number; payments: any[] }> = {};
    supplierPayments.forEach((p: any) => {
      const sid = p.supplier_agent_id;
      if (!map[sid]) map[sid] = { name: p.supplier_agents?.agent_name || "—", company: p.supplier_agents?.company_name || "", totalPaid: 0, payments: [] };
      map[sid].totalPaid += Number(p.amount || 0);
      map[sid].payments.push(p);
    });
    Object.values(map).forEach(g => g.payments.sort((a: any, b: any) => new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime()));
    return map;
  }, [supplierPayments]);

  return (
    <div>
      {/* Export Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-heading text-xl font-bold">পেমেন্ট ম্যানেজমেন্ট</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => { const totalAmt = allCombined.reduce((s, p) => s + p._amount, 0); exportPDF({ title: "Payments Report", columns: ["Type", "Name", "Tracking ID", "Amount", "Method", "Date"], rows: allCombined.map(p => [p._type, p._displayName, p._trackingId, p._amount, p.payment_method || "—", p._sortDate ? new Date(p._sortDate).toLocaleDateString() : "—"]), summary: [`Total Paid: ৳${totalAmt.toLocaleString()}`] }); }} className="inline-flex items-center gap-1 text-xs bg-secondary px-3 py-1.5 rounded-md hover:bg-muted transition-colors"><FileDown className="h-3.5 w-3.5" />PDF</button>
          <button onClick={() => { const totalAmt = allCombined.reduce((s, p) => s + p._amount, 0); exportExcel({ title: "Payments Report", columns: ["Type", "Name", "Tracking ID", "Amount", "Method", "Date"], rows: allCombined.map(p => [p._type, p._displayName, p._trackingId, p._amount, p.payment_method || "—", p._sortDate ? new Date(p._sortDate).toLocaleDateString() : "—"]), summary: [`Total Paid: ৳${totalAmt.toLocaleString()}`] }); }} className="inline-flex items-center gap-1 text-xs bg-secondary px-3 py-1.5 rounded-md hover:bg-muted transition-colors"><FileSpreadsheet className="h-3.5 w-3.5" />Excel</button>
        </div>
      </div>

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
        <h2 className="font-heading text-xl font-bold">Payment Management</h2>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {canModify && (
            <button onClick={openAddModal}
              className="inline-flex items-center gap-1.5 text-sm bg-gradient-gold text-primary-foreground font-semibold px-4 py-2 rounded-md hover:opacity-90 transition-opacity shadow-gold whitespace-nowrap">
              <Plus className="h-4 w-4" /> New Payment
            </button>
          )}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input className={inputClass + " pl-9"} placeholder="Search by tracking ID, name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 mb-4 border-b border-border overflow-x-auto">
        {[
          { key: "all" as const, label: `All (${payments.length + moallemPayments.length + supplierPayments.length})` },
          { key: "customer" as const, label: `Customer (${payments.length})` },
          { key: "moallem" as const, label: `Moallem (${moallemPayments.length})` },
          { key: "supplier" as const, label: `Supplier (${supplierPayments.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setViewTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${viewTab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Grouped Moallem View */}
      {viewTab === "moallem" && (
        <div className="space-y-2">
          {Object.entries(groupedMoallems).length === 0 && <p className="text-center text-muted-foreground py-12">No moallem payments found.</p>}
          {Object.entries(groupedMoallems).map(([mid, group]) => (
            <div key={mid} className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Moallem Header Row */}
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedMoallemId(expandedMoallemId === mid ? null : mid)}
              >
                <div className="flex items-center gap-3">
                  {expandedMoallemId === mid ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <div>
                    <p className="font-medium text-foreground">{group.name}</p>
                    {group.phone && <p className="text-xs text-muted-foreground">{group.phone}</p>}
                  </div>
                  <span className="text-xs bg-accent/20 text-accent-foreground px-2 py-0.5 rounded-full">{group.payments.length} payments</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-heading font-bold text-primary">{fmt(group.totalPaid)}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); exportPDF({ title: `Moallem Payment History - ${group.name}`, columns: ["#", "Booking", "Amount", "Method", "Date", "Notes"], rows: group.payments.map((p: any, i: number) => [i + 1, p.bookings?.tracking_id || "—", Number(p.amount), p.payment_method || "—", p.date ? new Date(p.date).toLocaleDateString() : "—", p.notes || "—"]), summary: [`Total Paid: BDT ${group.totalPaid.toLocaleString("en-IN")}`] }); }}
                    className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-md hover:bg-primary/20 transition-colors"
                  >
                    <FileDown className="h-3.5 w-3.5" /> PDF
                  </button>
                </div>
              </div>
              {/* Expanded Transactions */}
              {expandedMoallemId === mid && (
                <div className="border-t border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 text-left text-muted-foreground bg-muted/20">
                        <th className="py-2 px-4">#</th>
                        <th className="py-2 px-4">Booking</th>
                        <th className="py-2 px-4">Amount</th>
                        <th className="py-2 px-4">Method</th>
                        <th className="py-2 px-4">Date</th>
                        <th className="py-2 px-4">Notes</th>
                        <th className="py-2 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.payments.map((p: any, i: number) => (
                        <tr key={p.id} className="border-b border-border/30 hover:bg-secondary/20">
                          <td className="py-2.5 px-4 text-xs text-muted-foreground">{i + 1}</td>
                          <td className="py-2.5 px-4 font-mono text-xs">{p.bookings?.tracking_id || "—"}</td>
                          <td className="py-2.5 px-4 font-medium">{fmt(p.amount)}</td>
                          <td className="py-2.5 px-4 capitalize text-xs">{p.payment_method || "—"}</td>
                          <td className="py-2.5 px-4 text-xs">{p.date ? new Date(p.date).toLocaleDateString() : "—"}</td>
                          <td className="py-2.5 px-4 text-xs text-muted-foreground truncate max-w-[150px]">{p.notes || "—"}</td>
                          <td className="py-2.5 px-4" onClick={(e) => e.stopPropagation()}>
                            <AdminActionMenu inlineCount={0} actions={[
                              { label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, onClick: () => { setDeleteId(p.id); setDeleteType("moallem"); }, variant: "destructive", hidden: !canModify },
                            ]} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Grouped Supplier View */}
      {viewTab === "supplier" && (
        <div className="space-y-2">
          {Object.entries(groupedSuppliers).length === 0 && <p className="text-center text-muted-foreground py-12">No supplier payments found.</p>}
          {Object.entries(groupedSuppliers).map(([sid, group]) => (
            <div key={sid} className="bg-card border border-border rounded-xl overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedSupplierId(expandedSupplierId === sid ? null : sid)}
              >
                <div className="flex items-center gap-3">
                  {expandedSupplierId === sid ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <div>
                    <p className="font-medium text-foreground">{group.name}</p>
                    {group.company && <p className="text-xs text-muted-foreground">{group.company}</p>}
                  </div>
                  <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">{group.payments.length} payments</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-heading font-bold text-destructive">{fmt(group.totalPaid)}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); exportPDF({ title: `Supplier Payment History - ${group.name}`, columns: ["#", "Booking", "Amount", "Method", "Date", "Notes"], rows: group.payments.map((p: any, i: number) => [i + 1, p.bookings?.tracking_id || "—", Number(p.amount), p.payment_method || "—", p.date ? new Date(p.date).toLocaleDateString() : "—", p.notes || "—"]), summary: [`Total Paid: BDT ${group.totalPaid.toLocaleString("en-IN")}`] }); }}
                    className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-md hover:bg-primary/20 transition-colors"
                  >
                    <FileDown className="h-3.5 w-3.5" /> PDF
                  </button>
                </div>
              </div>
              {expandedSupplierId === sid && (
                <div className="border-t border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 text-left text-muted-foreground bg-muted/20">
                        <th className="py-2 px-4">#</th>
                        <th className="py-2 px-4">Booking</th>
                        <th className="py-2 px-4">Amount</th>
                        <th className="py-2 px-4">Method</th>
                        <th className="py-2 px-4">Date</th>
                        <th className="py-2 px-4">Notes</th>
                        <th className="py-2 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.payments.map((p: any, i: number) => (
                        <tr key={p.id} className="border-b border-border/30 hover:bg-secondary/20">
                          <td className="py-2.5 px-4 text-xs text-muted-foreground">{i + 1}</td>
                          <td className="py-2.5 px-4 font-mono text-xs">{p.bookings?.tracking_id || "—"}</td>
                          <td className="py-2.5 px-4 font-medium">{fmt(p.amount)}</td>
                          <td className="py-2.5 px-4 capitalize text-xs">{p.payment_method || "—"}</td>
                          <td className="py-2.5 px-4 text-xs">{p.date ? new Date(p.date).toLocaleDateString() : "—"}</td>
                          <td className="py-2.5 px-4 text-xs text-muted-foreground truncate max-w-[150px]">{p.notes || "—"}</td>
                          <td className="py-2.5 px-4" onClick={(e) => e.stopPropagation()}>
                            <AdminActionMenu inlineCount={0} actions={[
                              { label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, onClick: () => { setDeleteId(p.id); setDeleteType("supplier"); }, variant: "destructive", hidden: !canModify },
                            ]} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Flat table for All and Customer tabs */}
      {(viewTab === "all" || viewTab === "customer") && (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="pb-3 pr-4">Type</th>
              <th className="pb-3 pr-4">Booking</th>
              <th className="pb-3 pr-4">Name</th>
              <th className="pb-3 pr-4">Amount</th>
              <th className="pb-3 pr-4">Method</th>
              <th className="pb-3 pr-4">Date</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allCombined.map((p: any) => {
              const badge = getTypeBadge(p._type);
              return (
              <tr key={`${p._type}-${p.id}`} className="border-b border-border/50 cursor-pointer hover:bg-secondary/30 transition-colors"
                onClick={() => { if (editingId !== p.id && markPaidId !== p.id) setViewPayment(p); }}>
                {p._type === "customer" && editingId === p.id ? (
                  <>
                    <td className="py-3 pr-4"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span></td>
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
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">{p._trackingId}</td>
                    <td className="py-3 pr-4 text-xs">
                      {p._displayName}
                      {p._type === "supplier" && p.supplier_agents?.company_name && (
                        <span className="block text-muted-foreground">{p.supplier_agents.company_name}</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 font-medium">{fmt(p._amount)}</td>
                    <td className="py-3 pr-4 capitalize text-xs">{p.payment_method || "—"}{p.transaction_id ? <span className="block text-muted-foreground">TxID: {p.transaction_id}</span> : ""}</td>
                    <td className="py-3 pr-4 text-xs">
                      {p._type === "customer"
                        ? (p.paid_at ? new Date(p.paid_at).toLocaleDateString() : p.due_date ? new Date(p.due_date).toLocaleDateString() : "—")
                        : (p.date ? new Date(p.date).toLocaleDateString() : "—")
                      }
                    </td>
                    <td className="py-3 pr-4">
                      {p._type === "customer" ? (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${p.status === "completed" ? "text-emerald bg-emerald/10" : p.status === "pending" ? "text-primary bg-primary/10" : "text-destructive bg-destructive/10"}`}>
                          {p.status}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-emerald bg-emerald/10">completed</span>
                      )}
                    </td>
                    <td className="py-3" onClick={(e) => e.stopPropagation()}>
                      {(p._type === "moallem" || p._type === "supplier") ? (
                        <AdminActionMenu inlineCount={1} actions={[
                          { label: "PDF", icon: <FileDown className="h-3.5 w-3.5" />, onClick: () => exportPDF({ title: `Payment - ${p._displayName}`, columns: ["Type", "Tracking ID", "Name", "Amount", "Method", "Date"], rows: [[badge.label, p._trackingId, p._displayName, p._amount, p.payment_method || "—", p.date ? new Date(p.date).toLocaleDateString() : "—"]], summary: [`Total Amount: ৳${p._amount.toLocaleString()}`] }) },
                          { label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, onClick: () => { setDeleteId(p.id); setDeleteType(p._type); }, variant: "destructive", hidden: !canModify },
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
                            { label: "PDF", icon: <FileDown className="h-3.5 w-3.5" />, onClick: () => exportPDF({ title: `Payment - ${p._displayName}`, columns: ["Type", "Tracking ID", "Name", "Amount", "Method", "Date", "Status"], rows: [[badge.label, p._trackingId, p._displayName, p._amount, p.payment_method || "—", p.paid_at ? new Date(p.paid_at).toLocaleDateString() : p.due_date ? new Date(p.due_date).toLocaleDateString() : "—", p.status]], summary: [`Total Amount: ৳${p._amount.toLocaleString()}`] }) },
                            { label: "Edit", icon: <Edit2 className="h-3.5 w-3.5" />, onClick: () => startEdit(p), variant: "warning", hidden: !canModify },
                            { label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, onClick: () => { setDeleteId(p.id); setDeleteType("customer"); }, variant: "destructive", hidden: !canModify, separator: true },
                            { label: "Approve", icon: <CheckCircle className="h-3.5 w-3.5" />, onClick: () => { setMarkPaidId(p.id); setMarkPaidWallet(""); }, variant: "success", hidden: !canModify || p.status !== "pending" },
                            { label: "Reject", icon: <XCircle className="h-3.5 w-3.5" />, onClick: async () => {
                              const { error } = await supabase.from("payments").update({ status: "failed" }).eq("id", p.id);
                              if (error) toast.error(error.message);
                              else { toast.success("Payment rejected"); fetchPayments(); }
                            }, variant: "destructive", hidden: !canModify || p.status !== "pending" },
                            { label: "Receipt", icon: <Download className="h-3.5 w-3.5" />, onClick: () => handleReceipt(p), disabled: generatingId === p.id, hidden: p.status !== "completed", separator: true },
                          ]}
                        />
                      )}
                    </td>
                  </>
                )}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
      {(viewTab === "all" || viewTab === "customer") && allCombined.length === 0 && <p className="text-center text-muted-foreground py-12">No payments found.</p>}

      {/* Add Payment Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Add New Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Payment Type Toggle */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Payment Type *</label>
              <div className="flex gap-2">
                {([
                  { key: "customer" as PaymentType, label: "Customer" },
                  { key: "moallem" as PaymentType, label: "Moallem" },
                  { key: "supplier" as PaymentType, label: "Supplier" },
                ] as const).map(t => (
                  <button key={t.key}
                    onClick={() => handlePaymentTypeChange(t.key)}
                    className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold border transition-colors ${paymentType === t.key ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Customer selection (optional for customer type) */}
            {paymentType === "customer" && (
              <div>
                <label className="text-xs text-muted-foreground block mb-1">কাস্টমার নির্বাচন (ঐচ্ছিক)</label>
                <CustomerSearchSelect
                  selectedId={addForm.customer_id || null}
                  onSelect={(c) => {
                    setAddForm(prev => ({ ...prev, customer_id: c?.user_id || "", booking_id: "" }));
                    setSelectedBookingInfo(null);
                    setBookingSearch("");
                  }}
                />
              </div>
            )}

            {/* Moallem selection */}
            {paymentType === "moallem" && (
              <div>
                <label className="text-xs text-muted-foreground block mb-1">মোয়াল্লেম নির্বাচন *</label>
                <select className={inputClass} value={addForm.moallem_id} onChange={(e) => handleMoallemChange(e.target.value)}>
                  <option value="">-- মোয়াল্লেম বাছাই করুন --</option>
                  {moallems.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}{m.phone ? ` (${m.phone})` : ""} — বকেয়া: {fmt(Number(m.total_due || 0))}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Supplier selection */}
            {paymentType === "supplier" && (
              <div>
                <label className="text-xs text-muted-foreground block mb-1">সাপ্লায়ার এজেন্ট নির্বাচন *</label>
                <select className={inputClass} value={addForm.supplier_id} onChange={(e) => handleSupplierChange(e.target.value)}>
                  <option value="">-- সাপ্লায়ার বাছাই করুন --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.agent_name}{s.company_name ? ` (${s.company_name})` : ""}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Booking selection - searchable, always enabled */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                বুকিং নির্বাচন {paymentType === "customer" ? "*" : "(ঐচ্ছিক)"}
              </label>
              <div className="relative mb-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  className={inputClass + " pl-9 !text-xs"}
                  placeholder="ট্র্যাকিং ID, নাম, ফোন দিয়ে বুকিং খুঁজুন..."
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                />
              </div>
              <select className={inputClass} value={addForm.booking_id} onChange={(e) => handleBookingChange(e.target.value)}>
                <option value="">-- বুকিং বাছাই করুন ({filteredBookings.length}টি) --</option>
                {filteredBookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.tracking_id} — {b.guest_name || "N/A"} ({paymentType === "supplier" ? `সাপ্লায়ার বকেয়া: ${fmt(Number(b.supplier_due || 0))}` : paymentType === "moallem" ? `মোয়াল্লেম বকেয়া: ${fmt(Number(b.moallem_due || 0))}` : `বকেয়া: ${fmt(Number(b.due_amount || 0))}`})
                  </option>
                ))}
              </select>
              {filteredBookings.length === 0 && bookingSearch && (
                <p className="text-xs text-muted-foreground mt-1">কোনো বুকিং পাওয়া যায়নি।</p>
              )}
            </div>

            {selectedBookingInfo && (
              <div className="bg-secondary/50 rounded-lg p-3 grid grid-cols-3 gap-2 text-xs">
                {paymentType === "customer" ? (
                  <>
                    <div><span className="text-muted-foreground block">মোট</span><span className="font-bold">{fmt(Number(selectedBookingInfo.total_amount))}</span></div>
                    <div><span className="text-muted-foreground block">পরিশোধিত</span><span className="font-bold text-emerald">{fmt(Number(selectedBookingInfo.paid_amount))}</span></div>
                    <div><span className="text-muted-foreground block">বকেয়া</span><span className="font-bold text-destructive">{fmt(Number(selectedBookingInfo.due_amount || 0))}</span></div>
                  </>
                ) : paymentType === "moallem" ? (
                  <>
                    <div><span className="text-muted-foreground block">মোট</span><span className="font-bold">{fmt(Number(selectedBookingInfo.total_amount))}</span></div>
                    <div><span className="text-muted-foreground block">মোয়াল্লেম পরিশোধিত</span><span className="font-bold text-emerald">{fmt(Number(selectedBookingInfo.paid_by_moallem || 0))}</span></div>
                    <div><span className="text-muted-foreground block">মোয়াল্লেম বকেয়া</span><span className="font-bold text-destructive">{fmt(Number(selectedBookingInfo.moallem_due || 0))}</span></div>
                  </>
                ) : (
                  <>
                    <div><span className="text-muted-foreground block">মোট খরচ</span><span className="font-bold">{fmt(Number(selectedBookingInfo.total_cost || 0))}</span></div>
                    <div><span className="text-muted-foreground block">সাপ্লায়ার পেইড</span><span className="font-bold text-emerald">{fmt(Number(selectedBookingInfo.paid_to_supplier || 0))}</span></div>
                    <div><span className="text-muted-foreground block">সাপ্লায়ার বকেয়া</span><span className="font-bold text-destructive">{fmt(Number(selectedBookingInfo.supplier_due || 0))}</span></div>
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
              <label className="text-xs text-muted-foreground block mb-1">রিসিট ফাইল (ঐচ্ছিক)</label>
              {receiptFile ? (
                <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-2.5 border border-border">
                  <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-xs truncate flex-1">{receiptFile.name}</span>
                  <button type="button" onClick={() => setReceiptFile(null)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 cursor-pointer w-full border-2 border-dashed border-border rounded-lg p-3 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
                  <Upload className="h-4 w-4" />
                  <span className="text-xs">রিসিট আপলোড করুন (ছবি/PDF, সর্বোচ্চ 5MB)</span>
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && f.size > 5 * 1024 * 1024) { toast.error("ফাইল 5MB এর কম হতে হবে"); return; }
                    if (f) setReceiptFile(f);
                    e.target.value = "";
                  }} />
                </label>
              )}
            </div>
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
          {viewPayment && (() => {
            const vBadge = getTypeBadge(viewPayment._type);
            return (
            <div className="space-y-4 text-sm">
              <div className="mb-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${vBadge.cls}`}>
                  {viewPayment._type === "moallem" ? "মোয়াল্লেম পেমেন্ট" : viewPayment._type === "supplier" ? "সাপ্লায়ার পেমেন্ট" : "কাস্টমার পেমেন্ট"}
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
                  {viewPayment._type === "customer"
                    ? (viewPayment.paid_at ? new Date(viewPayment.paid_at).toLocaleDateString() : viewPayment.due_date ? new Date(viewPayment.due_date).toLocaleDateString() : "—")
                    : (viewPayment.date ? new Date(viewPayment.date).toLocaleDateString() : "—")
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
                    <div><span className="text-muted-foreground text-xs block">পরিশোধিত</span><span className="font-bold text-emerald">{fmt(Number(viewPayment.bookings.paid_amount))}</span></div>
                    <div><span className="text-muted-foreground text-xs block">বকেয়া</span><span className="font-bold text-destructive">{fmt(Number(viewPayment.bookings.due_amount || 0))}</span></div>
                  </div>
                </div>
              )}
              {viewPayment._type === "moallem" && viewPayment.bookings && (
                <div className="border-t border-border/50 pt-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">বুকিং তথ্য</h4>
                  <div className="grid grid-cols-3 gap-3 bg-secondary/50 rounded-lg p-3">
                    <div><span className="text-muted-foreground text-xs block">মোট</span><span className="font-bold">{fmt(Number(viewPayment.bookings.total_amount))}</span></div>
                    <div><span className="text-muted-foreground text-xs block">মোয়াল্লেম পেইড</span><span className="font-bold text-emerald">{fmt(Number(viewPayment.bookings.paid_by_moallem || 0))}</span></div>
                    <div><span className="text-muted-foreground text-xs block">মোয়াল্লেম বকেয়া</span><span className="font-bold text-destructive">{fmt(Number(viewPayment.bookings.moallem_due || 0))}</span></div>
                  </div>
                </div>
              )}
              {viewPayment._type === "supplier" && viewPayment.bookings && (
                <div className="border-t border-border/50 pt-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">বুকিং তথ্য</h4>
                  <div className="grid grid-cols-3 gap-3 bg-secondary/50 rounded-lg p-3">
                    <div><span className="text-muted-foreground text-xs block">মোট খরচ</span><span className="font-bold">{fmt(Number(viewPayment.bookings.total_cost || 0))}</span></div>
                    <div><span className="text-muted-foreground text-xs block">সাপ্লায়ার পেইড</span><span className="font-bold text-emerald">{fmt(Number(viewPayment.bookings.paid_to_supplier || 0))}</span></div>
                    <div><span className="text-muted-foreground text-xs block">সাপ্লায়ার বকেয়া</span><span className="font-bold text-destructive">{fmt(Number(viewPayment.bookings.supplier_due || 0))}</span></div>
                  </div>
                </div>
              )}
              {viewPayment.receipt_file_path && (
                <div className="border-t border-border/50 pt-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">রিসিট ফাইল</h4>
                  <button
                    onClick={async () => {
                      const { data } = await supabase.storage.from("payment-receipts").createSignedUrl(viewPayment.receipt_file_path, 300);
                      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                      else toast.error("ফাইল লোড করা যায়নি");
                    }}
                    className="flex items-center gap-2 text-xs text-primary hover:underline"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    রিসিট দেখুন / ডাউনলোড
                  </button>
                </div>
              )}
              {viewPayment.notes && (
                <div><span className="text-muted-foreground text-xs block">নোট</span><p>{viewPayment.notes}</p></div>
              )}
            </div>
            );
          })()}
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
