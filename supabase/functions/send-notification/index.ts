import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type NotificationType =
  | "booking_created"
  | "booking_confirmed"
  | "booking_completed"
  | "payment_received"
  | "payment_reminder"
  | "custom";

interface NotificationRequest {
  type: NotificationType;
  channels: ("email" | "sms")[];
  // Target
  user_id: string;
  booking_id?: string;
  payment_id?: string;
  // For custom / override
  custom_subject?: string;
  custom_message?: string;
  // For payment_reminder
  amount?: number;
  due_date?: string;
  installment_number?: number;
}

// --- Email templates ---
function getEmailTemplate(
  type: NotificationType,
  data: {
    name: string;
    trackingId: string;
    packageName: string;
    totalAmount: number;
    paidAmount: number;
    dueAmount: number;
    amount?: number;
    dueDate?: string;
    installmentNumber?: number;
    customSubject?: string;
    customMessage?: string;
  }
) {
  const header = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9;border-radius:8px">`;
  const footer = `<hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0"/><p style="font-size:12px;color:#888">Rahe Kaba — Your trusted Hajj & Umrah partner</p></div>`;

  switch (type) {
    case "booking_created":
      return {
        subject: `📋 Booking Created — ${data.trackingId}`,
        html: `${header}
          <h2 style="color:#b8860b">Booking Created</h2>
          <p>Dear <strong>${data.name}</strong>,</p>
          <p>Your booking for <strong>${data.packageName}</strong> has been successfully created.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Tracking ID</td><td style="padding:8px;border:1px solid #ddd">${data.trackingId}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Package</td><td style="padding:8px;border:1px solid #ddd">${data.packageName}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Total Amount</td><td style="padding:8px;border:1px solid #ddd">৳${data.totalAmount.toLocaleString()}</td></tr>
          </table>
          <p>We'll keep you updated on your booking status. Thank you for choosing Rahe Kaba!</p>
          ${footer}`,
      };

    case "booking_confirmed":
      return {
        subject: `✅ Booking Confirmed — ${data.trackingId}`,
        html: `${header}
          <h2 style="color:#1a7f37">Booking Confirmed</h2>
          <p>Dear <strong>${data.name}</strong>,</p>
          <p>Your booking <strong>${data.trackingId}</strong> for <strong>${data.packageName}</strong> has been confirmed.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Tracking ID</td><td style="padding:8px;border:1px solid #ddd">${data.trackingId}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Total</td><td style="padding:8px;border:1px solid #ddd">৳${data.totalAmount.toLocaleString()}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Paid</td><td style="padding:8px;border:1px solid #ddd">৳${data.paidAmount.toLocaleString()}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Due</td><td style="padding:8px;border:1px solid #ddd">৳${data.dueAmount.toLocaleString()}</td></tr>
          </table>
          <p>Please ensure timely payments for remaining balance. Thank you!</p>
          ${footer}`,
      };

    case "booking_completed":
      return {
        subject: `🎉 Booking Completed — ${data.trackingId}`,
        html: `${header}
          <h2 style="color:#1a7f37">Payment Completed ✅</h2>
          <p>Dear <strong>${data.name}</strong>,</p>
          <p>Your booking <strong>${data.trackingId}</strong> for <strong>${data.packageName}</strong> is fully paid!</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Tracking ID</td><td style="padding:8px;border:1px solid #ddd">${data.trackingId}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Total Paid</td><td style="padding:8px;border:1px solid #ddd">৳${data.totalAmount.toLocaleString()}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Status</td><td style="padding:8px;border:1px solid #ddd;color:#1a7f37">Completed</td></tr>
          </table>
          <p>Thank you for choosing Rahe Kaba. We look forward to serving you!</p>
          ${footer}`,
      };

    case "payment_received":
      return {
        subject: `💰 Payment Received — ${data.trackingId}`,
        html: `${header}
          <h2 style="color:#b8860b">Payment Received</h2>
          <p>Dear <strong>${data.name}</strong>,</p>
          <p>We've received your payment of <strong>৳${(data.amount || 0).toLocaleString()}</strong> for booking <strong>${data.trackingId}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Amount Paid</td><td style="padding:8px;border:1px solid #ddd">৳${(data.amount || 0).toLocaleString()}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Total Paid</td><td style="padding:8px;border:1px solid #ddd">৳${data.paidAmount.toLocaleString()}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Remaining</td><td style="padding:8px;border:1px solid #ddd">৳${data.dueAmount.toLocaleString()}</td></tr>
          </table>
          <p>Thank you for your payment!</p>
          ${footer}`,
      };

    case "payment_reminder":
      return {
        subject: `⏰ Payment Reminder — ${data.trackingId}`,
        html: `${header}
          <h2 style="color:#d97706">Payment Reminder</h2>
          <p>Dear <strong>${data.name}</strong>,</p>
          <p>This is a reminder that installment <strong>#${data.installmentNumber || 1}</strong> of <strong>৳${(data.amount || 0).toLocaleString()}</strong> for booking <strong>${data.trackingId}</strong> is due on <strong>${data.dueDate}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Installment</td><td style="padding:8px;border:1px solid #ddd">#${data.installmentNumber || 1}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Amount Due</td><td style="padding:8px;border:1px solid #ddd">৳${(data.amount || 0).toLocaleString()}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Due Date</td><td style="padding:8px;border:1px solid #ddd">${data.dueDate}</td></tr>
          </table>
          <p>Please make your payment at the earliest. Thank you!</p>
          ${footer}`,
      };

    case "custom":
      return {
        subject: data.customSubject || "Notification from Rahe Kaba",
        html: `${header}
          <h2 style="color:#b8860b">${data.customSubject || "Message"}</h2>
          <p>Dear <strong>${data.name}</strong>,</p>
          <p>${data.customMessage || ""}</p>
          ${footer}`,
      };

    default:
      return { subject: "Notification", html: `<p>${data.customMessage || ""}</p>` };
  }
}

