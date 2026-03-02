import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { generateInvoice, generateReceipt, CompanyInfo, InvoicePayment } from "@/lib/invoiceGenerator";
import { Printer, Download, Search } from "lucide-react";

const fmt = (n: number) => `৳${Number(n || 0).toLocaleString()}`;
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function InvoicePage() {
  const [searchParams] = useSearchParams();
  const [trackingId, setTrackingId] = useState(searchParams.get("id") || "");
  const [booking, setBooking] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  const company: CompanyInfo = {
    name: "RAHE KABA Tours & Travels",
    phone: "+880 1601-505050",
    email: "rahekaba.info@gmail.com",
    address: "Dailorbagh Palli Bidyut Adjacent, Sonargaon Thana Road, Narayanganj-Dhaka",
  };
  const companyAddressBn = "দৈলরবাগ পল্লী বিদ্যুৎ সংলগ্ন, সোনারগাঁও থানা রোড, নারায়ণগঞ্জ-ঢাকা";

  const search = async () => {
    if (!trackingId.trim()) return;
    setLoading(true);
    setError("");
    setBooking(null);

    const { data: bk, error: bkErr } = await supabase
      .from("bookings")
      .select("*, packages(name, type, duration_days)")
      .eq("tracking_id", trackingId.trim().toUpperCase())
      .single();

    if (bkErr || !bk) {
      setError("বুকিং পাওয়া যায়নি। ট্র্যাকিং আইডি চেক করুন।");
      setLoading(false);
      return;
    }

    const [payRes, profRes] = await Promise.all([
      supabase.from("payments").select("*").eq("booking_id", bk.id).order("installment_number"),
      bk.user_id ? supabase.from("profiles").select("full_name, phone, passport_number, address").eq("user_id", bk.user_id).single() : Promise.resolve({ data: null }),
    ]);

    setBooking(bk);
    setPayments(payRes.data || []);
    setCustomer(profRes.data || { full_name: bk.guest_name, phone: bk.guest_phone, passport_number: bk.guest_passport, address: bk.guest_address });
    setLoading(false);
  };

  useEffect(() => {
    if (trackingId) search();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadInvoice = () => {
    if (!booking || !customer) return;
    generateInvoice(booking, customer, payments as InvoicePayment[], company);
  };

  const handleDownloadReceipt = (payment: any) => {
    if (!booking || !customer) return;
    generateReceipt(payment, booking, customer, company, payments as InvoicePayment[]);
  };

  const totalPaid = payments.filter(p => p.status === "completed").reduce((s, p) => s + Number(p.amount), 0);
  const totalDue = Number(booking?.total_amount || 0) - totalPaid;

  return (
    <div className="min-h-screen bg-background">
      {/* Search bar - hidden on print */}
      <div className="print:hidden bg-card border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex gap-3 items-center">
          <input
            className="flex-1 bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="ট্র্যাকিং আইডি লিখুন (e.g. RK-XXXXXXXX)"
            value={trackingId}
            onChange={e => setTrackingId(e.target.value)}
            onKeyDown={e => e.key === "Enter" && search()}
          />
          <button onClick={search} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90">
            <Search className="h-4 w-4" /> খুঁজুন
          </button>
        </div>
      </div>

      {error && <p className="text-center text-destructive py-8 print:hidden">{error}</p>}
      {loading && <p className="text-center text-muted-foreground py-8 print:hidden">লোড হচ্ছে...</p>}

      {booking && customer && (
        <>
          {/* Action buttons - hidden on print */}
          <div className="print:hidden max-w-4xl mx-auto p-4 flex gap-3">
            <button onClick={handlePrint} className="flex items-center gap-2 bg-secondary border border-border px-4 py-2 rounded-lg text-sm hover:bg-secondary/80">
              <Printer className="h-4 w-4" /> প্রিন্ট
            </button>
            <button onClick={handleDownloadInvoice} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm hover:bg-primary/90">
              <Download className="h-4 w-4" /> ইনভয়েস ডাউনলোড
            </button>
          </div>

          {/* Printable Invoice - A4 format */}
          <div ref={printRef} className="max-w-4xl mx-auto bg-white text-black p-8 print:p-6 print:m-0 print:max-w-none" style={{ fontFamily: "Arial, sans-serif" }}>
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-gray-800 pb-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
                <p className="text-sm text-gray-600">Hajj & Umrah Services</p>
                <p className="text-xs text-gray-500 mt-1">{company.phone} | {company.email}</p>
                <p className="text-xs text-gray-500" style={{ fontFamily: "'Noto Sans Bengali', Arial, sans-serif" }}>{companyAddressBn}</p>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold text-gray-800">INVOICE</h2>
                <p className="text-sm text-gray-600">#{booking.tracking_id}</p>
                <p className="text-sm text-gray-600">{fmtDate(new Date().toISOString())}</p>
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-bold text-sm text-gray-700 mb-2">Bill To:</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p><span className="text-gray-500">Name:</span> {customer.full_name || booking.guest_name || "N/A"}</p>
                <p><span className="text-gray-500">Phone:</span> {customer.phone || booking.guest_phone || "N/A"}</p>
                <p><span className="text-gray-500">Passport:</span> {customer.passport_number || booking.guest_passport || "N/A"}</p>
                <p><span className="text-gray-500">Address:</span> {customer.address || booking.guest_address || "N/A"}</p>
              </div>
            </div>

            {/* Package Info */}
            <div className="mb-6">
              <h3 className="font-bold text-sm text-gray-700 mb-2">Package Details</h3>
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div className="bg-gray-50 p-2 rounded"><span className="text-gray-500 block text-xs">Package</span>{booking.packages?.name || "N/A"}</div>
                <div className="bg-gray-50 p-2 rounded"><span className="text-gray-500 block text-xs">Type</span>{booking.packages?.type || "N/A"}</div>
                <div className="bg-gray-50 p-2 rounded"><span className="text-gray-500 block text-xs">Duration</span>{booking.packages?.duration_days ? `${booking.packages.duration_days} Days` : "N/A"}</div>
                <div className="bg-gray-50 p-2 rounded"><span className="text-gray-500 block text-xs">Travelers</span>{booking.num_travelers}</div>
              </div>
            </div>

            {/* Payment Schedule */}
            <div className="mb-6">
              <h3 className="font-bold text-sm text-gray-700 mb-2">Payment Schedule</h3>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-right">Amount</th>
                    <th className="p-2 text-center">Due Date</th>
                    <th className="p-2 text-center">Status</th>
                    <th className="p-2 text-center">Paid Date</th>
                    <th className="p-2 text-center">Method</th>
                    <th className="p-2 text-center print:hidden">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, i) => (
                    <tr key={p.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="p-2 border-b border-gray-200">{p.installment_number || "—"}</td>
                      <td className="p-2 border-b border-gray-200 text-right font-medium">৳{Number(p.amount).toLocaleString()}</td>
                      <td className="p-2 border-b border-gray-200 text-center">{fmtDate(p.due_date)}</td>
                      <td className="p-2 border-b border-gray-200 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {p.status === "completed" ? "Paid" : "Pending"}
                        </span>
                      </td>
                      <td className="p-2 border-b border-gray-200 text-center">{fmtDate(p.paid_at)}</td>
                      <td className="p-2 border-b border-gray-200 text-center capitalize">{p.payment_method || "—"}</td>
                      <td className="p-2 border-b border-gray-200 text-center print:hidden">
                        {p.status === "completed" && (
                          <button onClick={() => handleDownloadReceipt(p)} className="text-blue-600 hover:underline text-xs">PDF</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr><td colSpan={7} className="p-4 text-center text-gray-400">No payments recorded</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="bg-gray-800 text-white rounded-lg p-4 flex justify-between items-center mb-8">
              <div><span className="text-gray-300 text-xs">Total Amount</span><p className="text-lg font-bold">৳{Number(booking.total_amount).toLocaleString()}</p></div>
              <div><span className="text-gray-300 text-xs">Total Paid</span><p className="text-lg font-bold text-green-400">৳{totalPaid.toLocaleString()}</p></div>
              <div><span className="text-gray-300 text-xs">Balance Due</span><p className="text-lg font-bold text-red-400">৳{Math.max(0, totalDue).toLocaleString()}</p></div>
            </div>

            {/* Signature Section */}
            <div className="flex justify-between mt-16 pt-4">
              <div className="text-center">
                <div className="border-t border-gray-400 w-48 mb-1"></div>
                <p className="text-xs text-gray-500">Customer Signature</p>
              </div>
              <div className="text-center">
                <div className="border-t border-gray-400 w-48 mb-1"></div>
                <p className="text-xs text-gray-500">Authorized Signature</p>
                <p className="text-[10px] text-gray-400 mt-1">Company Seal</p>
              </div>
            </div>

            {/* Footer */}
            <p className="text-center text-[10px] text-gray-400 mt-8 italic">
              This is a computer-generated document. For queries: {company.phone} | {company.email}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
