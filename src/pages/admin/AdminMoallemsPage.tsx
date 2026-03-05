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
import { Plus, Pencil, Trash2, Eye, Search, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { normalizePhone, getPhoneError, handlePhoneChange } from "@/lib/phoneValidation";

const fmt = (n: number) => `৳${n.toLocaleString()}`;
const PAGE_SIZE = 15;

interface Moallem {
  id: string; name: string; phone: string | null; address: string | null;
  nid_number: string | null; contract_date: string | null; notes: string | null;
  status: string; total_deposit: number; total_due: number;
  contracted_hajji: number; contracted_amount: number;
  created_at: string; updated_at: string;
}

const emptyForm = { name: "", phone: "", address: "", nid_number: "", contract_date: "", notes: "", status: "active", contracted_hajji: "", contracted_amount: "" };

export default function AdminMoallemsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isViewer = useIsViewer();
  const [moallems, setMoallems] = useState<Moallem[]>([]);
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
    const [m, b] = await Promise.all([
      supabase.from("moallems").select("*").order("created_at", { ascending: false }),
      supabase.from("bookings").select("id, moallem_id, num_travelers, total_amount, paid_by_moallem, moallem_due"),
    ]);
    if (m.data) setMoallems(m.data);
    if (b.data) setBookings(b.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Aggregate booking data per moallem
  const moallemStats = useMemo(() => {
    const map: Record<string, { hajji: number; received: number; due: number }> = {};
    bookings.filter(b => b.moallem_id).forEach(b => {
      if (!map[b.moallem_id]) map[b.moallem_id] = { hajji: 0, received: 0, due: 0 };
      map[b.moallem_id].hajji += Number(b.num_travelers || 0);
      map[b.moallem_id].received += Number(b.paid_by_moallem || 0);
      map[b.moallem_id].due += Number(b.moallem_due || 0);
    });
    return map;
  }, [bookings]);

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Name is required.", variant: "destructive" }); return; }
    if (form.phone.trim()) {
      const phoneErr = getPhoneError(form.phone);
      if (phoneErr) { toast({ title: phoneErr, variant: "destructive" }); return; }
    }
    const payload = {
      name: form.name.trim(), phone: form.phone.trim() ? normalizePhone(form.phone) : null,
      address: form.address.trim() || null, nid_number: form.nid_number.trim() || null,
      contract_date: form.contract_date || null, notes: form.notes.trim() || null, status: form.status,
      contracted_hajji: parseInt(form.contracted_hajji) || 0,
      contracted_amount: parseFloat(form.contracted_amount) || 0,
    };
    if (editId) {
      const { error } = await supabase.from("moallems").update(payload).eq("id", editId);
      if (error) { toast({ title: "আপডেট ব্যর্থ", description: error.message, variant: "destructive" }); return; }
      toast({ title: "মোয়াল্লেম আপডেট হয়েছে" });
    } else {
      const { error } = await supabase.from("moallems").insert(payload);
      if (error) { toast({ title: "তৈরি ব্যর্থ", description: error.message, variant: "destructive" }); return; }
      toast({ title: "মোয়াল্লেম তৈরি হয়েছে" });
    }
    setShowForm(false); setEditId(null); setForm(emptyForm); fetchData();
  };

  const startEdit = (m: Moallem) => {
    setForm({ name: m.name, phone: m.phone || "", address: m.address || "", nid_number: m.nid_number || "", contract_date: m.contract_date || "", notes: m.notes || "", status: m.status, contracted_hajji: String(m.contracted_hajji || ""), contracted_amount: String(m.contracted_amount || "") });
    setEditId(m.id); setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("moallems").delete().eq("id", deleteId);
    if (error) { toast({ title: "মুছতে ব্যর্থ", description: error.message, variant: "destructive" }); return; }
    toast({ title: "মোয়াল্লেম মুছে ফেলা হয়েছে" }); setDeleteId(null); fetchData();
  };

  const filtered = moallems.filter(m => {
    const q = search.toLowerCase();
    return m.name.toLowerCase().includes(q) || (m.phone || "").includes(q) || (m.nid_number || "").includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search]);

  const getActions = (m: Moallem): ActionItem[] => [
    { label: "দেখুন", icon: <Eye className="h-3.5 w-3.5" />, onClick: () => navigate(`/admin/moallems/${m.id}`) },
    { label: "সম্পাদনা", icon: <Pencil className="h-3.5 w-3.5" />, onClick: () => startEdit(m), variant: "warning", hidden: isViewer },
    { label: "মুছুন", icon: <Trash2 className="h-3.5 w-3.5" />, onClick: () => setDeleteId(m.id), variant: "destructive", hidden: isViewer, separator: true },
  ];

  // Summary KPIs
  const totals = useMemo(() => {
    let hajji = 0, received = 0, due = 0, contractedHajji = 0, contractedAmount = 0;
    Object.values(moallemStats).forEach(s => { hajji += s.hajji; received += s.received; due += s.due; });
    moallems.forEach(m => { contractedHajji += (m.contracted_hajji || 0); contractedAmount += (m.contracted_amount || 0); });
    return { hajji, received, due, contractedHajji, contractedAmount };
  }, [moallemStats, moallems]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> মোয়াল্লেম ম্যানেজমেন্ট
          </h1>
          <p className="text-muted-foreground text-sm">মোট {moallems.length} জন মোয়াল্লেম</p>
        </div>
        {!isViewer && (
          <Button onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-1" /> নতুন মোয়াল্লেম
          </Button>
        )}
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">মোট মোয়াল্লেম</p>
          <p className="text-lg font-bold text-foreground">{moallems.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">চুক্তিকৃত হাজী</p>
          <p className="text-lg font-bold text-foreground">{totals.contractedHajji}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">চুক্তিকৃত টাকা</p>
          <p className="text-lg font-bold text-foreground">{fmt(totals.contractedAmount)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">মোট প্রাপ্ত</p>
          <p className="text-lg font-bold text-emerald-600">{fmt(totals.received)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">মোট বকেয়া</p>
          <p className="text-lg font-bold text-destructive">{fmt(totals.due)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="নাম, ফোন বা NID দিয়ে খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">কোনো মোয়াল্লেম পাওয়া যায়নি</p>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-12 text-center">SL</TableHead>
                  <TableHead>নাম</TableHead>
                  <TableHead>ফোন</TableHead>
                  <TableHead className="text-right">চুক্তিকৃত হাজী</TableHead>
                  <TableHead className="text-right">চুক্তিকৃত টাকা</TableHead>
                  <TableHead className="text-right">মোট প্রাপ্ত</TableHead>
                  <TableHead className="text-right">মোট বকেয়া</TableHead>
                  <TableHead className="text-center">স্ট্যাটাস</TableHead>
                  <TableHead className="text-center w-24">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((m, i) => {
                  const stats = moallemStats[m.id] || { hajji: 0, received: 0, due: 0 };
                  return (
                    <TableRow key={m.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => navigate(`/admin/moallems/${m.id}`)}>
                      <TableCell className="text-center text-muted-foreground text-xs">{(page - 1) * PAGE_SIZE + i + 1}</TableCell>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell className="text-muted-foreground">{m.phone || "—"}</TableCell>
                      <TableCell className="text-right font-medium">{m.contracted_hajji || 0}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(m.contracted_amount || 0)}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">{fmt(stats.received)}</TableCell>
                      <TableCell className="text-right font-medium text-destructive">{fmt(stats.due)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={m.status === "active" ? "default" : "secondary"} className="text-[10px]">
                          {m.status === "active" ? "সক্রিয়" : "নিষ্ক্রিয়"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                        <AdminActionMenu actions={getActions(m)} inlineCount={1} />
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
            <DialogTitle>{editId ? "মোয়াল্লেম সম্পাদনা" : "নতুন মোয়াল্লেম"}</DialogTitle>
            <DialogDescription>মোয়াল্লেমের তথ্য পূরণ করুন</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium">নাম *</label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input value={form.phone} onChange={e => handlePhoneChange(e.target.value, (v) => setForm({ ...form, phone: v }))} placeholder="01XXXXXXXXX" maxLength={15} />
              {form.phone.trim() && getPhoneError(form.phone) && <p className="text-xs text-destructive mt-1">{getPhoneError(form.phone)}</p>}
            </div>
            <div><label className="text-sm font-medium">ঠিকানা</label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div><label className="text-sm font-medium">NID নম্বর</label><Input value={form.nid_number} onChange={e => setForm({ ...form, nid_number: e.target.value })} /></div>
            <div><label className="text-sm font-medium">চুক্তির তারিখ</label><Input type="date" value={form.contract_date} onChange={e => setForm({ ...form, contract_date: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">চুক্তিকৃত হাজী সংখ্যা</label><Input type="number" min={0} value={form.contracted_hajji} onChange={e => setForm({ ...form, contracted_hajji: e.target.value })} placeholder="0" /></div>
              <div><label className="text-sm font-medium">চুক্তিকৃত মোট টাকা (৳)</label><Input type="number" min={0} value={form.contracted_amount} onChange={e => setForm({ ...form, contracted_amount: e.target.value })} placeholder="0" /></div>
            </div>
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
            <DialogDescription>এই মোয়াল্লেম স্থায়ীভাবে মুছে ফেলা হবে।</DialogDescription>
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
