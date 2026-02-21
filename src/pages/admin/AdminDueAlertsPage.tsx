import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Clock, MessageSquare, Phone, CheckCircle, Send } from "lucide-react";
import { differenceInDays, format } from "date-fns";

interface PaymentRow {
  id: string;
  amount: number;
  due_date: string;
  installment_number: number | null;
  status: string;
  booking_id: string;
  user_id: string;
  bookings: {
    tracking_id: string;
    user_id: string;
    packages: { name: string } | null;
  } | null;
}

interface Profile {
  user_id: string;
  full_name: string | null;
  phone: string | null;
}

export default function AdminDueAlertsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [paymentsRes, profilesRes] = await Promise.all([
      supabase
        .from("payments")
        .select("*, bookings(tracking_id, user_id, packages(name))")
        .eq("status", "pending")
        .not("due_date", "is", null)
        .order("due_date", { ascending: true }),
      supabase.from("profiles").select("user_id, full_name, phone"),
    ]);
    setPayments((paymentsRes.data as any[]) || []);
    setProfiles((profilesRes.data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const profileMap = useMemo(() => {
    const map: Record<string, Profile> = {};
    profiles.forEach((p) => { map[p.user_id] = p; });
    return map;
  }, [profiles]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = useMemo(
    () => payments.filter((p) => new Date(p.due_date) < today).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()),
    [payments]
  );

  const upcoming = useMemo(
    () => payments.filter((p) => {
      const d = new Date(p.due_date);
      return d >= today && differenceInDays(d, today) <= 30;
    }).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()),
    [payments]
  );

  const overdueTotal = overdue.reduce((s, p) => s + Number(p.amount), 0);
  const upcomingTotal = upcoming.reduce((s, p) => s + Number(p.amount), 0);

  const getProfile = (p: PaymentRow) => profileMap[p.bookings?.user_id || p.user_id];

  const markPaid = async (id: string) => {
    const { error } = await supabase.from("payments").update({ status: "completed", paid_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Payment marked as completed");
    fetchData();
  };

  const buildMessage = (p: PaymentRow) => {
    const profile = getProfile(p);
    const name = profile?.full_name || "Customer";
    const trackingId = p.bookings?.tracking_id || "N/A";
    return `Dear ${name}, your installment #${p.installment_number || 1} of ৳${Number(p.amount).toLocaleString()} for booking ${trackingId} is due on ${format(new Date(p.due_date), "dd MMM yyyy")}. Please make your payment at the earliest. Thank you!`;
  };

  const sendWhatsApp = (p: PaymentRow) => {
    const profile = getProfile(p);
    const phone = profile?.phone?.replace(/[^0-9]/g, "") || "";
    if (!phone) { toast.error("No phone number found"); return; }
    const msg = encodeURIComponent(buildMessage(p));
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const sendSms = async (p: PaymentRow) => {
    const profile = getProfile(p);
    const phone = profile?.phone;
    if (!phone) { toast.error("No phone number found"); return; }
    setSendingId(p.id);
    try {
      const { data, error } = await supabase.functions.invoke("send-notification", {
        body: {
          type: "payment_reminder",
          channels: ["sms"],
          user_id: p.bookings?.user_id || p.user_id,
          booking_id: p.booking_id,
          payment_id: p.id,
          amount: Number(p.amount),
          due_date: format(new Date(p.due_date), "dd MMM yyyy"),
          installment_number: p.installment_number || 1,
        },
      });
      if (error) throw error;
      toast.success("SMS reminder sent");
    } catch (err: any) {
      toast.error(err.message || "Failed to send SMS");
    } finally {
      setSendingId(null);
    }
  };

  const sendEmailReminder = async (p: PaymentRow) => {
    setSendingId(p.id);
    try {
      const { data, error } = await supabase.functions.invoke("send-notification", {
        body: {
          type: "payment_reminder",
          channels: ["email"],
          user_id: p.bookings?.user_id || p.user_id,
          booking_id: p.booking_id,
          payment_id: p.id,
          amount: Number(p.amount),
          due_date: format(new Date(p.due_date), "dd MMM yyyy"),
          installment_number: p.installment_number || 1,
        },
      });
      if (error) throw error;
      toast.success("Email reminder sent");
    } catch (err: any) {
      toast.error(err.message || "Failed to send email");
    } finally {
      setSendingId(null);
    }
  };

  const renderRow = (p: PaymentRow, type: "overdue" | "upcoming") => {
    const profile = getProfile(p);
    const dueDate = new Date(p.due_date);
    const days = Math.abs(differenceInDays(dueDate, today));

    return (
      <TableRow key={p.id}>
        <TableCell className="font-mono text-xs">{p.bookings?.tracking_id || "—"}</TableCell>
        <TableCell>{profile?.full_name || "—"}</TableCell>
        <TableCell className="text-xs">{profile?.phone || "—"}</TableCell>
        <TableCell className="text-center">{p.installment_number || "—"}</TableCell>
        <TableCell className="font-medium">৳{Number(p.amount).toLocaleString()}</TableCell>
        <TableCell>{format(dueDate, "dd MMM yyyy")}</TableCell>
        <TableCell>
          <Badge variant={type === "overdue" ? "destructive" : "secondary"}>
            {days} {type === "overdue" ? "days overdue" : "days left"}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => sendSms(p)} disabled={sendingId === p.id}>
              <Phone className="h-3 w-3" /> SMS
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => sendEmailReminder(p)} disabled={sendingId === p.id}>
              <Send className="h-3 w-3" /> Email
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => sendWhatsApp(p)}>
              <MessageSquare className="h-3 w-3" /> WhatsApp
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => markPaid(p.id)}>
              <CheckCircle className="h-3 w-3" /> Paid
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  if (loading) return <div className="flex justify-center py-12 text-muted-foreground">Loading...</div>;

  return (
    <div>
      <h2 className="font-heading text-xl font-bold mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-destructive" /> Due Alerts
      </h2>

      <Tabs defaultValue="overdue">
        <TabsList>
          <TabsTrigger value="overdue" className="gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Overdue ({overdue.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Upcoming ({upcoming.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overdue">
          <Card className="mb-4">
            <CardContent className="py-4 flex gap-6">
              <div><span className="text-sm text-muted-foreground">Overdue Payments</span><p className="text-2xl font-bold text-destructive">{overdue.length}</p></div>
              <div><span className="text-sm text-muted-foreground">Total Amount</span><p className="text-2xl font-bold">৳{overdueTotal.toLocaleString()}</p></div>
            </CardContent>
          </Card>
          {overdue.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No overdue payments 🎉</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tracking ID</TableHead><TableHead>Customer</TableHead><TableHead>Phone</TableHead>
                    <TableHead className="text-center">#</TableHead><TableHead>Amount</TableHead><TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead><TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{overdue.map((p) => renderRow(p, "overdue"))}</TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="upcoming">
          <Card className="mb-4">
            <CardContent className="py-4 flex gap-6">
              <div><span className="text-sm text-muted-foreground">Upcoming (30 days)</span><p className="text-2xl font-bold text-primary">{upcoming.length}</p></div>
              <div><span className="text-sm text-muted-foreground">Total Amount</span><p className="text-2xl font-bold">৳{upcomingTotal.toLocaleString()}</p></div>
            </CardContent>
          </Card>
          {upcoming.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No upcoming payments in the next 30 days.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tracking ID</TableHead><TableHead>Customer</TableHead><TableHead>Phone</TableHead>
                    <TableHead className="text-center">#</TableHead><TableHead>Amount</TableHead><TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead><TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{upcoming.map((p) => renderRow(p, "upcoming"))}</TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