// --- SMS templates ---
function getSmsMessage(
  type: NotificationType,
  data: {
    name: string;
    trackingId: string;
    packageName: string;
    totalAmount: number;
    amount?: number;
    dueDate?: string;
    installmentNumber?: number;
    customMessage?: string;
  }
): string {
  switch (type) {
    case "booking_created":
      return `Dear ${data.name}, your booking ${data.trackingId} for ${data.packageName} has been created. Total: ৳${data.totalAmount.toLocaleString()}. Thank you for choosing Rahe Kaba!`;
    case "booking_confirmed":
      return `Dear ${data.name}, your booking ${data.trackingId} for ${data.packageName} has been confirmed. Thank you!`;
    case "booking_completed":
      return `Dear ${data.name}, your booking ${data.trackingId} for ${data.packageName} is fully paid (৳${data.totalAmount.toLocaleString()}). Status: Completed. Thank you!`;
    case "payment_received":
      return `Dear ${data.name}, we received ৳${(data.amount || 0).toLocaleString()} for booking ${data.trackingId}. Thank you for your payment!`;
    case "payment_reminder":
      return `Dear ${data.name}, installment #${data.installmentNumber || 1} of ৳${(data.amount || 0).toLocaleString()} for booking ${data.trackingId} is due on ${data.dueDate}. Please pay at the earliest. Thank you!`;
    case "custom":
      return data.customMessage || "";
    default:
      return data.customMessage || "";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check — accept both service role calls (from triggers) and admin calls
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    let callerUserId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      // Check if it's the service role key (from DB triggers)
      if (token !== serviceKey) {
        const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
        if (claimsError || !claimsData?.claims) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        callerUserId = claimsData.claims.sub as string;
        const { data: isAdmin } = await adminClient.rpc("has_role", { _user_id: callerUserId, _role: "admin" });
        if (!isAdmin) {
          return new Response(JSON.stringify({ error: "Admin access required" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const body: NotificationRequest = await req.json();
    const { type, channels, user_id, booking_id, payment_id } = body;

    if (!type || !channels?.length || !user_id) {
      return new Response(JSON.stringify({ error: "type, channels, and user_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user data
    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name, phone")
      .eq("user_id", user_id)
      .single();

    const { data: authUser } = await adminClient.auth.admin.getUserById(user_id);
    const email = authUser?.user?.email;
    const name = profile?.full_name || "Valued Customer";
    const phone = profile?.phone;

    // Fetch booking data if available
    let booking: any = null;
    if (booking_id) {
      const { data } = await adminClient
        .from("bookings")
        .select("*, packages(name)")
        .eq("id", booking_id)
        .single();
      booking = data;
    }

    // Fetch payment data if available
    let payment: any = null;
    if (payment_id) {
      const { data } = await adminClient
        .from("payments")
        .select("*")
        .eq("id", payment_id)
        .single();
      payment = data;
    }

    const templateData = {
      name,
      trackingId: booking?.tracking_id || "N/A",
      packageName: booking?.packages?.name || "Package",
      totalAmount: Number(booking?.total_amount || 0),
      paidAmount: Number(booking?.paid_amount || 0),
      dueAmount: Number(booking?.due_amount || booking?.total_amount || 0) - Number(booking?.paid_amount || 0),
      amount: body.amount || Number(payment?.amount || 0),
      dueDate: body.due_date || (payment?.due_date ? new Date(payment.due_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"),
      installmentNumber: body.installment_number || payment?.installment_number || 1,
      customSubject: body.custom_subject,
      customMessage: body.custom_message,
    };

    const results: { email?: string; sms?: string } = {};

    // --- Send Email ---
    if (channels.includes("email")) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      const fromEmail = Deno.env.get("NOTIFICATION_FROM_EMAIL") || "noreply@example.com";

      if (resendKey && email) {
        try {
          const { subject, html } = getEmailTemplate(type, templateData);
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ from: fromEmail, to: [email], subject, html }),
          });
          const emailData = await emailRes.json();
          results.email = emailRes.ok ? "sent" : `failed: ${JSON.stringify(emailData)}`;

          // Log
          await adminClient.from("notification_logs").insert({
            user_id,
            booking_id: booking_id || null,
            payment_id: payment_id || null,
            event_type: type,
            channel: "email",
            recipient: email,
            subject,
            message: html,
            status: emailRes.ok ? "sent" : "failed",
            error_detail: emailRes.ok ? null : JSON.stringify(emailData),
            sent_by: callerUserId,
          });
        } catch (e) {
          results.email = `error: ${e.message}`;
          await adminClient.from("notification_logs").insert({
            user_id, booking_id: booking_id || null, payment_id: payment_id || null,
            event_type: type, channel: "email", recipient: email || "unknown",
            subject: "Error", message: "", status: "failed", error_detail: e.message, sent_by: callerUserId,
          });
        }
      } else {
        results.email = !resendKey ? "skipped: no API key" : "skipped: no email";
      }
    }

    // --- Send SMS ---
    if (channels.includes("sms")) {
      const smsApiKey = Deno.env.get("BULKSMSBD_API_KEY");
      const smsSenderId = Deno.env.get("BULKSMSBD_SENDER_ID");

      if (smsApiKey && phone) {
        try {
          const message = getSmsMessage(type, templateData);
          const smsUrl = `https://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(smsApiKey)}&type=text&number=${encodeURIComponent(phone)}&senderid=${encodeURIComponent(smsSenderId || "")}&message=${encodeURIComponent(message)}`;
          const smsRes = await fetch(smsUrl);
          const smsText = await smsRes.text();
          results.sms = smsRes.ok ? "sent" : `failed: ${smsText}`;

          await adminClient.from("notification_logs").insert({
            user_id,
            booking_id: booking_id || null,
            payment_id: payment_id || null,
            event_type: type,
            channel: "sms",
            recipient: phone,
            subject: null,
            message,
            status: smsRes.ok ? "sent" : "failed",
            error_detail: smsRes.ok ? null : smsText,
            sent_by: callerUserId,
          });
        } catch (e) {
          results.sms = `error: ${e.message}`;
          await adminClient.from("notification_logs").insert({
            user_id, booking_id: booking_id || null, payment_id: payment_id || null,
            event_type: type, channel: "sms", recipient: phone || "unknown",
            subject: null, message: "", status: "failed", error_detail: e.message, sent_by: callerUserId,
          });
        }
      } else {
        results.sms = !smsApiKey ? "skipped: no API key" : "skipped: no phone";
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Notification error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
