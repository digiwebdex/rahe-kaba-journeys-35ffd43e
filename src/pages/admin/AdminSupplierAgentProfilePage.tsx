import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsViewer } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, FileText, CreditCard, TrendingDown,
  Phone, MapPin, Truck, Building2, Plus, Wallet, Download, Package,
} from "lucide-react";
import { format } from "date-fns";
import { generateSupplierPdf, getCompanyInfoForPdf, SupplierPdfData } from "@/lib/entityPdfGenerator";
import SupplierContractManager from "@/components/admin/SupplierContractManager";
import SupplierItemsManager from "@/components/admin/SupplierItemsManager";

const fmt = (n: number) => `৳${Number(n || 0).toLocaleString()}`;
const PAYMENT_METHODS = ["cash", "bkash", "nagad", "bank", "other"];

export default function AdminSupplierAgentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isViewer = useIsViewer();
  const [agent, setAgent] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [agentPayments, setAgentPayments] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [contractPayments, setContractPayments] = useState<any[]>([]);
  const [supplierItems, setSupplierItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Date filter
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const emptyForm = {
    amount: "", payment_method: "cash",
    date: new Date().toISOString().split("T")[0],
    notes: "", wallet_account_id: "", booking_id: "",
  };
  const [paymentForm, setPaymentForm] = useState(emptyForm);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    const [agRes, bRes, apRes, accRes, cRes, cpRes, itemsRes] = await Promise.all([
      supabase.from("supplier_agents").select("*").eq("id", id).maybeSingle(),
      supabase.from("bookings").select("*, packages(name, type, price)").eq("supplier_agent_id", id).order("created_at", { ascending: false }),
      supabase.from("supplier_agent_payments").select("*").eq("supplier_agent_id", id).order("date", { ascending: false }),
      supabase.from("accounts").select("id, name, type, balance").order("name"),
      supabase.from("supplier_contracts").select("*").eq("supplier_id", id).order("created_at", { ascending: false }),
      supabase.from("supplier_contract_payments").select("*").eq("supplier_id", id).order("payment_date", { ascending: false }),
      supabase.from("supplier_agent_items").select("*").eq("supplier_agent_id", id).order("created_at", { ascending: true }),
    ]);
    setAgent(agRes.data);
    setBookings((bRes.data as any[]) || []);
    setAgentPayments(apRes.data || []);
    setAccounts(accRes.data || []);
    setContracts(cRes.data || []);
    setContractPayments(cpRes.data || []);
    setSupplierItems(itemsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [id]);

  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentForm.amount);
    if (!amount || amount <= 0) { toast({ title: "সঠিক পরিমাণ দিন", variant: "destructive" }); return; }
    setPaymentLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { error: apErr } = await supabase.from("supplier_agent_payments").insert({
        supplier_agent_id: id, amount,
        payment_method: paymentForm.payment_method,
        date: paymentForm.date,
        notes: paymentForm.notes.trim() || null,
        wallet_account_id: paymentForm.wallet_account_id || null,
        booking_id: paymentForm.booking_id || null,
        recorded_by: session.user.id,
      });
      if (apErr) throw apErr;
      const { error: expErr } = await supabase.from("expenses").insert({
        title: `সাপ্লায়ার পেমেন্ট — ${agent?.agent_name || ""}`,
        amount, category: "supplier_payment", expense_type: "supplier",
        date: paymentForm.date,
        note: paymentForm.notes.trim() || `Payment to supplier: ${agent?.agent_name}`,
        wallet_account_id: paymentForm.wallet_account_id || null,
      });
      if (expErr) throw expErr;
      toast({ title: "পেমেন্ট রেকর্ড হয়েছে" });
      setShowPaymentForm(false);
      setPaymentForm(emptyForm);
      loadData();
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
    } finally { setPaymentLoading(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!agent) return <div className="text-center py-20 text-muted-foreground">সাপ্লায়ার এজেন্ট পাওয়া যায়নি</div>;

  const itemsTotal = supplierItems.reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
  const totalCost = bookings.reduce((s, b) => s + Number(b.total_cost || 0), 0);
  const totalAgentPaid = agentPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const contractedAmount = Number(agent.contracted_amount || 0);
  // Use items total if items exist, otherwise fall back to contracted_amount
  const totalBilled = itemsTotal > 0 ? itemsTotal : contractedAmount;
  const totalDue = Math.max(0, totalBilled - totalAgentPaid);

  const filterByDate = (items: any[]) => items.filter(p => {
    if (dateFrom && p.date < dateFrom) return false;
    if (dateTo && p.date > dateTo) return false;
    return true;
  });
  const filteredPayments = filterByDate(agentPayments);
  const walletAccounts = accounts.filter(a => ["asset", "wallet"].includes(a.type) || ["Cash", "bKash", "Nagad", "Bank"].includes(a.name));

  const handleDownloadStatement = async () => {
    const company = await getCompanyInfoForPdf();
    const pdfData: SupplierPdfData = {
      agent_name: agent.agent_name, company_name: agent.company_name,
      phone: agent.phone, address: agent.address, status: agent.status, notes: agent.notes,
      items: supplierItems.map((i: any) => ({
        description: i.description, quantity: Number(i.quantity),
        unit_price: Number(i.unit_price), total_amount: Number(i.total_amount),
      })),
      bookings: bookings.map(b => ({
        tracking_id: b.tracking_id, guest_name: b.guest_name || "—",
        package_name: b.packages?.name || "—",
        total: Number(b.total_amount), cost: Number(b.total_cost || 0),
        paid_to_supplier: Number(b.paid_to_supplier || 0),
        supplier_due: Number(b.supplier_due || 0), status: b.status,
      })),
      agentPayments: filteredPayments.map(p => ({ amount: Number(p.amount), date: p.date, method: p.payment_method || "cash", notes: p.notes })),
      contracts: contracts.map((c: any) => ({
        contract_amount: Number(c.contract_amount || 0),
        pilgrim_count: Number(c.pilgrim_count || 0),
        total_paid: Number(c.total_paid || 0),
        total_due: Number(c.total_due || 0),
        created_at: c.created_at,
      })),
      contractPayments: contractPayments.map((p: any) => ({
        amount: Number(p.amount), payment_date: p.payment_date,
        payment_method: p.payment_method || "cash", note: p.note,
      })),
      summary: {
        totalBookings: bookings.length,
        totalTravelers: bookings.reduce((s, b) => s + Number(b.num_travelers || 0), 0),
        contractedHajji: Number(agent.contracted_hajji || 0),
        totalPaid: totalAgentPaid,
        totalDue,
        totalBilled,
      },
    };
    await generateSupplierPdf(pdfData, company);
    toast({ title: "PDF ডাউনলোড হয়েছে" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate("/admin/supplier-agents")} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Truck className="h-5 w-5 text-primary" />{agent.agent_name}</h1>
          <p className="text-sm text-muted-foreground">সাপ্লায়ার এজেন্ট প্রোফাইল</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleDownloadStatement}><Download className="h-4 w-4 mr-1" /> সম্পূর্ণ সারসংক্ষেপ PDF</Button>
          {!isViewer && <Button size="sm" onClick={() => setShowPaymentForm(true)}><Plus className="h-4 w-4 mr-1" /> পেমেন্ট</Button>}
          <Badge variant={agent.status === "active" ? "default" : "secondary"}>{agent.status === "active" ? "সক্রিয়" : "নিষ্ক্রিয়"}</Badge>
        </div>
      </div>

      {/* Info */}
      <Card><CardContent className="pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />{agent.company_name || "—"}</div>
          <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{agent.phone || "—"}</div>
          <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{agent.address || "—"}</div>
          <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />তৈরি: {format(new Date(agent.created_at), "dd MMM yyyy")}</div>
        </div>
      </CardContent></Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-4 text-center">
          <Package className="h-5 w-5 text-primary mx-auto mb-1" />
          <p className="text-lg font-bold">{fmt(totalBilled)}</p>
          <p className="text-[10px] text-muted-foreground uppercase">মোট বিল</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center">
          <CreditCard className="h-5 w-5 text-blue-500 mx-auto mb-1" />
          <p className="text-lg font-bold">{fmt(totalCost)}</p>
          <p className="text-[10px] text-muted-foreground uppercase">বুকিং খরচ</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center">
          <Wallet className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-emerald-500">{fmt(totalAgentPaid)}</p>
          <p className="text-[10px] text-muted-foreground uppercase">মোট পরিশোধিত</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center">
          <TrendingDown className="h-5 w-5 text-destructive mx-auto mb-1" />
          <p className="text-lg font-bold text-destructive">{fmt(totalDue)}</p>
          <p className="text-[10px] text-muted-foreground uppercase">মোট বকেয়া</p>
        </CardContent></Card>
      </div>

      {/* Supplier Items / Services */}
      <SupplierItemsManager
        supplierId={id!}
        items={supplierItems}
        isViewer={isViewer}
        onRefresh={loadData}
      />

      {/* Date Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        {(dateFrom || dateTo) && <Button variant="outline" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>রিসেট</Button>}
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> পেমেন্ট হিস্ট্রি ({filteredPayments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">কোনো পেমেন্ট নেই</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-left text-muted-foreground text-xs">
                  <th className="pb-2 pr-3">তারিখ</th><th className="pb-2 pr-3">পরিমাণ</th><th className="pb-2 pr-3">পদ্ধতি</th><th className="pb-2 pr-3">বুকিং</th><th className="pb-2">নোট</th>
                </tr></thead>
                <tbody>
                  {filteredPayments.map((p: any) => (
                    <tr key={p.id} className="border-b border-border/30">
                      <td className="py-2 pr-3 text-xs">{format(new Date(p.date), "dd MMM yyyy")}</td>
                      <td className="py-2 pr-3 font-bold text-emerald-500">{fmt(p.amount)}</td>
                      <td className="py-2 pr-3 capitalize">{p.payment_method}</td>
                      <td className="py-2 pr-3 text-xs font-mono text-primary">{p.booking_id ? bookings.find(b => b.id === p.booking_id)?.tracking_id || "—" : "General"}</td>
                      <td className="py-2 text-xs text-muted-foreground">{p.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bookings */}
      {/* Supplier Contracts */}
      <SupplierContractManager
        supplierId={id!}
        supplierName={agent.agent_name}
        contracts={contracts}
        contractPayments={contractPayments}
        accounts={accounts}
        isViewer={isViewer}
        onRefresh={loadData}
      />

      {/* Bookings (existing) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> বুকিং তালিকা ({bookings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">কোনো বুকিং নেই</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-left text-muted-foreground text-xs">
                  <th className="pb-2 pr-3">ট্র্যাকিং</th><th className="pb-2 pr-3">কাস্টমার</th><th className="pb-2 pr-3">মোট খরচ</th>
                  <th className="pb-2 pr-3">পরিশোধিত</th><th className="pb-2 pr-3">বকেয়া</th><th className="pb-2">স্ট্যাটাস</th>
                </tr></thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id} className="border-b border-border/30">
                      <td className="py-2 pr-3 font-mono text-primary text-xs">{b.tracking_id}</td>
                      <td className="py-2 pr-3">{b.guest_name || "—"}</td>
                      <td className="py-2 pr-3 font-medium">{fmt(b.total_cost)}</td>
                      <td className="py-2 pr-3 text-emerald-500">{fmt(b.paid_to_supplier)}</td>
                      <td className="py-2 pr-3 text-destructive">{fmt(b.supplier_due)}</td>
                      <td className="py-2"><Badge variant={b.status === "completed" ? "default" : "secondary"} className="text-[10px] capitalize">{b.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>সাপ্লায়ার পেমেন্ট রেকর্ড</DialogTitle><DialogDescription>পেমেন্ট তথ্য দিন</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs text-muted-foreground block mb-1">পরিমাণ (৳) *</label>
              <Input type="number" min={0} value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">পদ্ধতি</label>
              <Select value={paymentForm.payment_method} onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><label className="text-xs text-muted-foreground block mb-1">তারিখ</label>
              <Input type="date" value={paymentForm.date} onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })} /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">বুকিং (ঐচ্ছিক)</label>
              <select className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm" value={paymentForm.booking_id} onChange={(e) => setPaymentForm({ ...paymentForm, booking_id: e.target.value })}>
                <option value="">-- সব বুকিং --</option>
                {bookings.map(b => <option key={b.id} value={b.id}>{b.tracking_id} — Due: {fmt(b.supplier_due)}</option>)}
              </select></div>
            {walletAccounts.length > 0 && (
              <div><label className="text-xs text-muted-foreground block mb-1">ওয়ালেট</label>
                <Select value={paymentForm.wallet_account_id} onValueChange={(v) => setPaymentForm({ ...paymentForm, wallet_account_id: v })}>
                  <SelectTrigger><SelectValue placeholder="-- ওয়ালেট --" /></SelectTrigger>
                  <SelectContent>{walletAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({fmt(a.balance)})</SelectItem>)}</SelectContent>
                </Select></div>
            )}
            <div><label className="text-xs text-muted-foreground block mb-1">নোট</label>
              <Input value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} placeholder="নোট..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentForm(false)}>বাতিল</Button>
            <Button onClick={handleRecordPayment} disabled={paymentLoading}>{paymentLoading ? "সেভ হচ্ছে..." : "সেভ করুন"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
