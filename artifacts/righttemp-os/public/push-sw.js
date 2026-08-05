self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  event.waitUntil(self.registration.showNotification(data.title || "New RightTemp lead", {
    body: data.body || "A new website lead just arrived.",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: data.tag || "righttemp-new-lead",
    renotify: true,
    data: { url: data.url || "/leads" },
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/leads";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => "focus" in client);
    if (existing) {
      existing.navigate(target);
      return existing.focus();
    }
    return self.clients.openWindow(target);
  }));
});
