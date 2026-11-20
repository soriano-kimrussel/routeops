# RouteOps

An office ERP and an offline-first driver app for a used-cooking-oil collection and grease-trap service company.

- **`/web`** is the office app and the API. Staff manage vendors (restaurants that hand over used oil), customers (sites that buy grease-trap and hood-cleaning jobs), drivers and routes, and watch stops come in from the field.
- **`/mobile`** is the driver app. A driver sees today's stops, completes each one with gallons, a note and a photo, and keeps working with no signal. Updates are queued on the phone and pushed when a connection comes back.

Everything runs locally. No accounts, API keys or paid services.

| | Stack |
|---|---|
| Web | Next.js 15 (App Router), TypeScript, Tailwind, Prisma, SQLite |
| Mobile | Expo SDK 58, React Native, TypeScript, React Navigation, AsyncStorage |

## What you need

- Node.js 20.19 or newer (built on Node 24)
- A phone with **Expo Go** installed from the App Store or Play Store
- The phone and the computer on the same Wi-Fi network

## 1. Run the web app

```bash
cd web
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open http://localhost:3000.

- `npx prisma migrate dev` creates the SQLite database at `web/prisma/dev.db`.
- `npm run db:seed` loads 3 drivers, 7 vendors, 5 customers and two routes dated **today**. Run it again any time to reset the demo. It always re-dates the routes to the current day.
- If `npm install` prints a notice about skipped install scripts, that is fine. The two commands after it generate everything Prisma needs.

The dev server listens on all network interfaces so the phone can reach it.

## 2. Run the mobile app

In a second terminal, with the web app still running:

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with the iPhone Camera app, or from inside Expo Go on Android.

On the sign-in screen:

1. **Driver code:** `D-101` (Maria Delgado, who has the 7-stop demo route).
2. **Office server address:** prefilled with this computer's network address on port 3000, for example `http://192.168.1.20:3000`. Leave it unless sign-in cannot reach the server.

### Pointing the app at the web API

The app picks the API address in this order:

1. What you type in **Office server address** on the sign-in screen.
2. `EXPO_PUBLIC_API_URL` in `mobile/.env` (copy `mobile/.env.example`), then restart `npx expo start`.
3. The address of the computer running `npx expo start`, on port 3000.

To find the computer's address yourself: `ipconfig` on Windows, `ipconfig getifaddr en0` on macOS. Use the IPv4 address of the Wi-Fi adapter. To check it, open `http://<that address>:3000` in the phone's browser. You should see the ERP.

### If the phone cannot connect

- **Windows Firewall.** Allow Node.js on private networks when Windows asks. Ports 3000 (web) and 8081 (Expo) must be reachable.
- **Wrong network adapter.** Computers with VPN or virtual machine adapters sometimes advertise the wrong address. Set the right one before starting Expo:
  - PowerShell: `$env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.1.20"; npx expo start`
  - macOS or Linux: `REACT_NATIVE_PACKAGER_HOSTNAME=192.168.1.20 npx expo start`
- **Guest or office Wi-Fi** often blocks devices from talking to each other. Use a home network or a phone hotspot.
- `npx expo start --tunnel` gets the app onto the phone over any network, but then you must type the office server address by hand, and it still has to be reachable from the phone.

## 3. Demo: complete a stop offline

1. In the ERP, open **Dashboard**, then the **Inner Loop** route. Leave this page open. It refreshes every 5 seconds.
2. On the phone, sign in as `D-101`. The seven stops download and are stored on the phone.
3. Turn on **airplane mode**.
4. Open stop 1, choose **Completed**, enter gallons, take a photo, add a note, tap **Save**.
5. The stop shows as completed immediately with a **waiting to sync** tag. The bar at the top reads "Offline. 1 update saved on this phone". You can close and reopen the app and the update is still there.
6. Turn airplane mode off. Within 15 seconds (or tap **Sync now**) the bar changes to "All updates synced" with the time.
7. The ERP route detail now shows the stop as completed with the gallons, photo and note. The **Sync activity** table at the bottom lists the action it received.

## How offline sync works

- **Outbox.** Saving a stop never calls the network. It appends an action to a queue in AsyncStorage and the screen is drawn from "last downloaded stops plus queued actions", so the result is visible at once.
- **Sync.** A sync pass runs on a 15-second timer, when the app comes to the foreground, after every save, and on demand. It pushes queued actions oldest first, then downloads today's route.
- **Idempotency.** Each action gets a UUID on the phone. The server writes that id as the primary key of `SyncLog` in the same transaction that updates the stop. If the phone sends an action twice (for example the response was lost), the second one is answered with `duplicate` and changes nothing. Photos are stored under the action id, so a resend overwrites the same file.
- **Failure handling.** No connection or a server error leaves the action in the queue for the next pass. A request the server can never accept (the office deleted the stop, or it belongs to another driver) is dropped so it cannot block the queue, and is counted in the sync bar.

### API used by the mobile app

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/mobile/login` | `{ code }` returns `{ token, driver }` |
| `GET` | `/api/mobile/route?date=YYYY-MM-DD` | The driver's ordered stops for that day |
| `POST` | `/api/mobile/sync` | Multipart: `action` (JSON) and optional `photo`. Returns `applied` or `duplicate` |
| `GET` | `/api/uploads/<file>` | A stop photo |

All but login and uploads require `Authorization: Bearer <token>`.

## Project layout

```
web/
  app/                 ERP screens and API routes
    api/mobile/        login, route, sync
    routes/            route list, builder, detail
    vendors/ customers/ drivers/
  components/          shared UI, RouteBuilder
  lib/
    sync.ts            validates and applies a sync action exactly once
    party.ts           shared vendor/customer CRUD
    routes.ts          stop totals
  prisma/
    schema.prisma      Vendor, Customer, Driver, Route, Stop, SyncLog
    seed.ts
  uploads/             stop photos (local disk)
  tests/
mobile/
  App.tsx              navigation
  src/
    store.tsx          session, cached stops, outbox, sync loop
    outbox.ts          pure outbox logic (unit tested)
    api.ts             calls to the web API
    screens/           Login, Route, Stop
```

## Checks

```bash
cd web
npm run lint && npm run typecheck && npm test && npm run build

cd ../mobile
npm run typecheck && npm test
```

The web tests run against their own database (`web/prisma/test.db`) and do not touch demo data.

## Known limits of this MVP

- **Auth is demo grade.** A driver code is the whole login, and the ERP has no login at all. Do not expose it to the internet.
- **Plain HTTP on the local network.** Fine in Expo Go. A standalone build would need HTTPS or a cleartext exception.
- **Signing in needs a connection.** Everything after that works offline.
- **Last write wins.** If the office and the driver change the same stop, the later sync overwrites.
- **The route is for "today"** by the phone's calendar. A new day clears the cached stops. Queued updates are kept and still sync.
