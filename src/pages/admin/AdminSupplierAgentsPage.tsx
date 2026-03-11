import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsViewer } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Pencil, Trash2, Eye, Search, Truck, ChevronLeft, ChevronRight, FileDown, FileSpreadsheet, Package, Wallet, CreditCard } from "lucide-react";
import { exportPDF, exportExcel } from "@/lib/reportExport";
import { normalizePhone, getPhoneError, handlePhoneChange } from "@/lib/phoneValidation";
import { format } from "date-fns";

const fmt = (n: number) => `BDT ${n.toLocaleString()}`;
const PAGE_SIZE = 15;

interface SupplierAgent {
  id: string; agent_name: string; company_name: string | null; phone: string | null;
  address: string | null; notes: string | null; status: string;
  created_at: string; updated_at: string;
  contracted_amount: number; contracted_hajji: number; contract_date: string | null;
}

const emptyForm = { agent_name: "", company_name: "", phone: "", address: "", notes: "", status: "active", contract_date: "", contracted_hajji: "", contracted_amount: "" };

export default function AdminSupplierAgentsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isViewer = useIsViewer();
  const [agents, setAgents] = useState<SupplierAgent[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [allPaymentsDetailed, setAllPaymentsDetailed] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    const [a, p, itemsRes, paymentsDetailRes] = await Promise.all([
      supabase.from("supplier_agents").select("*").neq("status", "deleted").order("created_at", { ascending: false }),
      supabase.from("supplier_agent_payments").select("id, supplier_agent_id, amount"),
      supabase.from("supplier_agent_items").select("*").order("created_at", { ascending: true }),
      supabase.from("supplier_agent_payments").select("*").order("date", { ascending: false }),
    ]);
    if (a.data) setAgents(a.data as SupplierAgent[]);
    if (p.data) setPayments(p.data);
    setAllItems(itemsRes.data || []);
    setAllPaymentsDetailed(paymentsDetailRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const supplierStats = useMemo(() => {
    const map: Record<string, { totalPaid: number }> = {};
    payments.forEach(p => {
      if (!p.supplier_agent_id) return;
      if (!map[p.supplier_agent_id]) map[p.supplier_agent_id] = { totalPaid: 0 };
      map[p.supplier_agent_id].totalPaid += Number(p.amount || 0);
    });
    return map;
  }, [payments]);

  const getStats = (a: SupplierAgent) => {
    const totalPaid = supplierStats[a.id]?.totalPaid || 0;
    const contractedAmount = Number(a.contracted_amount || 0);
    const totalDue = Math.max(0, contractedAmount - totalPaid);
    return { contractedAmount, totalPaid, totalDue };
  };

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
      contract_date: form.contract_date || null,
      contracted_hajji: form.contracted_hajji ? Number(form.contracted_hajji) : 0,
      contracted_amount: form.contracted_amount ? Number(form.contracted_amount) : 0,
    };
    if (editId) {
      const { error } = await supabase.from("supplier_agents").update(payload).eq("id", editId);
      if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Supplier agent updated successfully" });
    } else {
      const { error } = await supabase.from("supplier_agents").insert(payload);
      if (error) { toast({ title: "Creation failed", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Supplier agent created successfully" });
    }
    setShowForm(false); setEditId(null); setForm(emptyForm); fetchData();
  };

  const startEdit = (a: SupplierAgent) => {
    setForm({ agent_name: a.agent_name, company_name: a.company_name || "", phone: a.phone || "", address: a.address || "", notes: a.notes || "", status: a.status, contract_date: a.contract_date || "", contracted_hajji: String(a.contracted_hajji || ""), contracted_amount: String(a.contracted_amount || "") });
    setEditId(a.id); setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("supplier_agents").update({ status: "deleted" }).eq("id", deleteId);
    if (error) { toast({ title: "Failed to delete", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Supplier agent deleted successfully" }); setDeleteId(null); fetchData();
  };

  const filtered = agents.filter(a => {
    const q = search.toLowerCase();
    return a.agent_name.toLowerCase().includes(q) || (a.company_name || "").toLowerCase().includes(q) || (a.phone || "").includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search]);

  const getActions = (a: SupplierAgent): ActionItem[] => {
    const stats = getStats(a);
    return [
      { label: "View", icon: <Eye className="h-3.5 w-3.5" />, onClick: () => navigate(`/admin/supplier-agents/${a.id}`) },
      { label: "PDF", icon: <FileDown className="h-3.5 w-3.5" />, onClick: () => exportPDF({ title: `Supplier - ${a.agent_name}`, columns: ["Name", "Phone", "Pilgrim Count", "Contract Amount", "Total Paid", "Total Due"], rows: [[a.agent_name, a.phone || "—", a.contracted_hajji || 0, stats.contractedAmount, stats.totalPaid, stats.totalDue]], summary: [`Total Paid: BDT ${stats.totalPaid.toLocaleString("en-IN")}`, `Total Due: BDT ${stats.totalDue.toLocaleString("en-IN")}`] }) },
      { label: "Edit", icon: <Pencil className="h-3.5 w-3.5" />, onClick: () => startEdit(a), variant: "warning", hidden: isViewer },
      { label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, onClick: () => setDeleteId(a.id), variant: "destructive", hidden: isViewer, separator: true },
    ];
  };

  const totals = useMemo(() => {
    let totalContracted = 0, totalPaid = 0, totalDue = 0;
    filtered.forEach(a => { const s = getStats(a); totalContracted += s.contractedAmount; totalPaid += s.totalPaid; totalDue += s.totalDue; });
    return { totalContracted, totalPaid, totalDue };
  }, [filtered, supplierStats]);

  // Agent name lookup
  const agentNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    agents.forEach(a => { map[a.id] = a.agent_name; });
    return map;
  }, [agents]);

  // Items with agent names
  const itemsWithNames = useMemo(() => {
    return allItems.map(item => ({
      ...item,
      agent_name: agentNameMap[item.supplier_agent_id] || "—",
    }));
  }, [allItems, agentNameMap]);

  const itemsGrandTotal = useMemo(() => allItems.reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0), [allItems]);

  // Payments with agent names
  const paymentsWithNames = useMemo(() => {
    return allPaymentsDetailed.map(p => ({
      ...p,
      agent_name: agentNameMap[p.supplier_agent_id] || "—",
    }));
  }, [allPaymentsDetailed, agentNameMap]);

  const paymentsGrandTotal = useMemo(() => allPaymentsDetailed.reduce((s: number, p: any) => s + Number(p.amount || 0), 0), [allPaymentsDetailed]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" /> Supplier Agents
          </h1>
          <p className="text-muted-foreground text-sm">Total {agents.length} Suppliers</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { const rows = filtered.map(a => { const s = getStats(a); return [a.agent_name, a.phone || "—", Number(a.contracted_hajji || 0), s.contractedAmount, s.totalPaid, s.totalDue]; }); exportPDF({ title: "Supplier Agents Report", columns: ["Name", "Phone", "Pilgrim Count", "Contract Amount", "Total Paid", "Total Due"], rows, summary: [`Total Paid: BDT ${totals.totalPaid.toLocaleString("en-IN")}`, `Total Due: BDT ${totals.totalDue.toLocaleString("en-IN")}`] }); }}><FileDown className="h-4 w-4 mr-1" />PDF</Button>
          <Button variant="outline" size="sm" onClick={() => { const rows = filtered.map(a => { const s = getStats(a); return [a.agent_name, a.phone || "—", Number(a.contracted_hajji || 0), s.contractedAmount, s.totalPaid, s.totalDue]; }); exportExcel({ title: "Supplier Agents Report", columns: ["Name", "Phone", "Pilgrim Count", "Contract Amount", "Total Paid", "Total Due"], rows, summary: [`Total Paid: BDT ${totals.totalPaid.toLocaleString()}`, `Total Due: BDT ${totals.totalDue.toLocaleString()}`] }); }}><FileSpreadsheet className="h-4 w-4 mr-1" />Excel</Button>
          {!isViewer && (
            <Button onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-1" /> New Agent
            </Button>
          )}
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Total Agents</p>
          <p className="text-lg font-bold text-foreground">{agents.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Contracted Amount</p>
          <p className="text-lg font-bold text-foreground">{fmt(totals.totalContracted)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Total Paid</p>
          <p className="text-lg font-bold text-emerald-600">{fmt(totals.totalPaid)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Total Due</p>
          <p className="text-lg font-bold text-destructive">{fmt(totals.totalDue)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, company or phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No supplier agents found</p>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-12 text-center">SL</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Pilgrim Count</TableHead>
                  <TableHead className="text-right">Contracted Amount</TableHead>
                  <TableHead className="text-right">Total Paid</TableHead>
                  <TableHead className="text-right">Total Due</TableHead>
                  <TableHead className="text-center w-24">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((a, i) => {
                  const stats = getStats(a);
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
                      <TableCell className="text-right font-medium">{a.contracted_hajji || 0}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(stats.contractedAmount)}</TableCell>
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
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
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

      {/* All Service / Items Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" /> All Service / Items ({itemsWithNames.length})
            </CardTitle>
            <span className="text-sm font-bold">Total: {fmt(itemsGrandTotal)}</span>
          </div>
        </CardHeader>
        <CardContent>
          {itemsWithNames.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No service items</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-10 text-center">SL</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Rate (BDT)</TableHead>
                    <TableHead className="text-right">Total (BDT)</TableHead>
                    <TableHead className="text-center">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsWithNames.map((item: any, i: number) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-center text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell className="font-medium">{item.description}</TableCell>
                      <TableCell className="text-primary text-sm">{item.agent_name}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{fmt(item.unit_price)}</TableCell>
                      <TableCell className="text-right font-bold">{fmt(item.total_amount)}</TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">{item.created_at ? format(new Date(item.created_at), "dd MMM yyyy") : "—"}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/60 font-bold">
                    <TableCell colSpan={5} className="text-right">Total =</TableCell>
                    <TableCell className="text-right text-primary">{fmt(itemsGrandTotal)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Payment History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" /> All Payment History ({paymentsWithNames.length})
            </CardTitle>
            <span className="text-sm font-bold">Total Paid: {fmt(paymentsGrandTotal)}</span>
          </div>
        </CardHeader>
        <CardContent>
          {paymentsWithNames.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No payments yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-10 text-center">SL</TableHead>
                    <TableHead>Agent Name</TableHead>
                    <TableHead className="text-center">Date</TableHead>
                    <TableHead className="text-right">Amount (BDT)</TableHead>
                    <TableHead className="text-center">Method</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentsWithNames.map((p: any, i: number) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-center text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell className="font-medium text-primary">{p.agent_name}</TableCell>
                      <TableCell className="text-center text-sm">{p.date ? format(new Date(p.date), "dd/MM/yyyy") : "—"}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-500">{fmt(p.amount)}</TableCell>
                      <TableCell className="text-center capitalize text-xs">{p.payment_method || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.notes || "—"}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/60 font-bold">
                    <TableCell colSpan={3} className="text-right">Total Paid =</TableCell>
                    <TableCell className="text-right text-emerald-500">{fmt(paymentsGrandTotal)}</TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="border-primary/30">
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Service Total</p>
              <p className="text-lg font-bold">{fmt(itemsGrandTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Total Paid</p>
              <p className="text-lg font-bold text-emerald-500">{fmt(paymentsGrandTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Total Due</p>
              <p className="text-lg font-bold text-destructive">{fmt(Math.max(0, itemsGrandTotal - paymentsGrandTotal))}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Total Agents</p>
              <p className="text-lg font-bold">{agents.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={o => { if (!o) { setShowForm(false); setEditId(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Agent" : "New Supplier Agent"}</DialogTitle>
            <DialogDescription>Fill in the supplier agent details</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium">Agent Name *</label><Input value={form.agent_name} onChange={e => setForm({ ...form, agent_name: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Company Name</label><Input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} /></div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input value={form.phone} onChange={e => handlePhoneChange(e.target.value, (v) => setForm({ ...form, phone: v }))} placeholder="01XXXXXXXXX" maxLength={15} />
              {form.phone.trim() && getPhoneError(form.phone) && <p className="text-xs text-destructive mt-1">{getPhoneError(form.phone)}</p>}
            </div>
            <div><label className="text-sm font-medium">Address</label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Contract Date</label><Input type="date" value={form.contract_date} onChange={e => setForm({ ...form, contract_date: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Contracted Pilgrims</label><Input type="number" min="0" value={form.contracted_hajji} onChange={e => setForm({ ...form, contracted_hajji: e.target.value })} placeholder="0" /></div>
              <div><label className="text-sm font-medium">Contracted Amount (BDT)</label><Input type="number" min="0" value={form.contracted_amount} onChange={e => setForm({ ...form, contracted_amount: e.target.value })} placeholder="0" /></div>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium">Notes</label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</Button>
            <Button onClick={handleSave}>{editId ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={o => { if (!o) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete?</DialogTitle>
            <DialogDescription>This supplier agent will be permanently deleted.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
