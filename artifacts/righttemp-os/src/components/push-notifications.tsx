import { useEffect, useState } from "react";
import { Bell, BellRing, Smartphone } from "lucide-react";
import { supabase } from "@/lib/supabase";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}
export function PushNotifications() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const canPush = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(canPush);
    if (canPush) {
      navigator.serviceWorker.ready
        .then((registration) => registration.pushManager.getSubscription())
        .then((subscription) => setEnabled(Boolean(subscription)))
        .catch(() => undefined);
    }
  }, []);

  const enable = async () => {
    setBusy(true);
    setMessage("");
    try {
      if (!supported) throw new Error("Push notifications are not supported in this browser.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notification permission was not granted.");
      const registration = await navigator.serviceWorker.ready;
      const { data, error } = await supabase.functions.invoke<{ publicKey: string }>("push-config", { method: "GET" });
      if (error || !data?.publicKey) throw new Error("Could not load notification settings.");
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });
      const { error: saveError } = await supabase.functions.invoke("push-config", {
        method: "POST",
        body: { subscription: subscription.toJSON() },
      });
      if (saveError) throw new Error("Could not save this phone for notifications.");
      setEnabled(true);
      setMessage("This phone will alert you when a new website lead arrives.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not enable notifications.");
    } finally {
      setBusy(false);
    }
  };

  if (!supported) return null;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-blue-500/20 bg-blue-500/[.06] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-500/15">
          {enabled ? <BellRing className="h-5 w-5 text-blue-400" /> : <Smartphone className="h-5 w-5 text-blue-400" />}
        </span>
        <div>
          <h2 className="text-sm font-bold">New lead phone alerts</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {message || (enabled ? "Notifications are active on this device." : "Enable real push alerts, even while RightTemp OS is closed.")}
          </p>
        </div>
      </div>
      {!enabled && (
        <button type="button" disabled={busy} onClick={enable} className="flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-60">
          <Bell className="h-4 w-4" /> {busy ? "Enabling…" : "Enable alerts"}
        </button>
      )}
    </section>
  );
}
