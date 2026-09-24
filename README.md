# Hadir

Event check-in that takes seconds. Attendees scan a QR code at the door, fill in their details
from their own phone's contact card, and land in one de-duplicated contact database. Organizers
get a live entrance screen and a dashboard.

_Hadir_ is Indonesian and Malay for "present", the word you answer at roll call.

## How the phone's contact card gets into the form

No website can read a phone's contacts or its owner card silently. iOS and Android both block
that, and even native apps must ask first. Hadir uses the standard, consented routes instead,
which are just as fast for the attendee:

| Phone                | What happens                                                                                                                                                                                                                                                         |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **iPhone (Safari)**  | Every field carries the right `autocomplete` hint, so tapping _Full name_ shows the attendee's own contact card above the keyboard. One tap fills name, email, mobile and company. This needs AutoFill contact info turned on (Settings → Apps → Safari → AutoFill). |
| **Android (Chrome)** | A **Use my contact card** button opens the Contact Picker. The attendee picks their own card and name, email and mobile fill in. Chrome's autofill works as well.                                                                                                    |
| **Coming back**      | After the first check-in the phone remembers them (a signed cookie, opt-out checkbox). At the next event it's one button: **Check in as Rina**.                                                                                                                      |

The Contact Picker is enabled by default only in Chrome on Android. Safari on iOS still keeps it
behind a feature flag, which is why iPhones use AutoFill. It also needs HTTPS, so on a plain-http
dev server it stays hidden and the autofill path is used instead.

## Features

- **Live entrance screen.** A full-screen QR code that changes every 20 seconds, so a forwarded
  photo stops working, plus a running count, the latest arrivals and a welcome banner with
  confetti. It shows first name and last initial only.
- **Printable QR mode** for posters, badges and table cards, with an A4 poster page.
- **Dashboard.** Check-ins, new versus returning contacts, the busiest window, an arrivals chart,
  a device split and a searchable attendee list, all updating live.
- **Contact database.** People are matched by email across every event, their details improve
  with each visit, and everything exports to CSV (Excel-safe, UTF-8).
- **Staff tools.** Add someone by hand, remove a check-in, open or close the doors, and delete a
  contact on request.
- **Consent.** Explicit consent is recorded with a timestamp on every self check-in.

## Quick start

```bash
npm install
npm run dev
```

1. Open <http://localhost:5173/admin>. In development the password is `admin`.
2. Create an event, then click **Entrance screen**.
3. Scan the code with a phone on the **same Wi-Fi**. The dev server listens on your network and
   the QR code uses this computer's Wi-Fi address automatically, because phones can't open
   `localhost`.

To see the dashboard with realistic data, run `npm run demo:seed`. It adds two demo events and
about 60 check-ins with `@example.com` addresses. Delete the `data/` folder to start fresh.

## Configuration

Copy `.env.example` to `.env`. Everything is optional in development.

| Variable                | Purpose                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `ADMIN_PASSWORD`        | Organizer password. **Required in production**: without it, sign-in is disabled.                                                               |
| `ORIGIN`                | Public URL, e.g. `https://checkin.example.com`. **Required in production** by SvelteKit's Node adapter, otherwise every form post is rejected. |
| `PUBLIC_BASE_URL`       | URL printed into QR codes, if it differs from `ORIGIN`.                                                                                        |
| `ORG_NAME`              | Shown in the consent line: "I agree that _SRKK_ may keep these details…"                                                                       |
| `PRIVACY_URL`           | Adds a privacy policy link next to the consent box.                                                                                            |
| `DEFAULT_PHONE_COUNTRY` | Reads local numbers such as `0812-3456-7890` as `+62…`. Default `ID`; use `MY` for Malaysia.                                                   |
| `DEFAULT_TIMEZONE`      | Fallback event time zone. Default `Asia/Jakarta`; new events take the organizer's browser zone.                                                |
| `DB_PATH`               | SQLite file. Default `data/attendance.db`. Put it on a persistent volume.                                                                      |
| `SESSION_SECRET`        | Optional. By default a secret is generated once and stored in the database.                                                                    |
| `ADDRESS_HEADER`        | Behind a reverse proxy, `X-Forwarded-For`, so rate limits see each attendee's IP instead of the proxy's (adapter-node setting).                |
| `XFF_DEPTH`             | Number of proxies in front: `1` for Traefik alone, `2` with Cloudflare proxying on top.                                                        |

## Deploying

This is a standard SvelteKit + `adapter-node` app with SQLite (`npm run build`, then
`node build`), with a `Dockerfile` for container hosts. The Coolify setup for
checkin.situmorang.com, and what was verified, is in [docs/DEPLOY.md](docs/DEPLOY.md).
Things to get right anywhere:

- Serve it over **HTTPS**. The Contact Picker needs HTTPS, and so do secure cookies.
- Set `ADMIN_PASSWORD` and `ORIGIN`, plus `ADDRESS_HEADER` behind a proxy.
- Mount a persistent volume for `DB_PATH`.
- Run a **single instance**. Live updates and rate limits live in memory, and SQLite takes one
  writer.
- `GET /healthz` returns `ok` for health checks.

To run it on a venue laptop with no internet, build it, then start it with
`ORIGIN=http://<laptop-ip>:3000 ADMIN_PASSWORD=… node build` and put the phones on the same
network.

## Data and privacy

- **Contacts:** name, email, mobile (E.164 when it parses), company and job title.
- **Check-ins:** time, device type (iPhone, Android or other), method (form, contact card,
  one-tap or staff) and when consent was given.
- **Entrance screen:** shows first name and last initial, nothing else.
- **Deleting a contact** on the Contacts page removes that person and their whole check-in
  history.
- **Timestamps** in CSV exports are ISO 8601, in UTC.

## Project layout

```
src/
  lib/
    qr.ts                     soft-cornered QR renderer (SVG, browser and server)
    time.ts, names.ts         event time zones, "Rina W."-style public names
    components/               QR code, arrivals chart, device split, event form
    server/
      database.ts             schema (SQLite, created on start)
      checkins.ts             check-in and contact matching logic
      qr-token.ts             rotating QR tokens and the 30-minute scan pass
      auth.ts                 signed organizer session
      bus.ts                  in-process pub/sub behind the live stream
  routes/
    c/[id]/                   attendee check-in page (the QR target)
    admin/(app)/              events, event dashboard, contacts
    admin/events/[id]/        display (entrance screen), stream (SSE), exports, poster
scripts/seed-demo.ts          demo data (npm run demo:seed)
```

## Scripts

```bash
npm run dev         # dev server on your network (port 5173)
npm test            # unit tests: matching, tokens, phone numbers, time zones, CSV
npm run check       # svelte-check / TypeScript
npm run build       # production build in build/
npm run demo:seed   # demo events and check-ins
```
