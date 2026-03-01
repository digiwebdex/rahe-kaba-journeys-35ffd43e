import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Users, Edit2, Save, X, Search, Plus, Trash2, Upload, FileText, Eye,
  Phone, Mail, MapPin, CreditCard, Package, ChevronDown, ChevronUp, Loader2, Check
} from "lucide-react";
import { useIsViewer } from "@/components/admin/AdminLayout";
import CustomerFinancialReport from "@/components/admin/CustomerFinancialReport";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const inputClass =
  "w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

const fmt = (n: number) => `৳${Number(n || 0).toLocaleString()}`;

const emptyForm = {
  full_name: "", phone: "", email: "", address: "",
  passport_number: "", nid_number: "", date_of_birth: "",
  emergency_contact: "", notes: "",
};

export default function AdminCustomersPage() {
  const isViewer = useIsViewer();
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({ ...emptyForm });
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<{ bookings: any[]; payments: any[]; documents: any[]; expenses: any[] }>({ bookings: [], payments: [], documents: [], expenses: [] });
  const [expandLoading, setExpandLoading] = useState(false);

  // Add customer modal
  const [showAddModal, setShowAddModal] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("action") === "add";
  });
  const [addForm, setAddForm] = useState<any>({ ...emptyForm });
  const [addLoading, setAddLoading] = useState(false);

  // Document upload
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadCustomer, setActiveUploadCustomer] = useState<any>(null);
  const [activeDocType, setActiveDocType] = useState("");

  const fetchCustomers = () =>
    supabase.from("profiles").select("*").order("created_at", { ascending: false })
      .then(({ data }) => setCustomers(data || []));

  useEffect(() => { fetchCustomers(); }, []);

  // Expand customer details
  const toggleExpand = async (customer: any) => {
    if (expandedId === customer.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(customer.id);
    setExpandLoading(true);
    const [bRes, pRes, dRes, eRes] = await Promise.all([
      supabase.from("bookings").select("*, packages(name, type, price)").eq("user_id", customer.user_id).order("created_at", { ascending: false }),
      supabase.from("payments").select("*, bookings(tracking_id)").eq("user_id", customer.user_id).order("created_at", { ascending: false }),
      supabase.from("booking_documents").select("*").eq("user_id", customer.user_id).order("created_at", { ascending: false }),
      supabase.from("expenses").select("*").eq("customer_id", customer.user_id).order("date", { ascending: false }),
    ]);
    setExpandedData({
      bookings: bRes.data || [], payments: pRes.data || [],
      documents: dRes.data || [], expenses: eRes.data || [],
    });
    setExpandLoading(false);
  };

  const startEdit = (c: any) => {
    setEditingId(c.id);
    setEditForm({
      full_name: c.full_name || "",
      phone: c.phone || "",
      email: c.email || "",
      address: c.address || "",
      passport_number: c.passport_number || "",
      nid_number: c.nid_number || "",
      date_of_birth: c.date_of_birth || "",
      emergency_contact: c.emergency_contact || "",
      notes: c.notes || "",
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase.from("profiles").update({
      full_name: editForm.full_name || null,
      phone: editForm.phone || null,
      email: editForm.email || null,
      address: editForm.address || null,
      passport_number: editForm.passport_number || null,
      nid_number: editForm.nid_number || null,
      date_of_birth: editForm.date_of_birth || null,
      emergency_contact: editForm.emergency_contact || null,
      notes: editForm.notes || null,
    }).eq("id", editingId);
    if (error) { toast.error(error.message); return; }
    toast.success("কাস্টমার আপডেট হয়েছে");
    setEditingId(null);
    fetchCustomers();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("profiles").delete().eq("id", deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success("কাস্টমার মুছে ফেলা হয়েছে");
    setDeleteId(null);
    fetchCustomers();
  };

  const handleAddCustomer = async () => {
    if (!addForm.full_name.trim()) { toast.error("নাম আবশ্যক"); return; }
    if (!addForm.phone.trim()) { toast.error("ফোন নম্বর আবশ্যক"); return; }
    setAddLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Not authenticated"); return; }

      // Check if phone already exists
      const cleanPhone = addForm.phone.trim().replace(/[^\d+]/g, "");
      const { data: existing } = await supabase.from("profiles").select("id").eq("phone", cleanPhone).maybeSingle();
      if (existing) { toast.error("এই ফোন নম্বরে কাস্টমার আছে"); setAddLoading(false); return; }

      const { error } = await supabase.from("profiles").insert({
        user_id: session.user.id, // admin's id as fallback
        full_name: addForm.full_name.trim(),
        phone: cleanPhone,
        email: addForm.email.trim() || null,
        address: addForm.address.trim() || null,
        passport_number: addForm.passport_number.trim() || null,
        nid_number: addForm.nid_number.trim() || null,
        date_of_birth: addForm.date_of_birth || null,
        emergency_contact: addForm.emergency_contact.trim() || null,
        notes: addForm.notes.trim() || null,
      });
      if (error) throw error;
      toast.success("কাস্টমার যোগ হয়েছে");
      setShowAddModal(false);
      setAddForm({ ...emptyForm });
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  // Document upload for a customer
  const triggerDocUpload = (customer: any, docType: string) => {
    setActiveUploadCustomer(customer);
    setActiveDocType(docType);
    setTimeout(() => fileInputRef.current?.click(), 50);
  };

  const handleDocUpload = async (file: File) => {
    if (!file || !activeUploadCustomer) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("ফাইল ৫MB এর কম হতে হবে"); return; }
    setUploadingDoc(activeDocType);
    const ext = file.name.split(".").pop();
    const filePath = `${activeUploadCustomer.user_id}/general/${activeDocType}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("booking-documents").upload(filePath, file);
    if (uploadError) { toast.error(uploadError.message); setUploadingDoc(null); return; }

    // We need a booking_id — use the first booking or create a placeholder
    let bookingId = expandedData.bookings[0]?.id;
    if (!bookingId) {
      toast.error("ডকুমেন্ট আপলোডের জন্য অন্তত একটি বুকিং প্রয়োজন");
      setUploadingDoc(null);
      return;
    }

    const { error: dbError } = await supabase.from("booking_documents").insert({
      booking_id: bookingId,
      user_id: activeUploadCustomer.user_id,
      document_type: activeDocType,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
    });
    if (dbError) { toast.error(dbError.message); }
    else {
      toast.success("ডকুমেন্ট আপলোড হয়েছে");
      toggleExpand(activeUploadCustomer);
    }
    setUploadingDoc(null);
  };

  const handleViewDoc = async (doc: any) => {
    const { data } = await supabase.storage.from("booking-documents").createSignedUrl(doc.file_path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast.error("URL তৈরি করা যায়নি");
  };

  const handleDeleteDoc = async (doc: any, customer: any) => {
    await supabase.storage.from("booking-documents").remove([doc.file_path]);
    await supabase.from("booking_documents").delete().eq("id", doc.id);
    toast.success("ডকুমেন্ট মুছে ফেলা হয়েছে");
    toggleExpand(customer);
  };

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.full_name?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.passport_number?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.nid_number?.toLowerCase().includes(q)
    );
  });

  const DOC_TYPES = [
    { key: "passport_copy", label: "পাসপোর্ট কপি" },
    { key: "nid_copy", label: "NID কপি" },
    { key: "photo", label: "ছবি" },
    { key: "visa_copy", label: "ভিসা কপি" },
    { key: "ticket", label: "টিকেট" },
    { key: "other", label: "অন্যান্য" },
  ];

  return (
    <div>
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDocUpload(f); e.target.value = ""; }} />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h2 className="font-heading text-xl font-bold">কাস্টমার ব্যবস্থাপনা</h2>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {!isViewer && (
            <button onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 text-sm bg-gradient-gold text-primary-foreground font-semibold px-4 py-2 rounded-md hover:opacity-90 transition-opacity shadow-gold whitespace-nowrap">
              <Plus className="h-4 w-4" /> নতুন কাস্টমার
            </button>
          )}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input className={inputClass + " pl-9"} placeholder="নাম, ফোন, পাসপোর্ট দিয়ে খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((c) => (
          <div key={c.id} className="bg-card border border-border rounded-lg p-4">
            {editingId === c.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">নাম *</label>
                    <input className={inputClass} value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} maxLength={100} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">ফোন *</label>
                    <input className={inputClass} value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} maxLength={15} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">ইমেইল</label>
                    <input className={inputClass} type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} maxLength={255} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">পাসপোর্ট নম্বর</label>
                    <input className={inputClass} value={editForm.passport_number} onChange={(e) => setEditForm({ ...editForm, passport_number: e.target.value })} maxLength={20} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">NID নম্বর</label>
                    <input className={inputClass} value={editForm.nid_number} onChange={(e) => setEditForm({ ...editForm, nid_number: e.target.value })} maxLength={20} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">জন্ম তারিখ</label>
                    <input className={inputClass} type="date" value={editForm.date_of_birth} onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">জরুরি যোগাযোগ</label>
                    <input className={inputClass} value={editForm.emergency_contact} onChange={(e) => setEditForm({ ...editForm, emergency_contact: e.target.value })} maxLength={100} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-muted-foreground block mb-1">ঠিকানা</label>
                    <input className={inputClass} value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} maxLength={300} />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="text-xs text-muted-foreground block mb-1">নোট</label>
                    <textarea className={inputClass + " resize-none"} rows={2} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} maxLength={500} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md flex items-center gap-1"><Save className="h-3 w-3" /> সংরক্ষণ</button>
                  <button onClick={() => setEditingId(null)} className="text-xs bg-secondary px-3 py-1.5 rounded-md flex items-center gap-1"><X className="h-3 w-3" /> বাতিল</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 cursor-pointer min-w-0" onClick={() => setSelectedCustomer(c)}>
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{c.full_name || "No name"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.phone || "No phone"}
                        {c.passport_number ? ` • পাসপোর্ট: ${c.passport_number}` : ""}
                        {c.nid_number ? ` • NID: ${c.nid_number}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => toggleExpand(c)} className="text-muted-foreground hover:text-foreground p-1">
                      {expandedId === c.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {!isViewer && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); startEdit(c); }} className="text-muted-foreground hover:text-foreground p-1">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); }} className="text-muted-foreground hover:text-destructive p-1">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded Panel */}
                {expandedId === c.id && (
                  <div className="mt-4 pt-4 border-t border-border/50 space-y-5">
                    {expandLoading ? (
                      <p className="text-xs text-muted-foreground text-center py-4">লোড হচ্ছে...</p>
                    ) : (
                      <>
                        {/* Customer Details */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div><span className="text-muted-foreground block">ইমেইল</span><span className="font-medium">{c.email || "—"}</span></div>
                          <div><span className="text-muted-foreground block">ঠিকানা</span><span className="font-medium">{c.address || "—"}</span></div>
                          <div><span className="text-muted-foreground block">জন্ম তারিখ</span><span className="font-medium">{c.date_of_birth ? new Date(c.date_of_birth).toLocaleDateString() : "—"}</span></div>
                          <div><span className="text-muted-foreground block">জরুরি যোগাযোগ</span><span className="font-medium">{c.emergency_contact || "—"}</span></div>
                          {c.notes && (
                            <div className="col-span-full"><span className="text-muted-foreground block">নোট</span><span className="font-medium">{c.notes}</span></div>
                          )}
                        </div>

                        {/* Financial Summary Cards */}
                        {(() => {
                          const totalPaid = expandedData.payments.filter((p: any) => p.status === "completed").reduce((s: number, p: any) => s + Number(p.amount), 0);
                          const totalDue = expandedData.bookings.reduce((s: number, b: any) => s + Number(b.due_amount || 0), 0);
                          const totalExpenses = expandedData.expenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
                          const netProfit = totalPaid - totalExpenses;
                          const totalBookingAmount = expandedData.bookings.reduce((s: number, b: any) => s + Number(b.total_amount), 0);
                          return (
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                              <div className="bg-secondary/50 rounded-lg p-3 text-center">
                                <p className="text-[10px] text-muted-foreground uppercase">মোট বুকিং</p>
                                <p className="text-sm font-heading font-bold text-foreground">{fmt(totalBookingAmount)}</p>
                                <p className="text-[10px] text-muted-foreground">{expandedData.bookings.length} টি</p>
                              </div>
                              <div className="bg-emerald/5 border border-emerald/20 rounded-lg p-3 text-center">
                                <p className="text-[10px] text-muted-foreground uppercase">পরিশোধিত</p>
                                <p className="text-sm font-heading font-bold text-emerald">{fmt(totalPaid)}</p>
                              </div>
                              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 text-center">
                                <p className="text-[10px] text-muted-foreground uppercase">বকেয়া</p>
                                <p className="text-sm font-heading font-bold text-destructive">{fmt(totalDue)}</p>
                              </div>
                              <div className="bg-secondary/50 rounded-lg p-3 text-center">
                                <p className="text-[10px] text-muted-foreground uppercase">খরচ</p>
                                <p className="text-sm font-heading font-bold text-foreground">{fmt(totalExpenses)}</p>
                              </div>
                              <div className={`rounded-lg p-3 text-center ${netProfit >= 0 ? "bg-emerald/5 border border-emerald/20" : "bg-destructive/5 border border-destructive/20"}`}>
                                <p className="text-[10px] text-muted-foreground uppercase">নীট মুনাফা</p>
                                <p className={`text-sm font-heading font-bold ${netProfit >= 0 ? "text-emerald" : "text-destructive"}`}>{fmt(netProfit)}</p>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Bookings */}
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                            <Package className="h-3 w-3" /> বুকিং ({expandedData.bookings.length})
                          </h4>
                          {expandedData.bookings.length > 0 ? (
                            <div className="space-y-1.5">
                              {expandedData.bookings.map((b: any) => (
                                <div key={b.id} className="flex items-center justify-between bg-secondary/30 rounded px-3 py-2">
                                  <div className="min-w-0">
                                    <p className="text-xs font-mono font-bold text-primary">{b.tracking_id}</p>
                                    <p className="text-xs text-muted-foreground truncate">{b.packages?.name || "—"}</p>
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0">
                                    <div className="text-right">
                                      <p className="text-xs font-medium">{fmt(Number(b.total_amount))}</p>
                                      <p className="text-[10px] text-muted-foreground">
                                        পরিশোধ: <span className="text-emerald">{fmt(Number(b.paid_amount || 0))}</span>
                                        {" • "}বকেয়া: <span className="text-destructive">{fmt(Number(b.due_amount || 0))}</span>
                                      </p>
                                    </div>
                                    <Badge variant={b.status === "completed" ? "default" : "secondary"} className="text-[10px]">{b.status}</Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">কোনো বুকিং নেই</p>
                          )}
                        </div>

                        {/* Payments */}
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                            <CreditCard className="h-3 w-3" /> পেমেন্ট ({expandedData.payments.length})
                          </h4>
                          {expandedData.payments.length > 0 ? (
                            <div className="space-y-1">
                              {expandedData.payments.map((p: any) => (
                                <div key={p.id} className="flex items-center justify-between bg-secondary/30 rounded px-3 py-1.5">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Badge variant={p.status === "completed" ? "default" : "secondary"} className="text-[10px]">{p.status}</Badge>
                                    <span className="text-xs truncate">{p.bookings?.tracking_id || "—"} • #{p.installment_number || "—"}</span>
                                    {p.payment_method && <span className="text-[10px] text-muted-foreground capitalize">{p.payment_method}</span>}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className={`text-xs font-bold ${p.status === "completed" ? "text-emerald" : "text-muted-foreground"}`}>{fmt(Number(p.amount))}</span>
                                    {p.paid_at && <span className="text-[10px] text-muted-foreground">{new Date(p.paid_at).toLocaleDateString()}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">কোনো পেমেন্ট নেই</p>
                          )}
                        </div>

                        {/* Expenses */}
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                            <Mail className="h-3 w-3" /> অ্যাসাইনড খরচ ({expandedData.expenses.length})
                          </h4>
                          {expandedData.expenses.length > 0 ? (
                            <div className="space-y-1">
                              {expandedData.expenses.map((e: any) => (
                                <div key={e.id} className="flex items-center justify-between bg-secondary/30 rounded px-3 py-1.5">
                                  <div className="min-w-0">
                                    <span className="text-xs font-medium">{e.title}</span>
                                    <span className="text-[10px] text-muted-foreground ml-2 capitalize">{e.expense_type}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs font-bold text-foreground">{fmt(Number(e.amount))}</span>
                                    <span className="text-[10px] text-muted-foreground">{new Date(e.date).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">কোনো খরচ অ্যাসাইন করা হয়নি</p>
                          )}
                        </div>

                        {/* Documents */}
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                            <FileText className="h-3 w-3" /> ডকুমেন্ট ({expandedData.documents.length})
                          </h4>
                          {expandedData.documents.length > 0 && (
                            <div className="space-y-1">
                              {expandedData.documents.map((d: any) => (
                                <div key={d.id} className="flex items-center justify-between bg-secondary/30 rounded px-3 py-1.5">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                                    <span className="text-xs truncate">{d.file_name}</span>
                                    <Badge variant="outline" className="text-[10px]">{d.document_type}</Badge>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button onClick={() => handleViewDoc(d)} className="text-primary hover:underline text-xs flex items-center gap-1">
                                      <Eye className="h-3 w-3" /> দেখুন
                                    </button>
                                    {!isViewer && (
                                      <button onClick={() => handleDeleteDoc(d, c)} className="text-destructive hover:underline text-xs flex items-center gap-1">
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {!isViewer && expandedData.bookings.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {DOC_TYPES.map((dt) => (
                                <button key={dt.key} onClick={() => triggerDocUpload(c, dt.key)} disabled={uploadingDoc === dt.key}
                                  className="text-[10px] border border-border rounded px-2 py-1 hover:bg-secondary transition-colors flex items-center gap-1 disabled:opacity-50">
                                  {uploadingDoc === dt.key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                                  {dt.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Financial Summary Button */}
                        <button onClick={() => setSelectedCustomer(c)}
                          className="w-full text-xs text-primary hover:underline font-medium py-2 flex items-center justify-center gap-1">
                          <CreditCard className="h-3.5 w-3.5" /> সম্পূর্ণ আর্থিক রিপোর্ট দেখুন
                        </button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">কোনো কাস্টমার পাওয়া যায়নি।</p>}
      </div>

      {/* Financial Report Dialog */}
      <CustomerFinancialReport
        customer={selectedCustomer}
        open={!!selectedCustomer}
        onOpenChange={(open) => { if (!open) setSelectedCustomer(null); }}
      />

      {/* Add Customer Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">নতুন কাস্টমার যোগ করুন</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">নাম *</label>
                <input className={inputClass} value={addForm.full_name} onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })} placeholder="পূর্ণ নাম" maxLength={100} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">ফোন *</label>
                <input className={inputClass} value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} placeholder="+8801XXXXXXXXX" maxLength={15} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">ইমেইল</label>
                <input className={inputClass} type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} placeholder="email@example.com" maxLength={255} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">পাসপোর্ট নম্বর</label>
                <input className={inputClass} value={addForm.passport_number} onChange={(e) => setAddForm({ ...addForm, passport_number: e.target.value })} maxLength={20} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">NID নম্বর</label>
                <input className={inputClass} value={addForm.nid_number} onChange={(e) => setAddForm({ ...addForm, nid_number: e.target.value })} maxLength={20} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">জন্ম তারিখ</label>
                <input className={inputClass} type="date" value={addForm.date_of_birth} onChange={(e) => setAddForm({ ...addForm, date_of_birth: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">জরুরি যোগাযোগ</label>
                <input className={inputClass} value={addForm.emergency_contact} onChange={(e) => setAddForm({ ...addForm, emergency_contact: e.target.value })} placeholder="নাম ও নম্বর" maxLength={100} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">ঠিকানা</label>
                <input className={inputClass} value={addForm.address} onChange={(e) => setAddForm({ ...addForm, address: e.target.value })} placeholder="পূর্ণ ঠিকানা" maxLength={300} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">নোট</label>
              <textarea className={inputClass + " resize-none"} rows={2} value={addForm.notes} onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })} placeholder="অতিরিক্ত তথ্য..." maxLength={500} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowAddModal(false)} className="text-sm px-4 py-2 rounded-md bg-secondary">বাতিল</button>
              <button onClick={handleAddCustomer} disabled={addLoading}
                className="text-sm px-4 py-2 rounded-md bg-gradient-gold text-primary-foreground font-semibold hover:opacity-90 transition-opacity shadow-gold disabled:opacity-50 flex items-center gap-2">
                <Save className="h-4 w-4" />
                {addLoading ? "যোগ হচ্ছে..." : "কাস্টমার যোগ করুন"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setDeleteId(null)}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading font-bold text-lg mb-2">কাস্টমার মুছবেন?</h3>
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
