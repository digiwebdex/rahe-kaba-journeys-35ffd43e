import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      fullName,
      phone,
      email,
      address,
      passportNumber,
      packageId,
      numTravelers,
      notes,
      installmentPlanId,
    } = await req.json();

    if (!fullName || !phone || !packageId || !numTravelers) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: fullName, phone, packageId, numTravelers" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to bypass RLS for guest inserts
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get package to calculate total
    const { data: pkg, error: pkgError } = await supabase
      .from("packages")
      .select("id, price, name")
      .eq("id", packageId)
      .eq("is_active", true)
      .single();

    if (pkgError || !pkg) {
      return new Response(
        JSON.stringify({ error: "Package not found or inactive" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const totalAmount = Number(pkg.price) * numTravelers;

    // Check if there's a logged-in user from the auth header
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData } = await supabase.auth.getClaims(token);
      if (claimsData?.claims?.sub) {
        userId = claimsData.claims.sub;
      }
    }

    // Create the booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        user_id: userId,
        package_id: packageId,
        total_amount: totalAmount,
        num_travelers: numTravelers,
        installment_plan_id: installmentPlanId || null,
        notes: notes?.trim() || null,
        guest_name: fullName.trim(),
        guest_phone: phone.trim(),
        guest_email: email?.trim() || null,
        guest_address: address?.trim() || null,
        guest_passport: passportNumber?.trim() || null,
        status: "pending",
        paid_amount: 0,
      })
      .select("id, tracking_id")
      .single();

    if (bookingError) {
      console.error("Booking insert error:", bookingError);
      return new Response(
        JSON.stringify({ error: bookingError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate installment schedule if plan selected
    if (installmentPlanId) {
      const { data: plan } = await supabase
        .from("installment_plans")
        .select("num_installments")
        .eq("id", installmentPlanId)
        .single();

      if (plan) {
        // Use a system user ID for guest payment records
        const paymentUserId = userId || "00000000-0000-0000-0000-000000000000";
        await supabase.rpc("generate_installment_schedule", {
          p_booking_id: booking.id,
          p_total_amount: totalAmount,
          p_num_installments: plan.num_installments,
          p_user_id: paymentUserId,
        });
      }
    }

    // If user is logged in, update their profile too
    if (userId) {
      await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          passport_number: passportNumber?.trim() || null,
          address: address?.trim() || null,
        })
        .eq("user_id", userId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        booking_id: booking.id,
        tracking_id: booking.tracking_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
