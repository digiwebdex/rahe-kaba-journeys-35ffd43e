import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Database, Download, Upload, Trash2, RefreshCw, Shield, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface BackupFile {
  name: string;
  created_at: string;
  size: number;
}

const getToken = () => localStorage.getItem("rk_access_token");

const authHeaders = () => {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export default function BackupRestoreManager() {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const parseResponse = async (res: Response) => {
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { text, json };
  };

  const getApiError = (fallback: string, parsed: { text: string; json: any }) => {
    if (parsed?.json?.error) return parsed.json.error;
    if (parsed?.json?.message) return parsed.json.message;
    if (parsed?.text?.includes("<!doctype html") || parsed?.text?.includes("<html")) {
      return "API response is HTML instead of JSON. Please verify your /api proxy and backend server status.";
    }
    return fallback;
  };

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/backup/list`, { headers: authHeaders() });
      const parsed = await parseResponse(res);
      if (!res.ok) throw new Error(getApiError("Failed to load backups", parsed));
      setBackups(Array.isArray(parsed.json) ? parsed.json : []);
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  useEffect(() => { fetchBackups(); }, []);

  const createBackup = async () => {
    setCreating(true);
    setProgress(10);
    try {
      const interval = setInterval(() => setProgress(p => Math.min(p + 8, 90)), 500);
      const res = await fetch(`${API_URL}/backup/create`, {
        method: "POST",
        headers: authHeaders(),
      });
      clearInterval(interval);
      const parsed = await parseResponse(res);
      if (!res.ok) {
        throw new Error(getApiError("Backup failed", parsed));
      }
      setProgress(100);
      toast.success(`Backup successful! ${parsed.json?.tables || 0} tables saved`);
      fetchBackups();
    } catch (e: any) {
      toast.error(`Backup failed: ${e.message}`);
    } finally {
      setCreating(false);
      setTimeout(() => setProgress(0), 1500);
    }
  };

  const restoreBackup = async (fileName: string, mode: "full" | "merge") => {
    setRestoring(fileName);
    setProgress(10);
    try {
      const interval = setInterval(() => setProgress(p => Math.min(p + 5, 90)), 800);
      const res = await fetch(`${API_URL}/backup/restore`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ fileName, mode }),
      });
      clearInterval(interval);
      const parsed = await parseResponse(res);
      if (!res.ok) {
        throw new Error(getApiError("Restore failed", parsed));
      }
      setProgress(100);
      toast.success(`Restore successful! ${parsed.json?.restored || 0} tables restored`);
    } catch (e: any) {
      toast.error(`Restore failed: ${e.message}`);
    } finally {
      setRestoring(null);
      setTimeout(() => setProgress(0), 1500);
    }
  };

  const deleteBackup = async (fileName: string) => {
    try {
      const res = await fetch(`${API_URL}/backup/delete`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ fileName }),
      });
      const parsed = await parseResponse(res);
      if (!res.ok) throw new Error(getApiError("Delete failed", parsed));
      toast.success("Backup deleted");
      fetchBackups();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const downloadBackup = async (fileName: string) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/backup/download?file=${encodeURIComponent(fileName)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-GB", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h3 className="font-heading text-lg font-bold">Backup & Restore</h3>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchBackups} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={createBackup} disabled={creating}>
            {creating ? (
              <><RefreshCw className="h-4 w-4 mr-1 animate-spin" /> Creating Backup...</>
            ) : (
              <><Shield className="h-4 w-4 mr-1" /> New Backup</>
            )}
          </Button>
        </div>
      </div>

      {progress > 0 && (
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {creating ? "Creating backup..." : restoring ? "Restoring..." : "Complete!"}
          </p>
        </div>
      )}

      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex items-start gap-2 text-sm text-destructive">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <p><strong>Warning:</strong> "Full Restore" will delete all current data and reload from backup. "Merge" will only add/update data without deleting existing records.</p>
      </div>

      <div className="space-y-2">
        {backups.length === 0 && !loading && (
          <p className="text-center text-muted-foreground py-12">No backups found. Click "New Backup" above to create one.</p>
        )}
        {loading && <p className="text-center text-muted-foreground py-8">Loading...</p>}

        {backups.map((b) => (
          <div key={b.name} className="bg-card border border-border rounded-lg p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{b.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(b.created_at)} • {formatSize(b.size)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => downloadBackup(b.name)}>
                  <Download className="h-3.5 w-3.5 mr-1" /> Download
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={!!restoring}>
                      <Upload className="h-3.5 w-3.5 mr-1" /> Merge
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Merge Restore</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will merge the backup data with existing data. No data will be deleted, only updated/added.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => restoreBackup(b.name, "merge")}>
                        Merge Restore
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={!!restoring}>
                      <Upload className="h-3.5 w-3.5 mr-1" /> Full Restore
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>⚠️ Confirm Full Restore</AlertDialogTitle>
                      <AlertDialogDescription>
                        <strong className="text-destructive">This will delete all current data</strong> and reload from the backup. This action cannot be undone!
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => restoreBackup(b.name, "full")}
                      >
                        Yes, Full Restore
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Backup</AlertDialogTitle>
                      <AlertDialogDescription>
                        The backup "{b.name}" will be permanently deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => deleteBackup(b.name)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
