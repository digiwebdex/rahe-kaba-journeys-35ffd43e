import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Printer, DollarSign, TrendingUp, TrendingDown, Clock, Download,
  FileText, Hotel, Package, CreditCard, Eye
} from "lucide-react";
import { generateInvoice, generateReceipt, CompanyInfo, InvoicePayment } from "@/lib/invoiceGenerator";
import { toast } from "sonner";

interface CustomerFinancialReportProps {
  customer: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CustomerFinancialReport({ customer, open, onOpenChange }: CustomerFinancialReportProps) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [hotelBookings, setHotelBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  const getCompanyInfo = async (): Promise<CompanyInfo> => {
    const { data: cms } = await supabase.from("site_content" as any).select("content").eq("section_key", "contact").maybeSingle();
    const c = (cms as any)?.content || {};
    return { name: "RAHE KABA", phone: c.phone || "", email: c.email || "", address: c.location || "" };
  };

  const handleInvoice = async (b: any) => {
    setGeneratingPdf(b.id);
    try {
      const bPayments = payments.filter((p) => p.booking_id === b.id);
      const company = await getCompanyInfo();
      await generateInvoice(b, customer, bPayments as InvoicePayment[], company);
      toast.success("Invoice downloaded");
    } catch { toast.error("Failed"); }
    setGeneratingPdf(null);
  };

  const handleReceipt = async (p: any) => {
    setGeneratingPdf(p.id);
    try {
      const booking = bookings.find((b) => b.id === p.booking_id);
      const allBPayments = payments.filter((pm) => pm.booking_id === p.booking_id);
      const company = await getCompanyInfo();
      await generateReceipt(p as InvoicePayment, booking || {}, customer, company, allBPayments as InvoicePayment[]);
      toast.success("Receipt downloaded");
    } catch { toast.error("Failed"); }
    setGeneratingPdf(null);
  };

  const handleViewDocument = async (doc: any) => {
    try {
      const { data } = await supabase.storage.from("booking-documents").createSignedUrl(doc.file_path, 300);
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
      else toast.error("Could not generate URL");
    } catch { toast.error("Failed to open document"); }
  };

  useEffect(() => {
    if (!open || !customer) return;
    setLoading(true);

    const fetchData = async () => {
      const [bksRes, pmtsRes, docsRes, hotelRes] = await Promise.all([
        supabase.from("bookings").select("*, packages(name, type, price, duration_days, start_date)").eq("user_id", customer.user_id),
        supabase.from("payments").select("*, bookings(tracking_id)").eq("user_id", customer.user_id).order("due_date", { ascending: true }),
        supabase.from("booking_documents").select("*").eq("user_id", customer.user_id).order("created_at", { ascending: false }),
        supabase.from("hotel_bookings").select("*, hotels(name, city, location), hotel_rooms(name, price_per_night)").eq("user_id", customer.user_id).order("created_at", { ascending: false }),
      ]);

      const bookingsList = bksRes.data || [];
      setBookings(bookingsList);
      setPayments(pmtsRes.data || []);
      setDocuments(docsRes.data || []);
      setHotelBookings(hotelRes.data || []);

      const bookingIds = bookingsList.map((b) => b.id);
      if (bookingIds.length > 0) {
        const { data: txns } = await supabase.from("transactions").select("*").eq("type", "expense").in("booking_id", bookingIds);
        setExpenses(txns || []);
      } else {
        setExpenses([]);
      }

      setLoading(false);
    };

    fetchData();
  }, [open, customer]);

  const summary = useMemo(() => {
    const totalRevenue = payments.filter((p) => p.status === "completed").reduce((s, p) => s + Number(p.amount), 0);
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const totalDue = payments.filter((p) => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0);
    return { totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses, totalDue };
  }, [payments, expenses]);

  const fmt = (n: number) => `৳${n.toLocaleString()}`;

  const DOC_TYPE_LABELS: Record<string, string> = {
    passport_copy: "Passport Copy", nid_copy: "NID Copy", photo: "Photo",
    visa_copy: "Visa Copy", ticket_copy: "Ticket Copy", other: "Other",
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print-report-content">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {customer.full_name || "Unnamed Customer"}
          </DialogTitle>
          <DialogDescription>Complete customer profile and financial overview.</DialogDescription>
        </DialogHeader>

        {/* Customer Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><span className="text-muted-foreground">Phone</span><p className="font-medium">{customer.phone || "N/A"}</p></div>
          <div><span className="text-muted-foreground">Passport</span><p className="font-medium">{customer.passport_number || "N/A"}</p></div>
          <div><span className="text-muted-foreground">Address</span><p className="font-medium">{customer.address || "N/A"}</p></div>
          <div><span className="text-muted-foreground">Joined</span><p className="font-medium">{new Date(customer.created_at).toLocaleDateString()}</p></div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-emerald-500" />
            <div><p className="text-xs text-muted-foreground">Paid</p><p className="font-semibold text-sm">{fmt(summary.totalRevenue)}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <TrendingDown className="h-5 w-5 text-destructive" />
            <div><p className="text-xs text-muted-foreground">Expenses</p><p className="font-semibold text-sm">{fmt(summary.totalExpenses)}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-primary" />
            <div><p className="text-xs text-muted-foreground">Profit</p><p className={`font-semibold text-sm ${summary.netProfit < 0 ? "text-destructive" : ""}`}>{fmt(summary.netProfit)}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-yellow-500" />
            <div><p className="text-xs text-muted-foreground">Due</p><p className="font-semibold text-sm">{fmt(summary.totalDue)}</p></div>
          </CardContent></Card>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        ) : (
          <Tabs defaultValue="bookings" className="w-full">
            <TabsList className="w-full grid grid-cols-5">
              <TabsTrigger value="bookings" className="text-xs gap-1"><Package className="h-3 w-3" /> Bookings</TabsTrigger>
              <TabsTrigger value="payments" className="text-xs gap-1"><CreditCard className="h-3 w-3" /> Payments</TabsTrigger>
              <TabsTrigger value="hotels" className="text-xs gap-1"><Hotel className="h-3 w-3" /> Hotels</TabsTrigger>
              <TabsTrigger value="documents" className="text-xs gap-1"><FileText className="h-3 w-3" /> Documents</TabsTrigger>
              <TabsTrigger value="expenses" className="text-xs gap-1"><TrendingDown className="h-3 w-3" /> Expenses</TabsTrigger>
            </TabsList>

            {/* Bookings Tab */}
            <TabsContent value="bookings">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Tracking ID</TableHead><TableHead>Package</TableHead><TableHead>Start Date</TableHead>
                  <TableHead>Travelers</TableHead><TableHead>Total</TableHead><TableHead>Paid</TableHead>
                  <TableHead>Due</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {bookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs">{b.tracking_id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{(b.packages as any)?.name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{(b.packages as any)?.type} • {(b.packages as any)?.duration_days || "—"} days</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{(b.packages as any)?.start_date ? new Date((b.packages as any).start_date).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>{b.num_travelers}</TableCell>
                      <TableCell>{fmt(Number(b.total_amount))}</TableCell>
                      <TableCell>{fmt(Number(b.paid_amount))}</TableCell>
                      <TableCell className="text-destructive font-medium">{fmt(Number(b.due_amount || 0))}</TableCell>
                      <TableCell><Badge variant={b.status === "completed" ? "default" : "secondary"}>{b.status}</Badge></TableCell>
                      <TableCell>
                        <button onClick={() => handleInvoice(b)} disabled={generatingPdf === b.id} className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50">
                          <Download className="h-3 w-3" />{generatingPdf === b.id ? "..." : "Invoice"}
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {bookings.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No bookings</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Booking</TableHead><TableHead>Installment</TableHead><TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead><TableHead>Status</TableHead><TableHead>Paid Date</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{(p.bookings as any)?.tracking_id || "—"}</TableCell>
                      <TableCell>{p.installment_number || "—"}</TableCell>
                      <TableCell>{fmt(Number(p.amount))}</TableCell>
                      <TableCell>{p.due_date ? new Date(p.due_date).toLocaleDateString() : "—"}</TableCell>
                      <TableCell><Badge variant={p.status === "completed" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                      <TableCell>{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>
                        {p.status === "completed" && (
                          <button onClick={() => handleReceipt(p)} disabled={generatingPdf === p.id} className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50">
                            <Download className="h-3 w-3" />{generatingPdf === p.id ? "..." : "Receipt"}
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {payments.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No payments</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Hotels Tab */}
            <TabsContent value="hotels">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Hotel</TableHead><TableHead>Room</TableHead><TableHead>City</TableHead>
                  <TableHead>Check In</TableHead><TableHead>Check Out</TableHead><TableHead>Guests</TableHead>
                  <TableHead>Total</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {hotelBookings.map((hb) => (
                    <TableRow key={hb.id}>
                      <TableCell className="font-medium text-sm">{(hb.hotels as any)?.name || "—"}</TableCell>
                      <TableCell className="text-sm">{(hb.hotel_rooms as any)?.name || "—"}</TableCell>
                      <TableCell className="text-sm">{(hb.hotels as any)?.city || "—"}</TableCell>
                      <TableCell className="text-xs">{new Date(hb.check_in).toLocaleDateString()}</TableCell>
                      <TableCell className="text-xs">{new Date(hb.check_out).toLocaleDateString()}</TableCell>
                      <TableCell>{hb.guests}</TableCell>
                      <TableCell>{fmt(Number(hb.total_price))}</TableCell>
                      <TableCell><Badge variant={hb.status === "confirmed" ? "default" : "secondary"}>{hb.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {hotelBookings.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No hotel bookings</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Document Type</TableHead><TableHead>File Name</TableHead>
                  <TableHead>Uploaded</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <Badge variant="outline">{DOC_TYPE_LABELS[doc.document_type] || doc.document_type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{doc.file_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <button onClick={() => handleViewDocument(doc)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <Eye className="h-3 w-3" /> View
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {documents.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No documents uploaded</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Expenses Tab */}
            <TabsContent value="expenses">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Title</TableHead><TableHead>Category</TableHead><TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead><TableHead>Linked Booking</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {expenses.map((e) => {
                    const linkedBooking = bookings.find((b) => b.id === e.booking_id);
                    return (
                      <TableRow key={e.id}>
                        <TableCell>{e.note || e.category}</TableCell>
                        <TableCell>{e.category}</TableCell>
                        <TableCell>{fmt(Number(e.amount))}</TableCell>
                        <TableCell>{new Date(e.date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-mono text-xs">{linkedBooking?.tracking_id || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                  {expenses.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No expenses</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        )}

        {/* Print Button */}
        <div className="flex justify-end print-hide">
          <Button onClick={() => window.print()} variant="outline" className="gap-2">
            <Printer className="h-4 w-4" /> Print Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
