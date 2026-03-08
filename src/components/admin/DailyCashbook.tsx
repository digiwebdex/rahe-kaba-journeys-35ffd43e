import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Save, X, FileDown, FileSpreadsheet, TrendingUp, TrendingDown } from "lucide-react";
import { exportPDF, exportExcel } from "@/lib/reportExport";
import { useCanModifyFinancials } from "@/components/admin/AdminLayout";

const inputClass = "w-full bg-secondary border border-border rounded-md px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

const INCOME_CATEGORIES = [
  { value: "customer_payment", label: "কাস্টমার পেমেন্ট" },
  { value: "moallem_payment", label: "মোয়াল্লেম জমা" },
  { value: "umrah_payment", label: "উমরাহ পেমেন্ট" },
  { value: "agent_payment", label: "এজেন্ট পেমেন্ট" },
  { value: "other_income", label: "অন্যান্য আয়" },
];

const EXPENSE_CATEGORIES = [
  { value: "car_rent", label: "গাড়ী ভাড়া" },
  { value: "salary", label: "বেতন" },
  { value: "office", label: "অফিস খরচ" },
  { value: "ticket", label: "টিকেট খরচ" },
  { value: "visa", label: "ভিসা খরচ" },
  { value: "hotel", label: "হোটেল খরচ" },
  { value: "food", label: "খাবার খরচ" },
  { value: "transport", label: "পরিবহন খরচ" },
  { value: "inventory", label: "ইমন্তেরি খরচ" },
  { value: "commission", label: "কমিশন" },
  { value: "marketing", label: "মার্কেটিং" },
  { value: "other_expense", label: "অন্যান্য খরচ" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "ক্যাশ" },
  { value: "bkash", label: "বিকাশ" },
  { value: "nagad", label: "নগদ" },
  { value: "bank", label: "ব্যাংক" },
  { value: "manual", label: "ম্যানুয়াল" },
];

const fmt = (n: number) => `৳${Number(n || 0).toLocaleString()}`;

const EMPTY_FORM = {
  type: "income" as "income" | "expense",
  description: "",
  amount: "",
  category: "customer_payment",
  wallet_account_id: "",
  payment_method: "cash",
  notes: "",
  date: new Date().toISOString().split("T")[0],
};

interface DailyCashbookProps {
  onEntriesChanged?: () => void | Promise<void>;
}

