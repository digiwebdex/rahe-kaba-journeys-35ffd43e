import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsViewer } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import AdminActionMenu, { ActionItem } from "@/components/admin/AdminActionMenu";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Eye, Search, Truck, ChevronLeft, ChevronRight, FileDown, FileSpreadsheet } from "lucide-react";
import { exportPDF, exportExcel } from "@/lib/reportExport";
import { normalizePhone, getPhoneError, handlePhoneChange } from "@/lib/phoneValidation";

const fmt = (n: number) => `৳${n.toLocaleString()}`;
const PAGE_SIZE = 15;

interface SupplierAgent {
  id: string; agent_name: string; company_name: string | null; phone: string | null;
  address: string | null; notes: string | null; status: string;
  created_at: string; updated_at: string;
}

const emptyForm = { agent_name: "", company_name: "", phone: "", address: "", notes: "", status: "active" };

export default function AdminSupplierAgentsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isViewer = useIsViewer();
  const [agents, setAgents] = useState<SupplierAgent[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    const [a, b] = await Promise.all([
      supabase.from("supplier_agents").select("*").order("created_at", { ascending: false }),
      supabase.from("bookings").select("id, supplier_agent_id, num_travelers, total_cost, paid_to_supplier, supplier_due"),
    ]);
    if (a.data) setAgents(a.data as SupplierAgent[]);
    if (b.data) setBookings(b.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const supplierStats = useMemo(() => {
    const map: Record<string, { bookingCount: number; totalCost: number; totalPaid: number; totalDue: number }> = {};
    bookings.filter(b => b.supplier_agent_id).forEach(b => {
      if (!map[b.supplier_agent_id]) map[b.supplier_agent_id] = { bookingCount: 0, totalCost: 0, totalPaid: 0, totalDue: 0 };
      map[b.supplier_agent_id].bookingCount += 1;
      map[b.supplier_agent_id].totalCost += Number(b.total_cost || 0);
      map[b.supplier_agent_id].totalPaid += Number(b.paid_to_supplier || 0);
      map[b.supplier_agent_id].totalDue += Number(b.supplier_due || 0);
    });
    return map;
  }, [bookings]);

  const handleSave = async () => {
    if (!form.agent_name.trim()) { toast({ title: "Agent name is required.", variant: "destructive" }); return; }
    if (form.phone.trim()) {
      const phoneErr = getPhoneError(form.phone);
      if (phoneErr) { toast({ title: phoneErr, variant: "destructive" }); return; }
    }
    const payload = {
      agent_name: form.agent_name.trim(), company_name: form.company_name.trim() || null,
      phone: form.phone.trim() ? normalizePhone(form.phone) : null, address: form.address.trim() || null,
      notes: form.notes.trim() || null, status: form.status,
    };
    if (editId) {
      const { error } = await supabase.from("supplier_agents").update(payload).eq("id", editId);
      if (error) { toast({ title: "আপডেট ব্যর্থ", description: error.message, variant: "destructive" }); return; }
      toast({ title: "সাপ্লায়ার এজেন্ট আপডেট হয়েছে" });
    } else {
      const { error } = await supabase.from("supplier_agents").insert(payload);
      if (error) { toast({ title: "তৈরি ব্যর্থ", description: error.message, variant: "destructive" }); return; }
      toast({ title: "সাপ্লায়ার এজেন্ট তৈরি হয়েছে" });
    }
    setShowForm(false); setEditId(null); setForm(emptyForm); fetchData();
  };

  const startEdit = (a: SupplierAgent) => {
    setForm({ agent_name: a.agent_name, company_name: a.company_name || "", phone: a.phone || "", address: a.address || "", notes: a.notes || "", status: a.status });
    setEditId(a.id); setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("supplier_agents").delete().eq("id", deleteId);
    if (error) { toast({ title: "মুছতে ব্যর্থ", description: error.message, variant: "destructive" }); return; }
    toast({ title: "সাপ্লায়ার এজেন্ট মুছে ফেলা হয়েছে" }); setDeleteId(null); fetchData();
  };

  const filtered = agents.filter(a => {
    const q = search.toLowerCase();
    return a.agent_name.toLowerCase().includes(q) || (a.company_name || "").toLowerCase().includes(q) || (a.phone || "").includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search]);

  const getActions = (a: SupplierAgent): ActionItem[] => [
    { label: "দেখুন", icon: <Eye className="h-3.5 w-3.5" />, onClick: () => navigate(`/admin/supplier-agents/${a.id}`) },
    { label: "সম্পাদনা", icon: <Pencil className="h-3.5 w-3.5" />, onClick: () => startEdit(a), variant: "warning", hidden: isViewer },
    { label: "মুছুন", icon: <Trash2 className="h-3.5 w-3.5" />, onClick: () => setDeleteId(a.id), variant: "destructive", hidden: isViewer, separator: true },
  ];

  const totals = useMemo(() => {
    let bookingCount = 0, totalCost = 0, totalPaid = 0, totalDue = 0;
    Object.values(supplierStats).forEach(s => { bookingCount += s.bookingCount; totalCost += s.totalCost; totalPaid += s.totalPaid; totalDue += s.totalDue; });
    return { bookingCount, totalCost, totalPaid, totalDue };
  }, [supplierStats]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" /> সাপ্লায়ার এজেন্ট
          </h1>
          <p className="text-muted-foreground text-sm">মোট {agents.length} জন সাপ্লায়ার</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportPDF({ title: "Supplier Agents Report", columns: ["Name", "Company", "Phone", "Bookings", "Total Cost", "Paid", "Due"], rows: filtered.map(a => { const s = supplierStats[a.id] || { bookingCount: 0, totalCost: 0, totalPaid: 0, totalDue: 0 }; return [a.agent_name, a.company_name || "—", a.phone || "—", s.bookingCount, s.totalCost, s.totalPaid, s.totalDue]; }) })}><FileDown className="h-4 w-4 mr-1" />PDF</Button>
          <Button variant="outline" size="sm" onClick={() => exportExcel({ title: "Supplier Agents Report", columns: ["Name", "Company", "Phone", "Bookings", "Total Cost", "Paid", "Due"], rows: filtered.map(a => { const s = supplierStats[a.id] || { bookingCount: 0, totalCost: 0, totalPaid: 0, totalDue: 0 }; return [a.agent_name, a.company_name || "—", a.phone || "—", s.bookingCount, s.totalCost, s.totalPaid, s.totalDue]; }) })}><FileSpreadsheet className="h-4 w-4 mr-1" />Excel</Button>
          {!isViewer && (
            <Button onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-1" /> নতুন এজেন্ট
            </Button>
          )}
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">মোট এজেন্ট</p>
          <p className="text-lg font-bold text-foreground">{agents.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">মোট বুকিং</p>
          <p className="text-lg font-bold text-foreground">{totals.bookingCount}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">মোট পরিশোধ</p>
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
        <Input placeholder="নাম, কোম্পানি বা ফোন দিয়ে খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">কোনো সাপ্লায়ার এজেন্ট পাওয়া যায়নি</p>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-12 text-center">SL</TableHead>
                  <TableHead>নাম</TableHead>
                  <TableHead>ফোন</TableHead>
                  <TableHead className="text-right">মোট বুকিং</TableHead>
                  <TableHead className="text-right">মোট খরচ</TableHead>
                  <TableHead className="text-right">মোট পরিশোধ</TableHead>
                  <TableHead className="text-right">মোট বকেয়া</TableHead>
                  <TableHead className="text-center w-24">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((a, i) => {
                  const stats = supplierStats[a.id] || { bookingCount: 0, totalCost: 0, totalPaid: 0, totalDue: 0 };
                  return (
                    <TableRow key={a.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => navigate(`/admin/supplier-agents/${a.id}`)}>
                      <TableCell className="text-center text-muted-foreground text-xs">{(page - 1) * PAGE_SIZE + i + 1}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{a.agent_name}</p>
                          {a.company_name && <p className="text-[11px] text-muted-foreground">{a.company_name}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{a.phone || "—"}</TableCell>
                      <TableCell className="text-right font-medium">{stats.bookingCount}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(stats.totalCost)}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">{fmt(stats.totalPaid)}</TableCell>
                      <TableCell className="text-right font-medium text-destructive">{fmt(stats.totalDue)}</TableCell>
                      <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                        <AdminActionMenu actions={getActions(a)} inlineCount={1} />
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

      {/* Create / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={o => { if (!o) { setShowForm(false); setEditId(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "এজেন্ট সম্পাদনা" : "নতুন সাপ্লায়ার এজেন্ট"}</DialogTitle>
            <DialogDescription>সাপ্লায়ার এজেন্টের তথ্য পূরণ করুন</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium">এজেন্টের নাম *</label><Input value={form.agent_name} onChange={e => setForm({ ...form, agent_name: e.target.value })} /></div>
            <div><label className="text-sm font-medium">কোম্পানির নাম</label><Input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} /></div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input value={form.phone} onChange={e => handlePhoneChange(e.target.value, (v) => setForm({ ...form, phone: v }))} placeholder="01XXXXXXXXX" maxLength={15} />
              {form.phone.trim() && getPhoneError(form.phone) && <p className="text-xs text-destructive mt-1">{getPhoneError(form.phone)}</p>}
            </div>
            <div><label className="text-sm font-medium">ঠিকানা</label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div>
              <label className="text-sm font-medium">স্ট্যাটাস</label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">সক্রিয়</SelectItem><SelectItem value="inactive">নিষ্ক্রিয়</SelectItem></SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium">নোট</label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>বাতিল</Button>
            <Button onClick={handleSave}>{editId ? "আপডেট" : "তৈরি করুন"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={o => { if (!o) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>মুছে ফেলতে চান?</DialogTitle>
            <DialogDescription>এই সাপ্লায়ার এজেন্ট স্থায়ীভাবে মুছে ফেলা হবে।</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>বাতিল</Button>
            <Button variant="destructive" onClick={handleDelete}>মুছুন</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
