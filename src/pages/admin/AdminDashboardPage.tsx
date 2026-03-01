import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminDashboardCharts from "@/components/AdminDashboardCharts";

export default function AdminDashboardPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [bk, py, ex, ac] = await Promise.all([
      supabase.from("bookings").select("*, packages(name, type)").order("created_at", { ascending: false }),
      supabase.from("payments").select("*, bookings(tracking_id)").order("created_at", { ascending: false }),
      supabase.from("expenses").select("*").order("date", { ascending: false }),
      supabase.from("accounts" as any).select("*"),
    ]);
    setBookings(bk.data || []);
    setPayments(py.data || []);
    setExpenses(ex.data || []);
    setAccounts((ac.data as any[]) || []);
  };

  const markPaymentCompleted = async (paymentId: string) => {
    const { error } = await supabase.from("payments").update({ status: "completed", paid_at: new Date().toISOString() }).eq("id", paymentId);
    if (error) return;
    fetchData();
  };

  return <AdminDashboardCharts bookings={bookings} payments={payments} expenses={expenses} accounts={accounts} onMarkPaid={markPaymentCompleted} />;
}
