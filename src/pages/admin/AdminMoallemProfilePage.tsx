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
  ArrowLeft, Users, FileText, CreditCard, TrendingDown,
  Phone, MapPin, CalendarDays, Hash, Plus, Wallet, Download,
} from "lucide-react";
import { format } from "date-fns";
import { generateMoallemPdf, getCompanyInfoForPdf, MoallemPdfData } from "@/lib/entityPdfGenerator";

const fmt = (n: number) => `৳${Number(n || 0).toLocaleString()}`;
const PAYMENT_METHODS = ["cash", "bkash", "nagad", "bank", "other"];

export default function AdminMoallemProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isViewer = useIsViewer();
  const [moallem, setMoallem] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [moallemPayments, setMoallemPayments] = useState<any[]>([]);
  const [commissionPayments, setCommissionPayments] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showCommissionForm, setShowCommissionForm] = useState(false);
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
  const [commissionForm, setCommissionForm] = useState(emptyForm);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    const [mRes, bRes, mpRes, cpRes, accRes] = await Promise.all([
      supabase.from("moallems").select("*").eq("id", id).maybeSingle(),
      supabase.from("bookings").select("*, packages(name, type, price)").eq("moallem_id", id).order("created_at", { ascending: false }),
      supabase.from("moallem_payments").select("*").eq("moallem_id", id).order("date", { ascending: false }),
      (supabase as any).from("moallem_commission_payments").select("*").eq("moallem_id", id).order("date", { ascending: false }),
      supabase.from("accounts").select("id, name, type, balance").order("name"),
    ]);
    setMoallem(mRes.data);
    setBookings(bRes.data || []);
    setMoallemPayments(mpRes.data || []);
    setCommissionPayments(cpRes.data || []);
    setAccounts(accRes.data || []);
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
      const { error } = await supabase.from("moallem_payments").insert({
        moallem_id: id, amount,
        payment_method: paymentForm.payment_method,
        date: paymentForm.date,
        notes: paymentForm.notes.trim() || null,
        wallet_account_id: paymentForm.wallet_account_id || null,
        booking_id: paymentForm.booking_id || null,
        recorded_by: session.user.id,
      });
      if (error) throw error;

      // FIFO distribute to unpaid bookings
      let remaining = amount;
      const unpaid = bookings.filter(b => Number(b.due_amount || 0) > 0).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      for (const booking of unpaid) {
        if (remaining <= 0) break;
        const due = Number(booking.due_amount || 0);
        const allocate = Math.min(remaining, due);
        await supabase.from("payments").insert({
          booking_id: booking.id,
          user_id: booking.user_id || session.user.id,
          customer_id: booking.user_id,
          amount: allocate, status: "completed",
          payment_method: paymentForm.payment_method,
          paid_at: new Date().toISOString(),
          notes: `মোয়াল্লেম ডিপোজিট — ${moallem?.name || ""}`,
          wallet_account_id: paymentForm.wallet_account_id || null,
        });
        remaining -= allocate;
      }

      toast({ title: "পেমেন্ট রেকর্ড হয়েছে" });
      setShowPaymentForm(false);
      setPaymentForm(emptyForm);
      loadData();
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
    } finally { setPaymentLoading(false); }
  };

  const handleRecordCommission = async () => {
    const amount = parseFloat(commissionForm.amount);
    if (!amount || amount <= 0) { toast({ title: "সঠিক পরিমাণ দিন", variant: "destructive" }); return; }
    setPaymentLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { error } = await (supabase as any).from("moallem_commission_payments").insert({
        moallem_id: id, amount,
        payment_method: commissionForm.payment_method,
        date: commissionForm.date,
        notes: commissionForm.notes.trim() || null,
        wallet_account_id: commissionForm.wallet_account_id || null,
        booking_id: commissionForm.booking_id || null,
        recorded_by: session.user.id,
      });
      if (error) throw error;
      toast({ title: "কমিশন পরিশোধ রেকর্ড হয়েছে" });
      setShowCommissionForm(false);
      setCommissionForm(emptyForm);
      loadData();
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
    } finally { setPaymentLoading(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!moallem) return <div className="text-center py-20 text-muted-foreground">মোয়াল্লেম পাওয়া যায়নি</div>;

  const totalSelling = bookings.reduce((s, b) => s + Number(b.total_amount || 0), 0);
  const totalPaid = moallemPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalMoallemDue = bookings.reduce((s, b) => s + Number(b.moallem_due || 0), 0);

  // Filter payments by date
  const filterByDate = (items: any[]) => {
    return items.filter(p => {
      if (dateFrom && p.date < dateFrom) return false;
      if (dateTo && p.date > dateTo) return false;
      return true;
    });
  };
  const filteredPayments = filterByDate(moallemPayments);
  const filteredCommissions = filterByDate(commissionPayments);
  const walletAccounts = accounts.filter(a => ["asset", "wallet"].includes(a.type) || ["Cash", "bKash", "Nagad", "Bank"].includes(a.name));

  const handleDownloadStatement = async () => {
    const company = await getCompanyInfoForPdf();
    const pdfData: MoallemPdfData = {
      name: moallem.name, phone: moallem.phone, address: moallem.address,
      nid_number: moallem.nid_number, contract_date: moallem.contract_date,
      status: moallem.status, notes: moallem.notes,
      bookings: bookings.map(b => ({
        tracking_id: b.tracking_id, guest_name: b.guest_name || "—",
        package_name: b.packages?.name || "—",
        total: Number(b.total_amount), paid: Number(b.paid_amount),
        due: Number(b.due_amount || 0), status: b.status,
        date: format(new Date(b.created_at), "dd MMM yyyy"),
      })),
      moallemPayments: filteredPayments.map(p => ({ amount: Number(p.amount), date: p.date, method: p.payment_method || "cash", notes: p.notes })),
      commissionPayments: filteredCommissions.map(p => ({ amount: Number(p.amount), date: p.date, method: p.payment_method || "cash", notes: p.notes })),
      summary: {
        totalBookings: bookings.length, totalTravelers: bookings.reduce((s, b) => s + Number(b.num_travelers || 0), 0),
        totalAmount: totalSelling, totalPaid, totalDue: totalMoallemDue,
        totalDeposit: totalPaid,
        totalCommission: bookings.reduce((s, b) => s + Number(b.total_commission || 0), 0),
        commissionPaid: bookings.reduce((s, b) => s + Number(b.commission_paid || 0), 0),
        commissionDue: bookings.reduce((s, b) => s + Number(b.commission_due || 0), 0),
      },
    };
    await generateMoallemPdf(pdfData, company);
    toast({ title: "PDF ডাউনলোড হয়েছে" });
  };

  const renderPaymentDialog = (title: string, show: boolean, setShow: (v: boolean) => void, formState: any, setFormState: (v: any) => void, onSubmit: () => void) => (
    <Dialog open={show} onOpenChange={setShow}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>পেমেন্ট তথ্য দিন</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div><label className="text-xs text-muted-foreground block mb-1">পরিমাণ (৳) *</label>
            <Input type="number" min={0} value={formState.amount} onChange={(e) => setFormState({ ...formState, amount: e.target.value })} /></div>
          <div><label className="text-xs text-muted-foreground block mb-1">পদ্ধতি</label>
            <Select value={formState.payment_method} onValueChange={(v) => setFormState({ ...formState, payment_method: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select></div>
          <div><label className="text-xs text-muted-foreground block mb-1">তারিখ</label>
            <Input type="date" value={formState.date} onChange={(e) => setFormState({ ...formState, date: e.target.value })} /></div>
          <div><label className="text-xs text-muted-foreground block mb-1">বুকিং (ঐচ্ছিক)</label>
            <select className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm" value={formState.booking_id} onChange={(e) => setFormState({ ...formState, booking_id: e.target.value })}>
              <option value="">-- সব বুকিং --</option>
              {bookings.map(b => <option key={b.id} value={b.id}>{b.tracking_id} — {b.guest_name || "—"}</option>)}
            </select></div>
          {walletAccounts.length > 0 && (
            <div><label className="text-xs text-muted-foreground block mb-1">ওয়ালেট</label>
              <Select value={formState.wallet_account_id} onValueChange={(v) => setFormState({ ...formState, wallet_account_id: v })}>
                <SelectTrigger><SelectValue placeholder="-- ওয়ালেট --" /></SelectTrigger>
                <SelectContent>{walletAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({fmt(a.balance)})</SelectItem>)}</SelectContent>
              </Select></div>
          )}
          <div><label className="text-xs text-muted-foreground block mb-1">নোট</label>
            <Input value={formState.notes} onChange={(e) => setFormState({ ...formState, notes: e.target.value })} placeholder="নোট..." /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShow(false)}>বাতিল</Button>
          <Button onClick={onSubmit} disabled={paymentLoading}>{paymentLoading ? "সেভ হচ্ছে..." : "সেভ করুন"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate("/admin/moallems")} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground">{moallem.name}</h1>
          <p className="text-sm text-muted-foreground">মোয়াল্লেম প্রোফাইল</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleDownloadStatement}><Download className="h-4 w-4 mr-1" /> স্টেটমেন্ট PDF</Button>
          {!isViewer && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowCommissionForm(true)}><Plus className="h-4 w-4 mr-1" /> কমিশন</Button>
              <Button size="sm" onClick={() => setShowPaymentForm(true)}><Plus className="h-4 w-4 mr-1" /> পেমেন্ট</Button>
            </>
          )}
          <Badge variant={moallem.status === "active" ? "default" : "secondary"}>{moallem.status === "active" ? "সক্রিয়" : "নিষ্ক্রিয়"}</Badge>
        </div>
      </div>

      {/* Info */}
      <Card><CardContent className="pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
          <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{moallem.phone || "—"}</div>
          <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{moallem.address || "—"}</div>
          <div className="flex items-center gap-2"><Hash className="h-4 w-4 text-muted-foreground" />NID: {moallem.nid_number || "—"}</div>
          <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-muted-foreground" />চুক্তি: {moallem.contract_date || "—"}</div>
          <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" />চুক্তিকৃত হাজী: {moallem.contracted_hajji || 0}</div>
          <div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-muted-foreground" />চুক্তিকৃত টাকা: {fmt(moallem.contracted_amount || 0)}</div>
        </div>
      </CardContent></Card>

      {/* KPIs - Clean 3 cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 pb-4 text-center">
          <CreditCard className="h-5 w-5 text-primary mx-auto mb-1" />
          <p className="text-lg font-bold">{fmt(totalSelling)}</p>
          <p className="text-[10px] text-muted-foreground uppercase">মোট বিক্রয়</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center">
          <Wallet className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-emerald-500">{fmt(totalPaid)}</p>
          <p className="text-[10px] text-muted-foreground uppercase">মোট পরিশোধিত</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center">
          <TrendingDown className="h-5 w-5 text-destructive mx-auto mb-1" />
          <p className="text-lg font-bold text-destructive">{fmt(totalMoallemDue)}</p>
          <p className="text-[10px] text-muted-foreground uppercase">মোট বকেয়া</p>
        </CardContent></Card>
      </div>

      {/* Date Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" placeholder="From" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" placeholder="To" />
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

      {/* Commission Payments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> কমিশন পেমেন্ট ({filteredCommissions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCommissions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">কোনো কমিশন পেমেন্ট নেই</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-left text-muted-foreground text-xs">
                  <th className="pb-2 pr-3">তারিখ</th><th className="pb-2 pr-3">পরিমাণ</th><th className="pb-2 pr-3">পদ্ধতি</th><th className="pb-2 pr-3">বুকিং</th><th className="pb-2">নোট</th>
                </tr></thead>
                <tbody>
                  {filteredCommissions.map((p: any) => (
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
                  <th className="pb-2 pr-3">ট্র্যাকিং</th><th className="pb-2 pr-3">কাস্টমার</th><th className="pb-2 pr-3">প্যাকেজ</th>
                  <th className="pb-2 pr-3">মোট</th><th className="pb-2 pr-3">পরিশোধিত</th><th className="pb-2 pr-3">বকেয়া</th><th className="pb-2">স্ট্যাটাস</th>
                </tr></thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id} className="border-b border-border/30">
                      <td className="py-2 pr-3 font-mono text-primary text-xs">{b.tracking_id}</td>
                      <td className="py-2 pr-3">{b.guest_name || "—"}</td>
                      <td className="py-2 pr-3">{b.packages?.name || "—"}</td>
                      <td className="py-2 pr-3 font-medium">{fmt(b.total_amount)}</td>
                      <td className="py-2 pr-3 text-emerald-500">{fmt(b.paid_amount)}</td>
                      <td className="py-2 pr-3 text-destructive">{fmt(b.due_amount)}</td>
                      <td className="py-2"><Badge variant={b.status === "completed" ? "default" : "secondary"} className="text-[10px] capitalize">{b.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {renderPaymentDialog("মোয়াল্লেম পেমেন্ট রেকর্ড", showPaymentForm, setShowPaymentForm, paymentForm, setPaymentForm, handleRecordPayment)}
      {renderPaymentDialog("কমিশন পরিশোধ রেকর্ড", showCommissionForm, setShowCommissionForm, commissionForm, setCommissionForm, handleRecordCommission)}
    </div>
  );
}
