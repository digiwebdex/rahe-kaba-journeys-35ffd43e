import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Save, User, Phone, Mail, MapPin, CreditCard, FileText } from "lucide-react";
import CustomerSearchSelect from "@/components/admin/CustomerSearchSelect";

const inputClass =
  "w-full bg-secondary border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

const STATUSES = ["pending", "confirmed", "visa_processing", "ticket_issued", "completed", "cancelled"];

export default function AdminCreateBookingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [phoneSuggestion, setPhoneSuggestion] = useState<any | null>(null);
  const phoneDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  const checkPhoneMatch = useCallback(async (phone: string) => {
    const clean = phone.trim().replace(/[^\d+]/g, "");
    if (clean.length < 5 || selectedCustomerId) { setPhoneSuggestion(null); return; }
    try {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, email, passport_number, address")
        .ilike("phone", `%${clean}%`)
        .limit(1)
        .maybeSingle();
      setPhoneSuggestion(data || null);
    } catch { setPhoneSuggestion(null); }
  }, [selectedCustomerId]);

  const [moallems, setMoallems] = useState<any[]>([]);
  const [supplierAgents, setSupplierAgents] = useState<any[]>([]);
  const [form, setForm] = useState({
    guest_name: "",
    guest_phone: "",
    guest_email: "",
    guest_address: "",
    guest_passport: "",
    package_id: "",
    num_travelers: 1,
    travel_date: "",
    selling_price_per_person: 0,
    total_amount: 0,
    paid_amount: 0,
    cost_price_per_person: 0,
    extra_expense: 0,
    status: "pending",
    notes: "",
    moallem_id: "",
    supplier_agent_id: "",
  });

  const totalSellingPrice = form.selling_price_per_person * form.num_travelers;
  const totalCost = form.cost_price_per_person * form.num_travelers;
  const profitAmount = totalSellingPrice - totalCost - form.extra_expense;
  const dueAmount = Math.max(0, totalSellingPrice - form.paid_amount);

  useEffect(() => {
    supabase
      .from("packages")
      .select("id, name, type, price, duration_days")
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => setPackages(data || []));
    supabase
      .from("moallems")
      .select("id, name, phone, status")
      .eq("status", "active")
      .order("name")
      .then(({ data }) => setMoallems(data || []));
    supabase
      .from("supplier_agents")
      .select("id, agent_name, company_name, status")
      .eq("status", "active")
      .order("agent_name")
      .then(({ data }) => setSupplierAgents((data as any[]) || []));
  }, []);

  const handleCustomerSelect = (customer: any | null) => {
    if (customer) {
      setSelectedCustomerId(customer.user_id);
      setPhoneSuggestion(null);
      setForm((prev) => ({
        ...prev,
        guest_name: customer.full_name || "",
        guest_phone: customer.phone || "",
        guest_email: customer.email || "",
        guest_address: customer.address || "",
        guest_passport: customer.passport_number || "",
      }));
    } else {
      setSelectedCustomerId(null);
      setForm((prev) => ({
        ...prev,
        guest_name: "",
        guest_phone: "",
        guest_email: "",
        guest_address: "",
        guest_passport: "",
      }));
    }
  };

  const handlePackageChange = (packageId: string) => {
    const pkg = packages.find((p) => p.id === packageId);
    setForm((prev) => ({
      ...prev,
      package_id: packageId,
      selling_price_per_person: pkg ? Number(pkg.price) : prev.selling_price_per_person,
    }));
  };

  const handleTravelersChange = (num: number) => {
    setForm((prev) => ({
      ...prev,
      num_travelers: num,
    }));
  };

  const handleSubmit = async () => {
    if (!form.guest_name.trim()) { toast.error("Customer name is required"); return; }
    if (!form.guest_phone.trim()) { toast.error("Phone number is required"); return; }
    if (!form.package_id) { toast.error("Please select a package"); return; }
    if (form.total_amount <= 0) { toast.error("Total amount must be greater than 0"); return; }
    if (form.paid_amount < 0) { toast.error("Paid amount cannot be negative"); return; }
    if (form.paid_amount > form.total_amount) { toast.error("Paid amount cannot exceed total"); return; }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Not authenticated"); return; }

      let customerId: string | null = selectedCustomerId;
      const cleanPhone = form.guest_phone.trim().replace(/[^\d+]/g, "");

      // If no customer selected, try to find by phone or email, or auto-create profile
      if (!customerId) {
        const { data: byPhone } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("phone", cleanPhone)
          .maybeSingle();

        if (byPhone) {
          customerId = byPhone.user_id;
        } else if (form.guest_email.trim()) {
          const { data: byEmail } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("email", form.guest_email.trim().toLowerCase())
            .maybeSingle();
          if (byEmail) customerId = byEmail.user_id;
        }

        // Auto-create customer profile if no match found
        if (!customerId) {
          const newUserId = crypto.randomUUID();
          const { error: profileErr } = await supabase.from("profiles").insert({
            user_id: newUserId,
            full_name: form.guest_name.trim(),
            phone: cleanPhone,
            email: form.guest_email.trim().toLowerCase() || null,
            passport_number: form.guest_passport.trim() || null,
            address: form.guest_address.trim() || null,
            notes: "Auto-created from admin booking",
          });
          if (!profileErr) {
            customerId = newUserId;
          } else {
            console.error("Auto-create profile error:", profileErr);
          }
        }
      }

      // Create booking
      const { data: booking, error } = await supabase.from("bookings").insert({
        guest_name: form.guest_name.trim(),
        guest_phone: cleanPhone,
        guest_email: form.guest_email.trim() || null,
        guest_address: form.guest_address.trim() || null,
        guest_passport: form.guest_passport.trim() || null,
        package_id: form.package_id,
        num_travelers: form.num_travelers,
        selling_price_per_person: form.selling_price_per_person,
        total_amount: totalSellingPrice,
        paid_amount: form.paid_amount,
        due_amount: dueAmount,
        cost_price_per_person: form.cost_price_per_person || 0,
        total_cost: totalCost,
        extra_expense: form.extra_expense || 0,
        profit_amount: profitAmount,
        status: form.status,
        notes: form.notes.trim() || null,
        user_id: customerId,
        moallem_id: form.moallem_id || null,
        supplier_agent_id: form.supplier_agent_id || null,
      }).select("id, tracking_id").single();

      if (error) throw error;

      // If paid_amount > 0, create initial payment
      if (form.paid_amount > 0 && booking) {
        await supabase.from("payments").insert({
          booking_id: booking.id,
          user_id: customerId || session.user.id,
          customer_id: customerId,
          amount: form.paid_amount,
          status: "completed",
          payment_method: "manual",
          installment_number: 1,
          paid_at: new Date().toISOString(),
          notes: "Initial payment (admin booking)",
        });
      }

      toast.success(`Booking created! Tracking ID: ${booking?.tracking_id}`);
      navigate("/admin/bookings");
    } catch (err: any) {
      toast.error(err.message || "Failed to create booking");
    } finally {
      setLoading(false);
    }
  };

  const selectedPkg = packages.find((p) => p.id === form.package_id);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin/bookings")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="font-heading text-xl font-bold">নতুন বুকিং তৈরি করুন</h2>
      </div>

      {/* Customer Information */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
          <User className="h-4 w-4 text-primary" /> কাস্টমার তথ্য
        </h3>

        {/* Searchable Customer Selector */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1">কাস্টমার খুঁজুন (বিদ্যমান)</label>
          <CustomerSearchSelect onSelect={handleCustomerSelect} selectedId={selectedCustomerId} />
        </div>

        <div className="relative">
          <div className="absolute inset-x-0 top-1/2 border-t border-border/60" />
          <p className="relative text-center text-[10px] text-muted-foreground bg-card px-3 w-fit mx-auto">
            {selectedCustomerId ? "নির্বাচিত কাস্টমারের তথ্য" : "অথবা নতুন কাস্টমারের তথ্য দিন"}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">কাস্টমারের নাম *</label>
            <input className={inputClass} value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })}
              placeholder="পূর্ণ নাম" maxLength={100} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">ফোন নম্বর *</label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input className={`${inputClass} pl-9`} value={form.guest_phone}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm({ ...form, guest_phone: val });
                  if (phoneDebounceRef.current) clearTimeout(phoneDebounceRef.current);
                  phoneDebounceRef.current = setTimeout(() => checkPhoneMatch(val), 400);
                }}
                placeholder="+8801XXXXXXXXX" maxLength={15} />
            </div>
            {phoneSuggestion && !selectedCustomerId && (
              <button
                type="button"
                onClick={() => { handleCustomerSelect(phoneSuggestion); setPhoneSuggestion(null); }}
                className="mt-1.5 w-full flex items-center gap-2 bg-accent/60 border border-primary/20 rounded-md px-3 py-2 text-left hover:bg-accent transition-colors"
              >
                <User className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{phoneSuggestion.full_name || "—"} — {phoneSuggestion.phone}</p>
                  <p className="text-[10px] text-muted-foreground">এই কাস্টমার আগে থেকে আছে — ক্লিক করে সিলেক্ট করুন</p>
                </div>
              </button>
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">ইমেইল</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input className={`${inputClass} pl-9`} type="email" value={form.guest_email} onChange={(e) => setForm({ ...form, guest_email: e.target.value })}
                placeholder="email@example.com" maxLength={255} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">পাসপোর্ট নম্বর</label>
            <input className={inputClass} value={form.guest_passport} onChange={(e) => setForm({ ...form, guest_passport: e.target.value })}
              placeholder="পাসপোর্ট নম্বর" maxLength={20} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground block mb-1">ঠিকানা</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input className={`${inputClass} pl-9`} value={form.guest_address} onChange={(e) => setForm({ ...form, guest_address: e.target.value })}
                placeholder="পূর্ণ ঠিকানা" maxLength={300} />
            </div>
          </div>
        </div>
      </div>

      {/* Package & Travel */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" /> প্যাকেজ ও ভ্রমণ তথ্য
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground block mb-1">প্যাকেজ নির্বাচন *</label>
            <select className={inputClass} value={form.package_id} onChange={(e) => handlePackageChange(e.target.value)}>
              <option value="">-- প্যাকেজ বাছাই করুন --</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.type}) — ৳{Number(p.price).toLocaleString()} {p.duration_days ? `• ${p.duration_days} দিন` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">যাত্রী সংখ্যা *</label>
            <input className={inputClass} type="number" min={1} max={100} value={form.num_travelers}
              onChange={(e) => handleTravelersChange(Math.max(1, parseInt(e.target.value) || 1))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">ভ্রমণের তারিখ</label>
            <input className={inputClass} type="date" value={form.travel_date}
              onChange={(e) => setForm({ ...form, travel_date: e.target.value })} />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-muted-foreground block mb-1">মোয়াল্লেম (ঐচ্ছিক)</label>
          <select className={inputClass} value={form.moallem_id} onChange={(e) => setForm({ ...form, moallem_id: e.target.value })}>
            <option value="">-- মোয়াল্লেম নির্বাচন করুন --</option>
            {moallems.map((m) => (
              <option key={m.id} value={m.id}>{m.name} {m.phone ? `(${m.phone})` : ""}</option>
            ))}
          </select>
        </div>
        {/* Supplier Agent */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground block mb-1">সাপ্লায়ার এজেন্ট (ঐচ্ছিক)</label>
            <select className={inputClass} value={form.supplier_agent_id} onChange={(e) => setForm({ ...form, supplier_agent_id: e.target.value })}>
              <option value="">-- সাপ্লায়ার নির্বাচন করুন --</option>
              {supplierAgents.map((a) => (
                <option key={a.id} value={a.id}>{a.agent_name} {a.company_name ? `(${a.company_name})` : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">প্রতি ব্যক্তি খরচ (৳)</label>
            <input className={inputClass} type="number" min={0} value={form.cost_price_per_person}
              onChange={(e) => setForm(f => ({ ...f, cost_price_per_person: Math.max(0, parseFloat(e.target.value) || 0) }))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">মোট খরচ (৳) — স্বয়ংক্রিয়</label>
            <div className={`${inputClass} bg-muted/50 font-bold text-foreground`}>
              ৳{totalCost.toLocaleString()}
            </div>
          </div>
        </div>
        {totalCost > 0 && form.total_amount > 0 && (
          <div className="bg-secondary/50 rounded-lg p-3 text-xs text-muted-foreground">
            খরচ: ৳{form.cost_price_per_person.toLocaleString()} × {form.num_travelers} জন = ৳{totalCost.toLocaleString()} | 
            আনুমানিক লাভ: <span className={`font-bold ${form.total_amount - totalCost >= 0 ? "text-primary" : "text-destructive"}`}>৳{(form.total_amount - totalCost).toLocaleString()}</span>
          </div>
        )}
        {selectedPkg && (
          <div className="bg-secondary/50 rounded-lg p-3 text-xs text-muted-foreground">
            প্যাকেজ মূল্য: ৳{Number(selectedPkg.price).toLocaleString()} × {form.num_travelers} জন = <span className="font-bold text-foreground">৳{(Number(selectedPkg.price) * form.num_travelers).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Pricing & Profit */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" /> মূল্য ও লাভ
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">প্রতি ব্যক্তি বিক্রয় মূল্য (৳) *</label>
            <input className={inputClass} type="number" min={0} value={form.selling_price_per_person}
              onChange={(e) => setForm(f => ({ ...f, selling_price_per_person: Math.max(0, parseFloat(e.target.value) || 0) }))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">মোট বিক্রয় মূল্য (৳) — স্বয়ংক্রিয়</label>
            <div className={`${inputClass} bg-muted/50 font-bold text-foreground`}>
              ৳{totalSellingPrice.toLocaleString()}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">অতিরিক্ত খরচ (৳)</label>
            <input className={inputClass} type="number" min={0} value={form.extra_expense}
              onChange={(e) => setForm(f => ({ ...f, extra_expense: Math.max(0, parseFloat(e.target.value) || 0) }))} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">পরিশোধিত (৳)</label>
            <input className={inputClass} type="number" min={0} max={totalSellingPrice} value={form.paid_amount}
              onChange={(e) => setForm(f => ({ ...f, paid_amount: Math.min(Math.max(0, parseFloat(e.target.value) || 0), totalSellingPrice || Infinity) }))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">বকেয়া (৳)</label>
            <div className={`${inputClass} bg-muted/50 font-bold ${dueAmount > 0 ? "text-destructive" : "text-emerald"}`}>
              ৳{dueAmount.toLocaleString()}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">লাভ (৳) — স্বয়ংক্রিয়</label>
            <div className={`${inputClass} bg-muted/50 font-bold ${profitAmount >= 0 ? "text-emerald" : "text-destructive"}`}>
              ৳{profitAmount.toLocaleString()}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">বুকিং স্ট্যাটাস</label>
            <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">নোট</label>
            <input className={inputClass} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="অতিরিক্ত তথ্য..." maxLength={500} />
          </div>
        </div>
      </div>

      {/* Live Summary */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
        <h3 className="font-heading font-semibold text-sm mb-3">সারসংক্ষেপ</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">কাস্টমার</p>
            <p className="font-medium">{form.guest_name || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">প্যাকেজ</p>
            <p className="font-medium">{selectedPkg?.name || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">বিক্রয় মূল্য</p>
            <p className="font-heading font-bold text-foreground">৳{totalSellingPrice.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">ক্রয় মূল্য</p>
            <p className="font-heading font-bold text-foreground">৳{totalCost.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">অতিরিক্ত খরচ</p>
            <p className="font-heading font-bold text-foreground">৳{form.extra_expense.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">পরিশোধিত</p>
            <p className="font-heading font-bold text-emerald">৳{form.paid_amount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">বকেয়া</p>
            <p className={`font-heading font-bold ${dueAmount > 0 ? "text-destructive" : "text-emerald"}`}>৳{dueAmount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">লাভ</p>
            <p className={`font-heading font-bold ${profitAmount >= 0 ? "text-emerald" : "text-destructive"}`}>৳{profitAmount.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <button onClick={() => navigate("/admin/bookings")}
          className="px-5 py-2.5 text-sm rounded-md bg-secondary text-foreground hover:bg-muted transition-colors">
          বাতিল
        </button>
        <button onClick={handleSubmit} disabled={loading}
          className="px-5 py-2.5 text-sm rounded-md bg-gradient-gold text-primary-foreground font-semibold hover:opacity-90 transition-opacity shadow-gold disabled:opacity-50 flex items-center gap-2">
          <Save className="h-4 w-4" />
          {loading ? "তৈরি হচ্ছে..." : "বুকিং তৈরি করুন"}
        </button>
      </div>
    </div>
  );
}
