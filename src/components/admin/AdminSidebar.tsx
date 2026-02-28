import {
  LayoutDashboard, FileText, Users, Package, Building2, CreditCard,
  Calculator, BarChart3, Pencil, Settings, LogOut, AlertTriangle, Bell, BookOpen, Receipt,
} from "lucide-react";
import logo from "@/assets/logo.jpg";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, SidebarSeparator,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import type { AppRole } from "@/hooks/useUserRole";

// Role access matrix
const menuItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard, roles: ["admin", "manager", "staff", "viewer"] },
  { title: "Bookings", url: "/admin/bookings", icon: FileText, roles: ["admin", "manager", "staff", "viewer"] },
  { title: "Customers", url: "/admin/customers", icon: Users, roles: ["admin", "manager", "staff", "viewer"] },
  { title: "Packages", url: "/admin/packages", icon: Package, roles: ["admin", "manager", "viewer"] },
  { title: "Hotels", url: "/admin/hotels", icon: Building2, roles: ["admin", "manager", "viewer"] },
  { title: "Payments", url: "/admin/payments", icon: CreditCard, roles: ["admin", "manager", "staff", "viewer"] },
  { title: "Due Alerts", url: "/admin/due-alerts", icon: AlertTriangle, roles: ["admin", "manager", "staff", "viewer"] },
  { title: "Notifications", url: "/admin/notifications", icon: Bell, roles: ["admin", "manager", "viewer"] },
  { title: "Accounting", url: "/admin/accounting", icon: Calculator, roles: ["admin", "viewer"] },
  { title: "Chart of Accounts", url: "/admin/chart-of-accounts", icon: BookOpen, roles: ["admin"] },
  { title: "Receivables", url: "/admin/receivables", icon: Receipt, roles: ["admin", "manager", "viewer"] },
  { title: "Reports", url: "/admin/reports", icon: BarChart3, roles: ["admin", "manager", "viewer"] },
  { title: "CMS", url: "/admin/cms", icon: Pencil, roles: ["admin"] },
  { title: "Settings", url: "/admin/settings", icon: Settings, roles: ["admin"] },
];

export function AdminSidebar({ role }: { role: AppRole }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const filteredMenu = menuItems.filter((item) => role && item.roles.includes(role));

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Logo" className="h-9 w-9 rounded-md object-cover" />
          <span className="font-heading text-base font-bold text-primary">Admin</span>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenu.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/admin"}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
