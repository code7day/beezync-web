import test from 'node:test';
import assert from 'node:assert/strict';
import { BeezyncClient } from '../beezync.js';

const { BASE_URL, APP_ID, PUBLIC_KEY, SECRET_KEY } = process.env;
const live = BASE_URL && APP_ID && PUBLIC_KEY && SECRET_KEY;

const secret = (method, path, body) =>
  fetch(BASE_URL + path, {
    method,
    headers: { Authorization: 'Bearer ' + SECRET_KEY, 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  }).then((r) => r.json());

test('live flow against the engine', { skip: !live }, async () => {
  const c = new BeezyncClient({ appId: APP_ID, publicKey: PUBLIC_KEY, baseUrl: BASE_URL });
  const token = 'web-live-' + Date.now();
  await c.registerDevice({ token, externalUserId: 'sdk-web-' + Date.now(), platform: 'web' });

  const inbox = [];
  c.on('message', (m) => inbox.push(m));
  const open = new Promise((r) => c.on('open', r));
  c.connect();
  await open;
  const channel = 'sdk-web-' + Date.now();
  c.subscribe(channel);
  await new Promise((r) => setTimeout(r, 300));

  await secret('POST', '/v1/api/publish', { channel, event: 'hello', data: { n: 1 } });
  const push = await secret('POST', '/v1/api/send-push', { target_type: 'channel', target_value: channel, title: 'T', body: 'B' });
  await new Promise((r) => setTimeout(r, 800));
  assert.ok(inbox.some((m) => m.event === 'hello'), 'published message arrived');
  const note = inbox.find((m) => m.title === 'T');
  assert.ok(note && note.id === push.id, 'notification arrived');

  await c.trackReceived(note.id, token);
  await c.trackClicked(note.id, token);
  await new Promise((r) => setTimeout(r, 300));
  const stats = await secret('GET', '/v1/api/notifications/' + push.id);
  assert.equal(stats.received, 1);
  assert.equal(stats.clicked, 1);
  c.disconnect();
});
