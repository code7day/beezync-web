const params = new URL(self.location).searchParams;
const BASE = params.get('base');
const KEY = params.get('key');

const report = async (event, id) => {
  if (!id || !BASE || !KEY) return;
  const sub = await self.registration.pushManager.getSubscription();
  await fetch(BASE + '/v1/api/notification-events', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ notification_id: id, event, token: sub ? sub.endpoint : undefined }),
    keepalive: true,
  }).catch(() => {});
};

self.addEventListener('push', (event) => {
  let p = {};
  try { p = event.data ? event.data.json() : {}; } catch { p = { title: 'Notification', body: event.data.text() }; }
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(p.title || 'Notification', {
        body: p.body || '',
        data: { id: p.id, url: p.data && p.data.url, extra: p.data },
        tag: p.id,
      }),
      report('received', p.id),
    ]),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { id, url } = event.notification.data || {};
  event.waitUntil(
    Promise.all([
      report('clicked', id),
      url ? self.clients.openWindow(url) : Promise.resolve(),
    ]),
  );
});

self.addEventListener('notificationclose', (event) => {
  const { id } = event.notification.data || {};
  event.waitUntil(report('dismissed', id));
});
