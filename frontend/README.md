# Nexus Frontend — Adaptive Learning Dashboard & UI

Modern, high-performance Next.js 14 frontend for Nexus, built with React Server Components, Tailwind CSS, and a True Black OLED aesthetic.

- **Live Deployment:** [https://nexus-kappa-three-48.vercel.app/](https://nexus-kappa-three-48.vercel.app/)
- **Connected Backend:** [https://nexus-2qcw.onrender.com](https://nexus-2qcw.onrender.com)

---

## Features

- **True Black OLED Visuals:** Pure `#000000` base with `#090A0F` surfaces and vibrant accents (Electric Cobalt `#3B82F6`, Emerald `#10B981`, Amber `#F59E0B`, Ruby `#EF4444`).
- **Live SSE Streaming:** Server-Sent Events hooks for real-time roadmap token streaming and live regeneration animations.
- **Adaptive Assessments:** Interactive multi-choice assessments with immediate feedback and difficulty adjustment indicators.
- **Level Progress & Gate Tests:** Progression tracking with gate test evaluations, retry mechanics, and remedial sublevel offers.
- **Supabase Authentication:** Seamless sign-in with Google OAuth and session management.

---

## Local Development

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure Environment

Create `.env.local` based on `.env.example`:

```ini
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_BACKEND_URL=https://nexus-2qcw.onrender.com  # Or http://localhost:8000 for local dev
```

### 3. Start Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## Production Build

```bash
pnpm build
pnpm start
```
