import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Packages from "./pages/Packages";
import PackageDetail from "./pages/PackageDetail";
import Hotels from "./pages/Hotels";
import HotelDetail from "./pages/HotelDetail";
import Booking from "./pages/Booking";
import TrackBooking from "./pages/TrackBooking";
import ResetPassword from "./pages/ResetPassword";
import About from "./pages/About";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";

import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminBookingsPage from "./pages/admin/AdminBookingsPage";
import AdminCustomersPage from "./pages/admin/AdminCustomersPage";
import AdminPackagesPage from "./pages/admin/AdminPackagesPage";
import AdminHotelsPage from "./pages/admin/AdminHotelsPage";
import AdminPaymentsPage from "./pages/admin/AdminPaymentsPage";
import AdminDueAlertsPage from "./pages/admin/AdminDueAlertsPage";
import AdminAccountingPage from "./pages/admin/AdminAccountingPage";
import AdminReportsPage from "./pages/admin/AdminReportsPage";
import AdminCmsPage from "./pages/admin/AdminCmsPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import AdminNotificationsPage from "./pages/admin/AdminNotificationsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/packages/:id" element={<PackageDetail />} />
          <Route path="/hotels" element={<Hotels />} />
          <Route path="/hotels/:id" element={<HotelDetail />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/track" element={<TrackBooking />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="bookings" element={<AdminBookingsPage />} />
            <Route path="customers" element={<AdminCustomersPage />} />
            <Route path="packages" element={<AdminPackagesPage />} />
            <Route path="hotels" element={<AdminHotelsPage />} />
            <Route path="payments" element={<AdminPaymentsPage />} />
            <Route path="due-alerts" element={<AdminDueAlertsPage />} />
            <Route path="notifications" element={<AdminNotificationsPage />} />
            <Route path="accounting" element={<AdminAccountingPage />} />
            <Route path="reports" element={<AdminReportsPage />} />
            <Route path="cms" element={<AdminCmsPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
