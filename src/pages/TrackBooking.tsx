import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase, auth as apiAuth } from "@/lib/api";
import { motion } from "framer-motion";
import { Search, Package, CheckCircle2, Clock, Plane, FileCheck, Loader2, History, X, User, ShieldCheck, LogIn } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const STATUS_STEPS = [
  { key: "pending", label: "Pending", icon: Clock },
  { key: "confirmed", label: "Confirmed", icon: ShieldCheck },
  { key: "visa_processing", label: "Visa Processing", icon: FileCheck },
  { key: "ticket_issued", label: "Ticket Issued", icon: Plane },
  { key: "completed", label: "Completed", icon: CheckCircle2 },
];

const HISTORY_KEY = "rk_tracking_history";

const getHistory = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
};

const addToHistory = (id: string) => {
  const history = getHistory().filter((h) => h !== id);
  history.unshift(id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
};

const removeFromHistory = (id: string) => {
  const history = getHistory().filter((h) => h !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
};

const TrackBooking = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [trackingId, setTrackingId] = useState(searchParams.get("id") || "");
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [history, setHistory] = useState<string[]>(getHistory());
  const [user, setUser] = useState<any>(null);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [loadingUser, setLoadingUser] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user || null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setUser(s?.user || null));
    return () => subscription.unsubscribe();
  }, []);

  // Fetch user's bookings when logged in
  useEffect(() => {
    if (!user) { setUserBookings([]); return; }
    setLoadingUser(true);
    supabase
      .from("bookings")
      .select("tracking_id, status, packages(name), created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setUserBookings((data as any) || []);
        setLoadingUser(false);
      });
  }, [user]);

  const isPhoneNumber = (input: string) => /^[\+]?[0-9\s\-]{7,15}$/.test(input.trim());

  const handleSearch = async (idOverride?: string) => {
    const rawInput = (idOverride || trackingId).trim();
    if (!rawInput) return;
    setTrackingId(rawInput);
    setLoading(true);
    setSearched(true);

    let bookingData: any = null;

    if (isPhoneNumber(rawInput)) {
      // Use secure edge function for public tracking
      const { data, error } = await supabase.functions.invoke("track-booking", {
        body: { phone: rawInput },
      });
      if (!error && data?.booking) {
        bookingData = data.booking;
      }
    } else {
      const id = rawInput.toUpperCase();
      setTrackingId(id);
      // Use secure edge function for public tracking
      const { data, error } = await supabase.functions.invoke("track-booking", {
        body: { tracking_id: id },
      });
      if (!error && data?.booking) {
        bookingData = data.booking;
      }
    }

    setBooking(bookingData);

    if (bookingData) {
      const displayId = bookingData.tracking_id;
      addToHistory(displayId);
      setHistory(getHistory());
    }
    setLoading(false);
  };

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      setTrackingId(id);
      handleSearch(id);
    }
  }, []);

  const handleRemoveHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromHistory(id);
    setHistory(getHistory());
  };

  const currentStepIndex = booking
    ? STATUS_STEPS.findIndex((s) => s.key === booking.status)
    : -1;

  const statusLabel = (status: string) => {
    const step = STATUS_STEPS.find((s) => s.key === status);
    return step?.label || status;
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "completed": return "bg-emerald/10 text-emerald";
      case "pending": return "bg-primary/10 text-primary";
      case "visa_processing": return "bg-primary/10 text-primary";
      case "confirmed": return "bg-primary/10 text-primary";
      case "ticket_issued": return "bg-primary/10 text-primary";
      case "cancelled": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  // Determine if user owns this booking (can see full details)
  const isOwner = user && booking && booking.user_id === user.id;

  const fmt = (n: number) => `BDT ${Number(n || 0).toLocaleString()}`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <span className="text-primary text-sm font-medium tracking-[0.3em] uppercase">Track</span>
            <h1 className="font-heading text-3xl md:text-4xl font-bold mt-3 mb-3">
              Track Your <span className="text-gradient-gold">Booking</span>
            </h1>
            <p className="text-muted-foreground text-sm">Enter your Tracking ID or Phone Number to view your booking status</p>
          </motion.div>

          {/* Search Bar */}
          <div className="flex gap-3 mb-6">
            <input
              type="text"
              placeholder="Enter Tracking ID or Phone Number"
              className="flex-1 bg-secondary border border-border rounded-md px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 uppercase"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="bg-gradient-gold text-primary-foreground font-semibold px-6 py-3 rounded-md text-sm hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Track
            </button>
          </div>

          {/* Recent History + User Bookings (shown when no result displayed) */}
          {!booking && !loading && (
            <div className="space-y-6 mb-10">
              {history.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <History className="h-4 w-4 text-primary" /> Recent Searches
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {history.map((id) => (
                      <button
                        key={id}
                        onClick={() => handleSearch(id)}
                        className="bg-secondary border border-border rounded-full px-3 py-1.5 text-xs font-mono font-medium text-foreground hover:border-primary/40 transition-colors flex items-center gap-1.5 group"
                      >
                        {id}
                        <X
                          className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                          onClick={(e) => handleRemoveHistory(id, e)}
                        />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {user && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <User className="h-4 w-4 text-primary" /> Your Bookings
                  </h3>
                  {loadingUser ? (
                    <p className="text-xs text-muted-foreground">Loading...</p>
                  ) : userBookings.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No bookings found.</p>
                  ) : (
                    <div className="space-y-2">
                      {userBookings.map((b: any) => (
                        <button
                          key={b.tracking_id}
                          onClick={() => handleSearch(b.tracking_id)}
                          className="w-full flex items-center justify-between bg-secondary/50 border border-border rounded-lg px-4 py-3 hover:border-primary/40 transition-colors text-left"
                        >
                          <div>
                            <p className="font-mono text-sm font-bold text-primary">{b.tracking_id}</p>
                            <p className="text-xs text-muted-foreground">
                              {b.packages?.name || "Package"} • {new Date(b.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusColor(b.status)}`}>
                            {statusLabel(b.status)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}

          {/* Results */}
          {loading && (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
              Searching...
            </div>
          )}

          {!loading && searched && !booking && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-2">No booking found with this Tracking ID</p>
              <p className="text-xs text-muted-foreground">Please check your ID and try again, or <a href="/auth" className="text-primary hover:underline">sign in</a> to view your bookings.</p>
            </motion.div>
          )}

          {!loading && booking && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Back to search */}
              <button
                onClick={() => { setBooking(null); setSearched(false); setTrackingId(""); }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                ← Search another booking
              </button>

              {/* Status Timeline */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-heading text-lg font-bold mb-6">Booking Status</h2>
                <div className="flex items-center justify-between relative">
                  <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
                  <div
                    className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500"
                    style={{ width: `${currentStepIndex >= 0 ? (currentStepIndex / (STATUS_STEPS.length - 1)) * 100 : 0}%` }}
                  />
                  {STATUS_STEPS.map((step, i) => {
                    const isActive = i <= currentStepIndex;
                    const isCurrent = i === currentStepIndex;
                    return (
                      <div key={step.key} className="relative z-10 flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                            isCurrent
                              ? "bg-primary text-primary-foreground shadow-gold scale-110"
                              : isActive
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          <step.icon className="h-4 w-4" />
                        </div>
                        <span className={`text-xs mt-2 font-medium text-center max-w-[80px] ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Booking Details — PUBLIC (limited info) */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-heading text-lg font-bold mb-4">Booking Details</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Tracking ID</p>
                    <p className="font-mono font-bold text-primary">{booking.tracking_id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Customer</p>
                    <p className="font-medium">{booking.guest_name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Package</p>
                    <p className="font-medium">{booking.packages?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Travelers</p>
                    <p className="font-medium">{booking.num_travelers}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusColor(booking.status)}`}>
                      {statusLabel(booking.status)}
                    </span>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Payment Status</p>
                    <p className="font-medium">
                      {Number(booking.due_amount || 0) <= 0 ? (
                        <span className="text-emerald font-semibold">Fully Paid ✅</span>
                      ) : (
                        <span className="text-destructive font-semibold">Due: {fmt(booking.due_amount || 0)}</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Booked On</p>
                    <p className="font-medium">{new Date(booking.created_at).toLocaleDateString()}</p>
                  </div>
                  {booking.notes && (
                    <div className="col-span-2 sm:col-span-3">
                      <p className="text-muted-foreground">Notes</p>
                      <p className="font-medium text-sm">{booking.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Login prompt for full details (non-authenticated users) */}
              {!user && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 text-center">
                  <LogIn className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-sm font-semibold mb-1">Want to see full details?</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Login to your dashboard to view payment history, documents, installment schedule and more.
                  </p>
                  <a
                    href="/auth"
                    className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground font-semibold px-5 py-2 rounded-md text-sm hover:opacity-90 transition-opacity"
                  >
                    <LogIn className="h-4 w-4" /> Login to Dashboard
                  </a>
                </div>
              )}

              {/* Full financial details — ONLY for authenticated owner */}
              {isOwner && (
                <div className="bg-card border border-border rounded-xl p-6">
                  <h2 className="font-heading text-lg font-bold mb-4">Financial Summary</h2>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Amount</p>
                      <p className="font-medium">{fmt(booking.total_amount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Paid</p>
                      <p className="font-medium text-emerald">{fmt(booking.paid_amount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Due</p>
                      <p className="font-medium text-destructive">{fmt(booking.due_amount || 0)}</p>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-center text-xs text-muted-foreground">
                For any questions, <a href="/#contact" className="text-primary hover:underline">contact us</a> or call +880 1601-505050
              </p>
            </motion.div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default TrackBooking;
