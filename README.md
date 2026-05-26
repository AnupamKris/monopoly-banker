# Monopoly Banker

Monopoly Banker is a mobile-first progressive web app for running the money side of a Monopoly game without paper cash. One player creates a room, becomes the banker, and shares a short room code or QR link with the rest of the table. Players can track balances, send money to each other, deposit to the bank, and request withdrawals while the banker keeps final control over approvals and manual adjustments.

The app is built with Next.js, React, Tailwind CSS, shadcn/ui-style components, Serwist for PWA support, and Convex for the realtime backend.

## Features

- Create private game rooms with 6-character room codes.
- Protect banker controls with an admin password.
- Join rooms by code, saved room history, or `?join=ROOMCODE` deep links.
- Share room invites with a QR code.
- Track player balances in realtime.
- Send money directly between players.
- Deposit money to the bank or request withdrawals from the banker.
- Approve or reject player money requests.
- Manually add or remove money as an admin.
- Kick players from a room as an admin.
- View a room transaction history.
- Install and run as a PWA, including an offline fallback page.

## Tech Stack

- **Framework:** Next.js 16 with React 19
- **Backend:** Convex, including an app-level wrapper and an isolated `monopolyBanker` Convex component
- **Styling:** Tailwind CSS 4
- **UI:** local component library generated in `components/ui`
- **PWA:** Serwist with a generated service worker route
- **Package manager:** pnpm

## Getting Started

### Prerequisites

- Node.js 20 or newer
- pnpm
- A Convex project/deployment

### Install Dependencies

```bash
pnpm install
```

### Configure Environment

Create `.env.local` and set the Convex deployment URL:

```bash
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

For a new Convex deployment, run:

```bash
npx convex dev
```

Follow the Convex prompts, then copy the generated deployment URL into `.env.local` if it was not written automatically.

### Run Locally

Run the Next.js app:

```bash
pnpm dev
```

Run Convex in a second terminal if it is not already running:

```bash
npx convex dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

```bash
pnpm dev
```

Starts the local Next.js dev server with Turbopack.

```bash
pnpm build
```

Builds the production app.

```bash
pnpm start
```

Starts the production Next.js server after a build.

```bash
pnpm lint
```

Runs ESLint.

```bash
pnpm typecheck
```

Runs TypeScript without emitting files.

```bash
pnpm format
```

Formats TypeScript and TSX files with Prettier.

## Project Structure

```text
app/                         Next.js app routes, layout, manifest, PWA service worker route
components/                  App providers and local UI components
convex/                      Convex app functions and generated bindings
convex/components/           Isolated Convex components
convex/components/monopolyBanker/
  schema.ts                  Component database schema
  lib.ts                     Room, player, request, transfer, and transaction logic
hooks/                       Shared React hooks
lib/                         Shared utilities
public/icons/                PWA icons
```

## Convex Backend

The public client API lives in `convex/monopolyBanker.ts`. It wraps the isolated component functions from `convex/components/monopolyBanker/lib.ts`.

The component schema stores:

- `rooms`: room codes, hashed admin passwords, creator connection IDs, and player counts
- `players`: player names, balances, admin status, connection IDs, and join times
- `moneyRequests`: pending, approved, and rejected money or bank withdrawal requests
- `transactions`: audit trail entries for joins, leaves, transfers, bank operations, approvals, and manual changes

The admin password is hashed with SHA-256 before storage. Player sessions are tied to a browser-local connection ID and validated against Convex when the app reloads.

## Deployment

1. Deploy Convex:

   ```bash
   npx convex deploy
   ```

2. Set `NEXT_PUBLIC_CONVEX_URL` in the hosting provider environment.

3. Build and deploy the Next.js app:

   ```bash
   pnpm build
   ```

For Vercel or another Next.js host, make sure the production environment contains the same Convex URL used by the deployed backend.

## Notes

- This app is intended for casual tabletop play, not real-money payments.
- Room access is based on room codes and local browser sessions; it does not currently use external user accounts.
- Generated Convex files under `convex/_generated` and `convex/components/**/_generated` are framework output and should be regenerated through Convex tooling when backend functions change.
