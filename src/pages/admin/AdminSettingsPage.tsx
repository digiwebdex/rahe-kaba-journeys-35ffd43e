import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, X, Shield, Trash2, Users } from "lucide-react";
import AdminDocumentViewer from "@/components/AdminDocumentViewer";
import { useAdminRole } from "@/components/admin/AdminLayout";

const inputClass = "w-full bg-secondary border border-border rounded-md px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";
const ROLES = ["admin", "manager", "accountant", "staff"];
const PRIMARY_ADMIN_EMAIL = "admin@rahekaba.com";

export default function AdminSettingsPage() {
  const currentRole = useAdminRole();
  const [installmentPlans, setInstallmentPlans] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", num_installments: "3", description: "" });

  // Role management state
  const [users, setUsers] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [roleForm, setRoleForm] = useState({ user_id: "", role: "staff" });
  const [showRoleForm, setShowRoleForm] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("installment_plans").select("*").order("created_at", { ascending: false }),
      supabase.from("bookings").select("*, profiles(full_name)").order("created_at", { ascending: false }),
    ]).then(([ip, bk]) => {
      setInstallmentPlans(ip.data || []);
      setBookings(bk.data || []);
    });

    if (currentRole === "admin") {
      fetchRoleData();
    }
  }, [currentRole]);

  const fetchRoleData = async () => {
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, phone, email, created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
    ]);
    setUsers(profilesRes.data || []);
    setUserRoles(rolesRes.data || []);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("installment_plans").insert({
      name: form.name, num_installments: parseInt(form.num_installments), description: form.description || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Plan created");
    setShowForm(false);
    setForm({ name: "", num_installments: "3", description: "" });
    supabase.from("installment_plans").select("*").order("created_at", { ascending: false }).then(({ data }) => setInstallmentPlans(data || []));
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.user_id) { toast.error("Select a user"); return; }
    // Check if role already exists
    const existing = userRoles.find((r) => r.user_id === roleForm.user_id && r.role === roleForm.role);
    if (existing) { toast.error("User already has this role"); return; }
    const { error } = await supabase.from("user_roles").insert({ user_id: roleForm.user_id, role: roleForm.role } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Role assigned");
    setShowRoleForm(false);
    setRoleForm({ user_id: "", role: "staff" });
    fetchRoleData();
  };

  const handleRemoveRole = async (roleId: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
    if (error) { toast.error(error.message); return; }
    toast.success("Role removed");
    fetchRoleData();
  };

  const handleChangeRole = async (roleId: string, newRole: string) => {
    const { error } = await supabase.from("user_roles").update({ role: newRole } as any).eq("id", roleId);
    if (error) { toast.error(error.message); return; }
    toast.success("Role updated");
    fetchRoleData();
  };

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.user_id === userId);
    return user?.full_name || user?.phone || userId.slice(0, 8);
  };

  const getUserEmail = (userId: string) => {
    const user = users.find((u) => u.user_id === userId);
    return user?.email || "";
  };

  const isPrimaryAdmin = (userId: string) => getUserEmail(userId) === PRIMARY_ADMIN_EMAIL;

  // Users without any role yet
  const usersWithoutRole = users.filter((u) => !userRoles.some((r) => r.user_id === u.user_id));

  return (
    <div className="space-y-8">
      {/* Role Management (Admin only) */}
      {currentRole === "admin" && (
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-heading text-xl font-bold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> User Roles & Access
            </h2>
            <button onClick={() => setShowRoleForm(!showRoleForm)} className="bg-gradient-gold text-primary-foreground text-sm font-semibold px-4 py-2 rounded-md flex items-center gap-2">
              {showRoleForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showRoleForm ? "Cancel" : "Assign Role"}
            </button>
          </div>

          {/* Role matrix legend */}
          <div className="bg-card border border-border rounded-lg p-4 mb-4">
            <p className="text-xs font-semibold mb-2 text-muted-foreground">Access Matrix</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="space-y-1">
                <p className="font-semibold text-primary">Admin</p>
                <p className="text-muted-foreground">Full access to all features including Accounting, CMS, Settings, and Role Management</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-primary">Manager</p>
                <p className="text-muted-foreground">Bookings, Customers, Packages, Hotels, Payments, Due Alerts, Reports — can modify financial data</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-primary">Accountant</p>
                <p className="text-muted-foreground">Payments, Accounting, Chart of Accounts, Receivables, Reports — full financial write access</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-primary">Staff</p>
                <p className="text-muted-foreground">Bookings, Customers, Payments, Due Alerts — view only for financial data</p>
              </div>
            </div>
          </div>

          {showRoleForm && (
            <form onSubmit={handleAssignRole} className="bg-card border border-border rounded-xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <select className={inputClass} required value={roleForm.user_id} onChange={(e) => setRoleForm({ ...roleForm, user_id: e.target.value })}>
                <option value="">Select User</option>
                {usersWithoutRole.map((u) => (
                  <option key={u.user_id} value={u.user_id}>{u.full_name || u.phone || u.user_id.slice(0, 8)}</option>
                ))}
                {/* Also show users with roles for adding additional roles */}
                {users.filter((u) => userRoles.some((r) => r.user_id === u.user_id)).map((u) => (
                  <option key={u.user_id + "-existing"} value={u.user_id}>{u.full_name || u.phone || u.user_id.slice(0, 8)} (has role)</option>
                ))}
              </select>
              <select className={inputClass} value={roleForm.role} onChange={(e) => setRoleForm({ ...roleForm, role: e.target.value })}>
                {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
              <button type="submit" className="bg-gradient-gold text-primary-foreground font-semibold py-2.5 rounded-md text-sm">Assign Role</button>
            </form>
          )}

          <div className="space-y-2">
            {userRoles.map((ur: any) => (
              <div key={ur.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{getUserName(ur.user_id)}</p>
                    <p className="text-xs text-muted-foreground">{ur.user_id.slice(0, 12)}...</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isPrimaryAdmin(ur.user_id) ? (
                    <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-full">Primary Admin (Protected)</span>
                  ) : (
                    <>
                      <select
                        className="bg-secondary border border-border rounded-md px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                        value={ur.role}
                        onChange={(e) => handleChangeRole(ur.id, e.target.value)}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                      </select>
                      <button onClick={() => handleRemoveRole(ur.id)} className="text-destructive hover:underline">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {userRoles.length === 0 && <p className="text-center text-muted-foreground py-8">No roles assigned yet.</p>}
          </div>
        </section>
      )}

      {/* Installment Plans */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-heading text-xl font-bold">Installment Plans</h2>
          <button onClick={() => setShowForm(!showForm)} className="bg-gradient-gold text-primary-foreground text-sm font-semibold px-4 py-2 rounded-md flex items-center gap-2">
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Cancel" : "Add Plan"}
          </button>
        </div>
        {showForm && (
          <form onSubmit={handleCreate} className="bg-card border border-border rounded-xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input className={inputClass} placeholder="Plan Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className={inputClass} placeholder="Number of Installments" type="number" min="2" required value={form.num_installments} onChange={(e) => setForm({ ...form, num_installments: e.target.value })} />
            <input className={inputClass} placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <button type="submit" className="bg-gradient-gold text-primary-foreground font-semibold py-2.5 rounded-md text-sm sm:col-span-3">Create Plan</button>
          </form>
        )}
        <div className="space-y-3">
          {installmentPlans.map((p: any) => (
            <div key={p.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.description || "No description"}</p>
              </div>
              <span className="bg-primary/10 text-primary text-sm font-bold px-3 py-1 rounded-full">{p.num_installments} installments</span>
            </div>
          ))}
          {installmentPlans.length === 0 && <p className="text-center text-muted-foreground py-12">No plans created yet.</p>}
        </div>
      </section>

      {/* Documents */}
      <section>
        <h2 className="font-heading text-xl font-bold mb-4">Customer Documents</h2>
        <AdminDocumentViewer bookings={bookings} />
      </section>
    </div>
  );
}
