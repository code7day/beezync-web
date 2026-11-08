# @beezync/web

Cliente web de Beezync: Web Push (VAPID), WebSocket con reconexión y recibos de entrega. Sin dependencias.

## Instalación

Copia `beezync.js` en tu sitio o instala el paquete. Para Web Push publica `beezync-sw.js` en la raíz del dominio.

## Uso

```js
import { BeezyncClient } from './beezync.js';

const client = new BeezyncClient({ appId, publicKey, baseUrl: 'https://api.beezync.com' });

await client.enableWebPush({ serviceWorkerUrl: '/beezync-sw.js', externalUserId: 'user-42' });

client.on('message', (m) => console.log(m));
client.connect();
client.subscribe('news');
client.subscribe('private-orders', hmacDelServidor);
```

`enableWebPush` registra el service worker, pide permiso, obtiene la llave VAPID de la app y registra la suscripción. El service worker muestra la notificación y reporta `received`, `clicked` y `dismissed`. Si el push incluye `data.url`, al tocarlo se abre esa dirección.

## API

| Método | Descripción |
|---|---|
| `registerDevice`, `unregisterDevice`, `setUser`, `setTags` | Dispositivos y etiquetas |
| `enableWebPush` | Suscripción de navegador |
| `connect`, `disconnect`, `subscribe`, `unsubscribe` | WebSocket con reconexión y resuscripción |
| `on('message' \| 'open' \| 'close' \| 'error')` | Eventos |
| `trackReceived`, `trackClicked`, `trackDismissed` | Recibos y clics |

Para canales privados, el servidor del cliente calcula `auth` con `POST /v1/api/channels/auth` (llave secreta) o entrega un `token` de suscripción.

## Pruebas

```bash
npm test
BASE_URL=... APP_ID=... PUBLIC_KEY=... SECRET_KEY=... node --test test/live.test.js
```

## Autoría y licencia

Beezync es un proyecto de Eduardo Flores. El servicio comercial de Beezync es respaldado y operado por ITM Soluciones Tecnológicas e Inversiones S.A.C. Este SDK se distribuye con licencia MIT (ver `LICENSE`).
