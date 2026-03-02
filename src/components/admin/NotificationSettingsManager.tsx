import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, Mail, MessageSquare, CheckCircle2, Loader2, Save } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface NotificationSetting {
  id: string;
  event_key: string;
  event_label: string;
  enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
}

export default function NotificationSettingsManager() {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notification_settings" as any)
      .select("*")
      .order("event_key");
    if (error) {
      toast.error("Failed to load notification settings");
    } else {
      setSettings((data as any[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleToggle = async (id: string, field: "enabled" | "email_enabled" | "sms_enabled", value: boolean) => {
    setSaving(id + field);
    const { error } = await supabase
      .from("notification_settings" as any)
      .update({ [field]: value, updated_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) {
      toast.error("Failed to update setting");
    } else {
      setSettings((prev) =>
        prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
      );
      toast.success("Setting updated");
    }
    setSaving(null);
  };

  const getChannelLabel = (s: NotificationSetting) => {
    if (!s.enabled) return "Disabled";
    const channels = [];
    if (s.email_enabled) channels.push("Email");
    if (s.sms_enabled) channels.push("SMS");
    return channels.length ? channels.join(" + ") : "No channel";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Triggers Grid */}
      <div>
        <p className="text-sm font-semibold mb-3 text-foreground">Automated Triggers</p>
        <div className="space-y-2">
          {settings.map((s) => (
            <div
              key={s.id}
              className={`bg-secondary/50 border border-border rounded-lg p-4 transition-opacity ${!s.enabled ? "opacity-50" : ""}`}
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                {/* Left: Toggle + Label */}
                <div className="flex items-center gap-3 min-w-[200px]">
                  <Switch
                    checked={s.enabled}
                    onCheckedChange={(v) => handleToggle(s.id, "enabled", v)}
                    disabled={saving === s.id + "enabled"}
                  />
                  <div>
                    <p className="font-medium text-sm">{s.event_label}</p>
                    <p className="text-xs text-muted-foreground">{getChannelLabel(s)}</p>
                  </div>
                </div>

                {/* Right: Channel toggles */}
                {s.enabled && (
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Switch
                        checked={s.email_enabled}
                        onCheckedChange={(v) => handleToggle(s.id, "email_enabled", v)}
                        disabled={saving === s.id + "email_enabled"}
                        className="scale-90"
                      />
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Email</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Switch
                        checked={s.sms_enabled}
                        onCheckedChange={(v) => handleToggle(s.id, "sms_enabled", v)}
                        disabled={saving === s.id + "sms_enabled"}
                        className="scale-90"
                      />
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">SMS</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Provider info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-secondary/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-4 w-4 text-primary" />
            <p className="font-semibold text-sm">Email Provider</p>
          </div>
          <p className="text-xs text-muted-foreground">Resend API — configured via RESEND_API_KEY secret</p>
          <p className="text-xs text-muted-foreground mt-1">From: NOTIFICATION_FROM_EMAIL secret</p>
        </div>
        <div className="bg-secondary/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <p className="font-semibold text-sm">SMS Provider</p>
          </div>
          <p className="text-xs text-muted-foreground">BulkSMSBD — configured via BULKSMSBD_API_KEY secret</p>
          <p className="text-xs text-muted-foreground mt-1">Sender ID: BULKSMSBD_SENDER_ID secret</p>
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">How it works:</strong> Toggle triggers on/off and choose which channels (Email/SMS) each event uses. 
          Changes take effect immediately. Disabled triggers will not send any notifications. 
          All delivery logs are visible in the <strong>Notifications</strong> page.
        </p>
      </div>
    </div>
  );
}
