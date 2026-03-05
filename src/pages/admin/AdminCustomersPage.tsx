import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Users, Edit2, Save, X, Search, Plus, Trash2, Eye, ChevronLeft, ChevronRight, Pencil, Loader2, FileDown, FileSpreadsheet
} from "lucide-react";
import { exportPDF, exportExcel } from "@/lib/reportExport";
import { useIsViewer } from "@/components/admin/AdminLayout";
import CustomerFinancialReport from "@/components/admin/CustomerFinancialReport";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import AdminActionMenu, { ActionItem } from "@/components/admin/AdminActionMenu";
import { normalizePhone, getPhoneError, handlePhoneChange } from "@/lib/phoneValidation";

const fmt = (n: number) => `৳${Number(n || 0).toLocaleString()}`;
const PAGE_SIZE = 15;

const inputClass =
  "w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

const emptyForm = {
  full_name: "", phone: "", email: "", address: "",
  passport_number: "", nid_number: "", date_of_birth: "",
  emergency_contact: "", notes: "",
};

export default function AdminCustomersPage() {
  const navigate = useNavigate();
  const isViewer = useIsViewer();
  const [customers, setCustomers] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({ ...emptyForm });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Add customer modal
  const [showAddModal, setShowAddModal] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("action") === "add";
  });
  const [addForm, setAddForm] = useState<any>({ ...emptyForm });
  const [addLoading, setAddLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [pRes, bRes, payRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("bookings").select("id, user_id, total_amount, paid_amount, due_amount, num_travelers"),
      supabase.from("payments").select("id, user_id, amount, status").eq("status", "completed"),
    ]);
    setCustomers(pRes.data || []);
    setBookings(bRes.data || []);
    setPayments(payRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Per-customer stats
  const customerStats = useMemo(() => {
    const map: Record<string, { totalAmount: number; totalPaid: number; totalDue: number; bookingCount: number }> = {};
    bookings.forEach(b => {
      if (!b.user_id) return;
      if (!map[b.user_id]) map[b.user_id] = { totalAmount: 0, totalPaid: 0, totalDue: 0, bookingCount: 0 };
      map[b.user_id].totalAmount += Number(b.total_amount || 0);
      map[b.user_id].totalPaid += Number(b.paid_amount || 0);
      map[b.user_id].totalDue += Number(b.due_amount || 0);
      map[b.user_id].bookingCount++;
    });
    return map;
  }, [bookings]);

  // KPI totals
  const totals = useMemo(() => {
    let totalAmount = 0, totalPaid = 0, totalDue = 0;
    Object.values(customerStats).forEach(s => {
      totalAmount += s.totalAmount;
      totalPaid += s.totalPaid;
      totalDue += s.totalDue;
    });
    return { totalAmount, totalPaid, totalDue };
  }, [customerStats]);

  const startEdit = (c: any) => {
    setEditId(c.id);
    setEditForm({
      full_name: c.full_name || "", phone: c.phone || "", email: c.email || "",
      address: c.address || "", passport_number: c.passport_number || "",
      nid_number: c.nid_number || "", date_of_birth: c.date_of_birth || "",
      emergency_contact: c.emergency_contact || "", notes: c.notes || "",
    });
  };

  const saveEdit = async () => {
    if (!editId) return;
    if (editForm.phone?.trim()) {
      const phoneErr = getPhoneError(editForm.phone, false);
      if (phoneErr) { toast.error(phoneErr); return; }
    }
    const normalizedPhone = editForm.phone?.trim() ? normalizePhone(editForm.phone) : null;
    const { error } = await supabase.from("profiles").update({
      full_name: editForm.full_name || null, phone: normalizedPhone,
      email: editForm.email || null, address: editForm.address || null,
      passport_number: editForm.passport_number || null, nid_number: editForm.nid_number || null,
      date_of_birth: editForm.date_of_birth || null, emergency_contact: editForm.emergency_contact || null,
      notes: editForm.notes || null,
    }).eq("id", editId);
    if (error) { toast.error(error.message); return; }
    toast.success("কাস্টমার আপডেট হয়েছে");
    setEditId(null); setEditForm({ ...emptyForm }); fetchData();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("profiles").delete().eq("id", deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success("কাস্টমার মুছে ফেলা হয়েছে");
    setDeleteId(null); fetchData();
  };

  const handleAddCustomer = async () => {
    if (!addForm.full_name.trim()) { toast.error("Name is required."); return; }
    if (!addForm.phone.trim()) { toast.error("Phone number is required."); return; }
    const phoneErr = getPhoneError(addForm.phone, true);
    if (phoneErr) { toast.error(phoneErr); return; }
    setAddLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Not authenticated"); return; }
      const cleanPhone = addForm.phone.trim().replace(/[^\d+]/g, "");
      const { data: existing } = await supabase.from("profiles").select("id").eq("phone", cleanPhone).maybeSingle();
      if (existing) { toast.error("এই ফোন নম্বরে কাস্টমার আছে"); setAddLoading(false); return; }
      const newUserId = crypto.randomUUID();
      const { error } = await supabase.from("profiles").insert({
        user_id: newUserId, full_name: addForm.full_name.trim(), phone: cleanPhone,
        email: addForm.email.trim() || null, address: addForm.address.trim() || null,
        passport_number: addForm.passport_number.trim() || null, nid_number: addForm.nid_number.trim() || null,
        date_of_birth: addForm.date_of_birth || null, emergency_contact: addForm.emergency_contact.trim() || null,
        notes: addForm.notes.trim() || null,
      });
      if (error) throw error;
      toast.success("কাস্টমার যোগ হয়েছে");
      setShowAddModal(false); setAddForm({ ...emptyForm }); fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally { setAddLoading(false); }
  };

  const filtered = customers.filter(c => {
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search]);

  const getActions = (c: any): ActionItem[] => [
    { label: "দেখুন", icon: <Eye className="h-3.5 w-3.5" />, onClick: () => setSelectedCustomer(c) },
    { label: "সম্পাদনা", icon: <Pencil className="h-3.5 w-3.5" />, onClick: () => startEdit(c), variant: "warning", hidden: isViewer },
    { label: "মুছুন", icon: <Trash2 className="h-3.5 w-3.5" />, onClick: () => setDeleteId(c.id), variant: "destructive", hidden: isViewer, separator: true },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> কাস্টমার ব্যবস্থাপনা
          </h1>
          <p className="text-muted-foreground text-sm">মোট {customers.length} জন কাস্টমার</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportPDF({ title: "Customers Report", columns: ["Name", "Phone", "Passport", "Total Amount", "Total Paid", "Total Due"], rows: filtered.map(c => { const s = customerStats[c.user_id] || { totalAmount: 0, totalPaid: 0, totalDue: 0 }; return [c.full_name || "—", c.phone || "—", c.passport_number || "—", s.totalAmount, s.totalPaid, s.totalDue]; }) })}><FileDown className="h-4 w-4 mr-1" />PDF</Button>
          <Button variant="outline" size="sm" onClick={() => exportExcel({ title: "Customers Report", columns: ["Name", "Phone", "Passport", "Total Amount", "Total Paid", "Total Due"], rows: filtered.map(c => { const s = customerStats[c.user_id] || { totalAmount: 0, totalPaid: 0, totalDue: 0 }; return [c.full_name || "—", c.phone || "—", c.passport_number || "—", s.totalAmount, s.totalPaid, s.totalDue]; }) })}><FileSpreadsheet className="h-4 w-4 mr-1" />Excel</Button>
          {!isViewer && (
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-1" /> নতুন কাস্টমার
            </Button>
          )}
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">মোট কাস্টমার</p>
          <p className="text-lg font-bold text-foreground">{customers.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">মোট টাকা</p>
          <p className="text-lg font-bold text-foreground">{fmt(totals.totalAmount)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">মোট প্রাপ্ত</p>
          <p className="text-lg font-bold text-emerald-600">{fmt(totals.totalPaid)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">মোট বকেয়া</p>
          <p className="text-lg font-bold text-destructive">{fmt(totals.totalDue)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="নাম, ফোন, পাসপোর্ট দিয়ে খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">কোনো কাস্টমার পাওয়া যায়নি</p>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-12 text-center">SL</TableHead>
                  <TableHead>নাম</TableHead>
                  <TableHead>ফোন</TableHead>
                  <TableHead>পাসপোর্ট</TableHead>
                  <TableHead className="text-right">মোট টাকা</TableHead>
                  <TableHead className="text-right">মোট প্রাপ্ত</TableHead>
                  <TableHead className="text-right">মোট বকেয়া</TableHead>
                  <TableHead className="text-center">স্ট্যাটাস</TableHead>
                  <TableHead className="text-center w-24">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((c, i) => {
                  const stats = customerStats[c.user_id] || { totalAmount: 0, totalPaid: 0, totalDue: 0, bookingCount: 0 };
                  return (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setSelectedCustomer(c)}>
                      <TableCell className="text-center text-muted-foreground text-xs">{(page - 1) * PAGE_SIZE + i + 1}</TableCell>
                      <TableCell className="font-medium">{c.full_name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{c.phone || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{c.passport_number || "—"}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(stats.totalAmount)}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">{fmt(stats.totalPaid)}</TableCell>
                      <TableCell className="text-right font-medium text-destructive">{fmt(stats.totalDue)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={stats.totalDue > 0 ? "destructive" : "default"} className="text-[10px]">
                          {stats.totalDue > 0 ? "বকেয়া" : "ক্লিয়ার"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                        <AdminActionMenu actions={getActions(c)} inlineCount={1} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                দেখাচ্ছে {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} / {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground px-2">{page} / {totalPages}</span>
                <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Financial Report Dialog */}
      <CustomerFinancialReport
        customer={selectedCustomer}
        open={!!selectedCustomer}
        onOpenChange={(open) => { if (!open) setSelectedCustomer(null); }}
      />

      {/* Edit Customer Dialog */}
      <Dialog open={!!editId} onOpenChange={o => { if (!o) { setEditId(null); setEditForm({ ...emptyForm }); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>কাস্টমার সম্পাদনা</DialogTitle>
            <DialogDescription>কাস্টমারের তথ্য আপডেট করুন</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground block mb-1">নাম *</label>
                <input className={inputClass} value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">ফোন</label>
                <input className={inputClass} value={editForm.phone} onChange={e => handlePhoneChange(e.target.value, v => setEditForm({ ...editForm, phone: v }))} placeholder="01XXXXXXXXX" maxLength={15} />
                {editForm.phone?.trim() && getPhoneError(editForm.phone) && <p className="text-xs text-destructive mt-1">{getPhoneError(editForm.phone)}</p>}</div>
              <div><label className="text-xs text-muted-foreground block mb-1">ইমেইল</label>
                <input className={inputClass} type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">পাসপোর্ট নম্বর</label>
                <input className={inputClass} value={editForm.passport_number} onChange={e => setEditForm({ ...editForm, passport_number: e.target.value })} /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">NID নম্বর</label>
                <input className={inputClass} value={editForm.nid_number} onChange={e => setEditForm({ ...editForm, nid_number: e.target.value })} /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">জন্ম তারিখ</label>
                <input className={inputClass} type="date" value={editForm.date_of_birth} onChange={e => setEditForm({ ...editForm, date_of_birth: e.target.value })} /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">জরুরি যোগাযোগ</label>
                <input className={inputClass} value={editForm.emergency_contact} onChange={e => setEditForm({ ...editForm, emergency_contact: e.target.value })} /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">ঠিকানা</label>
                <input className={inputClass} value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} /></div>
            </div>
            <div><label className="text-xs text-muted-foreground block mb-1">নোট</label>
              <textarea className={inputClass + " resize-none"} rows={2} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditId(null); setEditForm({ ...emptyForm }); }}>বাতিল</Button>
            <Button onClick={saveEdit}>আপডেট</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Customer Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>নতুন কাস্টমার যোগ করুন</DialogTitle>
            <DialogDescription>কাস্টমারের তথ্য পূরণ করুন</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground block mb-1">নাম *</label>
                <input className={inputClass} value={addForm.full_name} onChange={e => setAddForm({ ...addForm, full_name: e.target.value })} placeholder="পূর্ণ নাম" /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">ফোন *</label>
                <input className={inputClass} value={addForm.phone} onChange={e => handlePhoneChange(e.target.value, v => setAddForm({ ...addForm, phone: v }))} placeholder="01XXXXXXXXX" maxLength={15} />
                {addForm.phone?.trim() && getPhoneError(addForm.phone) && <p className="text-xs text-destructive mt-1">{getPhoneError(addForm.phone)}</p>}</div>
              <div><label className="text-xs text-muted-foreground block mb-1">ইমেইল</label>
                <input className={inputClass} type="email" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} placeholder="email@example.com" /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">পাসপোর্ট নম্বর</label>
                <input className={inputClass} value={addForm.passport_number} onChange={e => setAddForm({ ...addForm, passport_number: e.target.value })} /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">NID নম্বর</label>
                <input className={inputClass} value={addForm.nid_number} onChange={e => setAddForm({ ...addForm, nid_number: e.target.value })} /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">জন্ম তারিখ</label>
                <input className={inputClass} type="date" value={addForm.date_of_birth} onChange={e => setAddForm({ ...addForm, date_of_birth: e.target.value })} /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">জরুরি যোগাযোগ</label>
                <input className={inputClass} value={addForm.emergency_contact} onChange={e => setAddForm({ ...addForm, emergency_contact: e.target.value })} /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">ঠিকানা</label>
                <input className={inputClass} value={addForm.address} onChange={e => setAddForm({ ...addForm, address: e.target.value })} /></div>
            </div>
            <div><label className="text-xs text-muted-foreground block mb-1">নোট</label>
              <textarea className={inputClass + " resize-none"} rows={2} value={addForm.notes} onChange={e => setAddForm({ ...addForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>বাতিল</Button>
            <Button onClick={handleAddCustomer} disabled={addLoading}>
              {addLoading ? "যোগ হচ্ছে..." : "কাস্টমার যোগ করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={o => { if (!o) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>কাস্টমার মুছবেন?</DialogTitle>
            <DialogDescription>এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>বাতিল</Button>
            <Button variant="destructive" onClick={confirmDelete}>মুছুন</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
