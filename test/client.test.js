import test from 'node:test';
import assert from 'node:assert/strict';
import { BeezyncClient, backoff } from '../beezync.js';

const cfg = { appId: 'a', publicKey: 'pk_x', baseUrl: 'https://api.example.com/' };

class FakeWS {
  static instances = [];
  constructor(url) { this.url = url; this.sent = []; this.readyState = 1; FakeWS.instances.push(this); }
  send(d) { this.sent.push(JSON.parse(d)); }
  close(code) { this.readyState = 3; this.onclose?.({ code }); }
}

test('backoff grows and stays within bounds', () => {
  assert.equal(backoff(0, () => 0), 500);
  assert.equal(backoff(0, () => 1), 1000);
  assert.equal(backoff(10, () => 1), 30000);
});

test('requests carry the public key and parse errors', async () => {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push([url, init]);
    return { ok: false, status: 401, text: async () => JSON.stringify({ error: 'no', code: 'unauthorized' }) };
  };
  const c = new BeezyncClient({ ...cfg, fetch });
  await assert.rejects(c.registerDevice({ token: 't' }), (e) => e.status === 401 && e.code === 'unauthorized');
  assert.equal(calls[0][0], 'https://api.example.com/v1/api/register-device');
  assert.equal(calls[0][1].headers.Authorization, 'Bearer pk_x');
});

test('web subscriptions are sent instead of a token', async () => {
  let body;
  const fetch = async (_, init) => { body = JSON.parse(init.body); return { ok: true, status: 200, text: async () => '{}' }; };
  const c = new BeezyncClient({ ...cfg, fetch });
  await c.registerDevice({ subscription: { endpoint: 'https://x', keys: { p256dh: 'a', auth: 'b' } }, platform: 'web' });
  assert.equal(body.subscription.endpoint, 'https://x');
  assert.equal(body.token, undefined);
});

test('socket resubscribes after reconnect and reconnects immediately on 4200', async () => {
  FakeWS.instances = [];
  const c = new BeezyncClient({ ...cfg, WebSocket: FakeWS });
  const seen = [];
  c.on('message', (m) => seen.push(m.event));
  c.connect();
  c.subscribe('news');
  c.subscribe('private-x', 'sig');
  const ws = FakeWS.instances[0];
  assert.match(ws.url, /^wss:\/\/api\.example\.com\/v1\/ws\?app_id=a&key=pk_x$/);
  ws.onmessage({ data: JSON.stringify({ event: 'connection_established', data: { socket_id: '1' } }) });
  assert.deepEqual(ws.sent.slice(-2), [
    { action: 'subscribe', channel: 'news' },
    { action: 'subscribe', channel: 'private-x', auth: 'sig' },
  ]);
  ws.onmessage({ data: JSON.stringify({ event: 'hello', channel: 'news', data: 1 }) });
  assert.deepEqual(seen, ['hello']);
  ws.close(4200);
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(FakeWS.instances.length, 2);
  FakeWS.instances[1].onmessage({ data: JSON.stringify({ event: 'connection_established', data: { socket_id: '2' } }) });
  assert.equal(FakeWS.instances[1].sent.length, 2);
  c.disconnect();
});
