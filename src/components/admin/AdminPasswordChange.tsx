import { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { auth } from "@/lib/api";

const API_URL = import.meta.env.VITE_API_URL || '/api';

const inputClass = "w-full bg-secondary border border-border rounded-md px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

export default function AdminPasswordChange() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (currentPassword === newPassword) {
      toast.error("New password must be different from current password");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("rk_access_token");
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to change password");
        return;
      }

      toast.success("Password changed successfully! Please login again.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Force re-login since sessions were invalidated
      setTimeout(() => {
        auth.signOut();
        window.location.href = "/auth";
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="font-heading text-xl font-bold flex items-center gap-2 mb-4">
        <Lock className="h-5 w-5 text-primary" /> Change Password
      </h2>
      <div className="bg-card border border-border rounded-lg p-5">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                className={inputClass}
                placeholder="Enter current password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowCurrent(!showCurrent)}>
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">New Password</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                className={inputClass}
                placeholder="Enter new password (min 8 chars)"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowNew(!showNew)}>
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Confirm New Password</label>
            <input
              type="password"
              className={inputClass}
              placeholder="Confirm new password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-gold text-primary-foreground font-semibold py-2.5 px-6 rounded-md text-sm disabled:opacity-50"
          >
            {loading ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
