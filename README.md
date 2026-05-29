# Monopoly Banker

**Play Monopoly without paper cash.**

Monopoly Banker is a mobile-first web app that turns your phone into a digital bank for Monopoly. One player creates a room and becomes the banker. Everyone else joins with a 6-character code or by scanning a QR code. Balances update in realtime, transfers are confirmed with a slide gesture, and the banker controls all approvals.

**[monopoly.anupamkris.dev](https://monopoly.anupamkris.dev)**

## How It Works

1. The banker opens the app, taps **Create Room**, and sets an admin password.
2. A 6-character room code appears. Share it at the table or show the QR code for others to scan.
3. Players tap **Join Room**, enter their name and the code, and start with $1,500.
4. Play Monopoly. Use the app to handle all money movement instead of paper bills.

## Features

**For everyone at the table:**

- Track your balance and see all players' balances in realtime.
- Send money to another player with a dialpad and slide-to-confirm gesture.
- Deposit money to the bank (rent, taxes, chance cards).
- Request money from the bank (passing Go, community chest) — the banker approves it.
- View the full transaction history for the room.
- Rejoin a room automatically if you reload or switch tabs.
- Save up to 10 recent rooms for quick re-entry.

**For the banker:**

- Approve or reject player withdrawal requests from a dedicated admin panel.
- Manually adjust any player's balance (add or remove money).
- Give money directly to a player from the bank.
- Kick players from the room.
- All admin actions are protected behind the password you set when creating the room.

**Sharing and joining:**

- Share a room code verbally or copy it to the clipboard.
- Show a QR code that links directly to your room — players scan and join instantly.
- Deep link support: append `?join=ROOMCODE` to the URL and it auto-joins.

**As a mobile app:**

- Install as a PWA on your phone's home screen — runs standalone without browser chrome.
- Portrait-locked layout designed for one-handed use on a phone.
- Bottom-sheet drawers for transfers, bank operations, and history.
- Dark mode with system preference detection (press `D` to toggle).

## Notes

- This app is for casual tabletop Monopoly play, not real-money payments.
- Room access is based on room codes and local browser sessions. There are no user accounts.
- Admin passwords are hashed with SHA-256 before storage.

---

## Self-Hosting

The rest of this README covers running your own instance of Monopoly Banker.

### Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 with React 19 and Turbopack |
| Backend | Convex (realtime database + server functions) |
| Styling | Tailwind CSS 4 |
| UI | shadcn/ui components, Phosphor Icons |
| PWA | Serwist (service worker) |
| QR Codes | qrcode.react |
| Dark Mode | next-themes |
| Language | TypeScript |
| Package Manager | pnpm |

### Prerequisites

- Node.js 20 or newer
- pnpm
- A Convex account ([convex.dev](https://convex.dev))

### Install

```bash
git clone https://github.com/anupamkris/monopoly-banker.git
cd monopoly-banker
pnpm install
```

### Configure

For a new Convex deployment:

```bash
npx convex dev
```

Follow the prompts to create a project. This generates a deployment URL. Create `.env.local`:

```bash
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

If `npx convex dev` wrote the URL automatically, you can skip the manual step.

### Run Locally

Start Convex and Next.js in separate terminals:

```bash
# Terminal 1 — Convex backend
npx convex dev

# Terminal 2 — Next.js frontend
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Deploy

1. Deploy the Convex backend:

   ```bash
   npx convex deploy
   ```

2. Set `NEXT_PUBLIC_CONVEX_URL` in your hosting provider's environment variables to the production Convex URL.

3. Build and deploy the Next.js app:

   ```bash
   pnpm build
   ```

   For Vercel or another Next.js host, ensure the production environment has the same Convex URL used by the deployed backend.

### Available Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Next.js dev server with Turbopack |
| `pnpm build` | Production build |
| `pnpm start` | Production server (after build) |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript type checking (no emit) |
| `pnpm format` | Prettier formatting |

### Project Structure

```text
app/                            Next.js routes, layout, manifest, service worker
components/                     Providers and UI components
  ui/                           shadcn/ui component library
convex/                         Convex app functions and generated bindings
  components/monopolyBanker/    Isolated Convex component
    schema.ts                   Database schema (rooms, players, requests, transactions)
    lib.ts                      All business logic
hooks/                          Shared React hooks
lib/                            Shared utilities
public/icons/                   PWA icons
```

### Convex Backend

The public API is in `convex/monopolyBanker.ts`, which delegates to the isolated component in `convex/components/monopolyBanker/lib.ts`. The schema has four tables:

- **rooms** — room codes, hashed admin passwords, player counts
- **players** — names, balances, admin status, connection IDs
- **moneyRequests** — pending/approved/rejected money and bank requests
- **transactions** — full audit trail of all operations

Admin passwords are hashed with SHA-256 using the Web Crypto API. Player sessions are tied to a browser-local `connectionId` and validated on every write operation.

Generated files under `convex/_generated` and `convex/components/**/_generated` are Convex framework output. Regenerate them with `npx convex dev` or `npx convex deploy` when backend functions change.