export default function DailyCashbook({ onEntriesChanged }: DailyCashbookProps = {}) {
  const canModify = useCanModifyFinancials();
  const [entries, setEntries] = useState<any[]>([]);
  const [walletAccounts, setWalletAccounts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [viewType, setViewType] = useState<"all" | "income" | "expense">("all");

  const fetchData = async () => {
    const [entryRes, walletRes] = await Promise.all([
      supabase.from("daily_cashbook" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("accounts" as any).select("*").eq("type", "asset"),
    ]);
    setEntries((entryRes.data as any[]) || []);
    setWalletAccounts((walletRes.data as any[]) || []);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) { toast.error("নাম/বিবরণ আবশ্যক"); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error("সঠিক পরিমাণ দিন"); return; }
    const payload: any = {
      type: form.type,
      description: form.description.trim(),
      amount: parseFloat(form.amount),
      category: form.category,
      wallet_account_id: form.wallet_account_id || null,
      payment_method: form.payment_method,
      notes: form.notes.trim() || null,
      date: form.date,
    };
    const { error } = await supabase.from("daily_cashbook" as any).insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(form.type === "income" ? "জমা রেকর্ড হয়েছে" : "খরচ রেকর্ড হয়েছে");
    setShowForm(false);
    setForm({ ...EMPTY_FORM });
    fetchData();
  };

  const startEdit = (entry: any) => {
    setEditingId(entry.id);
    setEditForm({
      type: entry.type, description: entry.description, amount: entry.amount,
      category: entry.category, wallet_account_id: entry.wallet_account_id || "",
      payment_method: entry.payment_method || "cash", notes: entry.notes || "", date: entry.date,
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase.from("daily_cashbook" as any).update({
      type: editForm.type, description: editForm.description, amount: parseFloat(editForm.amount),
      category: editForm.category, wallet_account_id: editForm.wallet_account_id || null,
      payment_method: editForm.payment_method, notes: editForm.notes || null, date: editForm.date,
    }).eq("id", editingId);
    if (error) { toast.error(error.message); return; }
    toast.success("আপডেট হয়েছে");
    setEditingId(null);
    fetchData();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("daily_cashbook" as any).delete().eq("id", deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success("মুছে ফেলা হয়েছে");
    setDeleteId(null);
    fetchData();
  };

  // Normalize date to YYYY-MM-DD (handles ISO timestamps from API)
  const normalizeDate = (d: string) => d ? d.substring(0, 10) : "";

  // Filter by selected date and type
  const filtered = useMemo(() => {
    return entries.filter((e: any) => {
      if (normalizeDate(e.date) !== selectedDate) return false;
      if (viewType !== "all" && e.type !== viewType) return false;
      return true;
    });
  }, [entries, selectedDate, viewType]);

  const dailyIncome = useMemo(() =>
    entries.filter((e: any) => normalizeDate(e.date) === selectedDate && e.type === "income").reduce((s: number, e: any) => s + Number(e.amount), 0),
    [entries, selectedDate]);

  const dailyExpense = useMemo(() =>
    entries.filter((e: any) => normalizeDate(e.date) === selectedDate && e.type === "expense").reduce((s: number, e: any) => s + Number(e.amount), 0),
    [entries, selectedDate]);

  const dailyBalance = dailyIncome - dailyExpense;

  const getCategoryLabel = (type: string, category: string) => {
    const list = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    return list.find(c => c.value === category)?.label || category;
  };

  const getWalletName = (id: string) => {
    return walletAccounts.find((w: any) => w.id === id)?.name || "—";
  };

  // Group entries by date for summary
  const dateGroups = useMemo(() => {
    const groups: Record<string, { income: number; expense: number; count: number }> = {};
    entries.forEach((e: any) => {
      const d = normalizeDate(e.date);
      if (!groups[d]) groups[d] = { income: 0, expense: 0, count: 0 };
      groups[d].count++;
      if (e.type === "income") groups[d].income += Number(e.amount);
      else groups[d].expense += Number(e.amount);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a)).slice(0, 7);
  }, [entries]);

  const handleExportPDF = async () => {
    try {
      if (!filtered.length) {
        toast.error("এই তারিখে এক্সপোর্ট করার মতো ডেটা নেই");
        return;
      }

      await exportPDF({
        title: `Daily Cashbook ${selectedDate}`,
        columns: ["Type", "Description", "Category", "Amount", "Method"],
        rows: filtered.map(e => [
          e.type === "income" ? "Income" : "Expense",
          e.description,
          getCategoryLabel(e.type, e.category),
          Number(e.amount),
          PAYMENT_METHODS.find(p => p.value === e.payment_method)?.label || e.payment_method,
        ]),
        summary: [`Total Income: BDT ${dailyIncome.toLocaleString("en-IN")} | Total Expense: BDT ${dailyExpense.toLocaleString("en-IN")} | Balance: BDT ${dailyBalance.toLocaleString("en-IN")}`],
      });
    } catch (error) {
      console.error("Daily cashbook PDF export failed:", error);
      toast.error("PDF export failed");
    }
  };

  const handleExportExcel = () => {
    try {
      if (!filtered.length) {
        toast.error("এই তারিখে এক্সপোর্ট করার মতো ডেটা নেই");
        return;
      }

      exportExcel({
        title: `Daily Cashbook ${selectedDate}`,
        columns: ["Type", "Description", "Category", "Amount", "Method"],
        rows: filtered.map(e => [
          e.type === "income" ? "Income" : "Expense",
          e.description,
          getCategoryLabel(e.type, e.category),
          Number(e.amount),
          PAYMENT_METHODS.find(p => p.value === e.payment_method)?.label || e.payment_method,
        ]),
      });
    } catch (error) {
      console.error("Daily cashbook Excel export failed:", error);
      toast.error("Excel export failed");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">তারিখ:</label>
          <input type="date" className={inputClass + " w-auto"} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
        </div>
        <div className="flex items-center gap-1">
          {(["all", "income", "expense"] as const).map(t => (
            <button key={t} onClick={() => setViewType(t)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${viewType === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "all" ? "সকল" : t === "income" ? "জমা" : "খরচ"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {canModify && (
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 text-sm bg-gradient-gold text-primary-foreground font-semibold px-4 py-2 rounded-md hover:opacity-90 transition-opacity shadow-gold">
              <Plus className="h-4 w-4" /> নতুন এন্ট্রি
            </button>
          )}
          <button onClick={handleExportPDF} className="inline-flex items-center gap-1 text-xs bg-secondary px-3 py-1.5 rounded-md hover:bg-muted"><FileDown className="h-3.5 w-3.5" />PDF</button>
          <button onClick={handleExportExcel} className="inline-flex items-center gap-1 text-xs bg-secondary px-3 py-1.5 rounded-md hover:bg-muted"><FileSpreadsheet className="h-3.5 w-3.5" />Excel</button>
        </div>
      </div>

      {/* Daily Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-emerald/30 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">মোট জমা</p>
          <p className="text-2xl font-heading font-bold text-emerald">{fmt(dailyIncome)}</p>
        </div>
        <div className="bg-card border border-destructive/30 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">মোট খরচ</p>
          <p className="text-2xl font-heading font-bold text-destructive">{fmt(dailyExpense)}</p>
        </div>
        <div className={`bg-card border rounded-lg p-4 ${dailyBalance >= 0 ? "border-emerald/30" : "border-destructive/30"}`}>
          <p className="text-sm text-muted-foreground">ব্যালেন্স</p>
          <p className={`text-2xl font-heading font-bold ${dailyBalance >= 0 ? "text-emerald" : "text-destructive"}`}>
            {dailyBalance >= 0 ? <TrendingUp className="inline h-5 w-5 mr-1" /> : <TrendingDown className="inline h-5 w-5 mr-1" />}
            {fmt(Math.abs(dailyBalance))}
          </p>
        </div>
      </div>

      {/* Recent Days Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
        {dateGroups.map(([date, data]) => (
          <button key={date} onClick={() => setSelectedDate(date)}
            className={`bg-card border rounded-lg p-2 text-center text-xs transition-colors hover:border-primary/50 ${selectedDate === date ? "border-primary ring-1 ring-primary/30" : "border-border"}`}>
            <p className="font-medium text-foreground mb-1">{new Date(date + 'T00:00:00').toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' })}</p>
            <p className="text-emerald">{fmt(data.income)}</p>
            <p className="text-destructive">{fmt(data.expense)}</p>
          </button>
        ))}
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-heading text-lg font-bold">নতুন এন্ট্রি</h3>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              {/* Type Toggle */}
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm({ ...form, type: "income", category: "customer_payment" })}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${form.type === "income" ? "bg-emerald/20 text-emerald border border-emerald/40" : "bg-secondary text-muted-foreground"}`}>
                  জমা (Income)
                </button>
                <button type="button" onClick={() => setForm({ ...form, type: "expense", category: "car_rent" })}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${form.type === "expense" ? "bg-destructive/20 text-destructive border border-destructive/40" : "bg-secondary text-muted-foreground"}`}>
                  খরচ (Expense)
                </button>
              </div>

              <input className={inputClass} placeholder="নাম / বিবরণ *" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              <input className={inputClass} type="number" placeholder="পরিমাণ (৳) *" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} min="1" />
              
              <div className="grid grid-cols-2 gap-3">
                <select className={inputClass} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {(form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <select className={inputClass} value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>
                  {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <select className={inputClass} value={form.wallet_account_id} onChange={e => setForm({ ...form, wallet_account_id: e.target.value })}>
                  <option value="">ওয়ালেট সিলেক্ট করুন</option>
                  {walletAccounts.map((w: any) => <option key={w.id} value={w.id}>{w.name} ({fmt(w.balance)})</option>)}
                </select>
                <input className={inputClass} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>

              <input className={inputClass} placeholder="নোট (ঐচ্ছিক)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              
              <button type="submit" className="w-full bg-gradient-gold text-primary-foreground font-semibold py-2.5 rounded-md hover:opacity-90 transition-opacity shadow-gold">
                {form.type === "income" ? "জমা রেকর্ড করুন" : "খরচ রেকর্ড করুন"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold mb-3">মুছে ফেলতে চান?</h3>
            <p className="text-sm text-muted-foreground mb-4">এই এন্ট্রিটি স্থায়ীভাবে মুছে যাবে।</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm bg-secondary rounded-md">বাতিল</button>
              <button onClick={confirmDelete} className="px-4 py-2 text-sm bg-destructive text-white rounded-md">মুছুন</button>
            </div>
          </div>
        </div>
      )}

      {/* Entry List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg mb-1">কোনো এন্ট্রি নেই</p>
            <p className="text-sm">{selectedDate} তারিখে কোনো জমা/খরচ রেকর্ড পাওয়া যায়নি</p>
          </div>
        ) : (
          <>
            {/* Income Section */}
            {(viewType === "all" || viewType === "income") && filtered.filter(e => e.type === "income").length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-emerald mb-2 flex items-center gap-1"><TrendingUp className="h-4 w-4" /> জমা ({filtered.filter(e => e.type === "income").length})</h4>
                <div className="bg-card border border-emerald/20 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border bg-secondary/50">
                      <th className="text-left px-4 py-2 text-xs text-muted-foreground">নাম/বিবরণ</th>
                      <th className="text-left px-4 py-2 text-xs text-muted-foreground">ক্যাটাগরি</th>
                      <th className="text-left px-4 py-2 text-xs text-muted-foreground">পদ্ধতি</th>
                      <th className="text-left px-4 py-2 text-xs text-muted-foreground">ওয়ালেট</th>
                      <th className="text-right px-4 py-2 text-xs text-muted-foreground">পরিমাণ</th>
                      {canModify && <th className="text-right px-4 py-2 text-xs text-muted-foreground">অ্যাকশন</th>}
                    </tr></thead>
                    <tbody>
                      {filtered.filter(e => e.type === "income").map(entry => (
                        editingId === entry.id ? (
                          <tr key={entry.id} className="border-b border-border">
                            <td className="px-3 py-1.5"><input className={inputClass} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} /></td>
                            <td className="px-3 py-1.5">
                              <select className={inputClass} value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}>
                                {INCOME_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-1.5">
                              <select className={inputClass} value={editForm.payment_method} onChange={e => setEditForm({ ...editForm, payment_method: e.target.value })}>
                                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-1.5">
                              <select className={inputClass} value={editForm.wallet_account_id} onChange={e => setEditForm({ ...editForm, wallet_account_id: e.target.value })}>
                                <option value="">—</option>
                                {walletAccounts.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-1.5"><input className={inputClass + " text-right"} type="number" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} /></td>
                            <td className="px-3 py-1.5 text-right">
                              <button onClick={saveEdit} className="text-emerald mr-2"><Save className="h-4 w-4" /></button>
                              <button onClick={() => setEditingId(null)} className="text-muted-foreground"><X className="h-4 w-4" /></button>
                            </td>
                          </tr>
                        ) : (
                          <tr key={entry.id} className="border-b border-border hover:bg-secondary/30">
                            <td className="px-4 py-2.5 font-medium">{entry.description}{entry.notes && <span className="text-xs text-muted-foreground ml-2">({entry.notes})</span>}</td>
                            <td className="px-4 py-2.5 text-xs">{getCategoryLabel(entry.type, entry.category)}</td>
                            <td className="px-4 py-2.5 text-xs">{PAYMENT_METHODS.find(p => p.value === entry.payment_method)?.label || "—"}</td>
                            <td className="px-4 py-2.5 text-xs">{entry.wallet_account_id ? getWalletName(entry.wallet_account_id) : "—"}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-emerald">{fmt(entry.amount)}</td>
                            {canModify && (
                              <td className="px-4 py-2.5 text-right">
                                <button onClick={() => startEdit(entry)} className="text-amber-400 mr-2"><Edit2 className="h-3.5 w-3.5" /></button>
                                <button onClick={() => setDeleteId(entry.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                              </td>
                            )}
                          </tr>
                        )
                      ))}
                      <tr className="bg-emerald/5 font-bold">
                        <td colSpan={4} className="px-4 py-2 text-right text-sm">মোট জমা:</td>
                        <td className="px-4 py-2 text-right text-emerald">{fmt(dailyIncome)}</td>
                        {canModify && <td></td>}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Expense Section */}
            {(viewType === "all" || viewType === "expense") && filtered.filter(e => e.type === "expense").length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-destructive mb-2 flex items-center gap-1"><TrendingDown className="h-4 w-4" /> খরচ ({filtered.filter(e => e.type === "expense").length})</h4>
                <div className="bg-card border border-destructive/20 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border bg-secondary/50">
                      <th className="text-left px-4 py-2 text-xs text-muted-foreground">নাম/বিবরণ</th>
                      <th className="text-left px-4 py-2 text-xs text-muted-foreground">ক্যাটাগরি</th>
                      <th className="text-left px-4 py-2 text-xs text-muted-foreground">পদ্ধতি</th>
                      <th className="text-left px-4 py-2 text-xs text-muted-foreground">ওয়ালেট</th>
                      <th className="text-right px-4 py-2 text-xs text-muted-foreground">পরিমাণ</th>
                      {canModify && <th className="text-right px-4 py-2 text-xs text-muted-foreground">অ্যাকশন</th>}
                    </tr></thead>
                    <tbody>
                      {filtered.filter(e => e.type === "expense").map(entry => (
                        editingId === entry.id ? (
                          <tr key={entry.id} className="border-b border-border">
                            <td className="px-3 py-1.5"><input className={inputClass} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} /></td>
                            <td className="px-3 py-1.5">
                              <select className={inputClass} value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}>
                                {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-1.5">
                              <select className={inputClass} value={editForm.payment_method} onChange={e => setEditForm({ ...editForm, payment_method: e.target.value })}>
                                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-1.5">
                              <select className={inputClass} value={editForm.wallet_account_id} onChange={e => setEditForm({ ...editForm, wallet_account_id: e.target.value })}>
                                <option value="">—</option>
                                {walletAccounts.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-1.5"><input className={inputClass + " text-right"} type="number" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} /></td>
                            <td className="px-3 py-1.5 text-right">
                              <button onClick={saveEdit} className="text-emerald mr-2"><Save className="h-4 w-4" /></button>
                              <button onClick={() => setEditingId(null)} className="text-muted-foreground"><X className="h-4 w-4" /></button>
                            </td>
                          </tr>
                        ) : (
                          <tr key={entry.id} className="border-b border-border hover:bg-secondary/30">
                            <td className="px-4 py-2.5 font-medium">{entry.description}{entry.notes && <span className="text-xs text-muted-foreground ml-2">({entry.notes})</span>}</td>
                            <td className="px-4 py-2.5 text-xs">{getCategoryLabel(entry.type, entry.category)}</td>
                            <td className="px-4 py-2.5 text-xs">{PAYMENT_METHODS.find(p => p.value === entry.payment_method)?.label || "—"}</td>
                            <td className="px-4 py-2.5 text-xs">{entry.wallet_account_id ? getWalletName(entry.wallet_account_id) : "—"}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-destructive">{fmt(entry.amount)}</td>
                            {canModify && (
                              <td className="px-4 py-2.5 text-right">
                                <button onClick={() => startEdit(entry)} className="text-amber-400 mr-2"><Edit2 className="h-3.5 w-3.5" /></button>
                                <button onClick={() => setDeleteId(entry.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                              </td>
                            )}
                          </tr>
                        )
                      ))}
                      <tr className="bg-destructive/5 font-bold">
                        <td colSpan={4} className="px-4 py-2 text-right text-sm">মোট খরচ:</td>
                        <td className="px-4 py-2 text-right text-destructive">{fmt(dailyExpense)}</td>
                        {canModify && <td></td>}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
