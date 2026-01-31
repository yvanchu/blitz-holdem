# Hosting Solutions for Blitz Hold'em

This document evaluates hosting platforms for deploying Blitz Hold'em, a real-time multiplayer poker game with WebSocket requirements.

## Application Requirements

| Component | Technology                 | Hosting Needs                    |
| --------- | -------------------------- | -------------------------------- |
| Frontend  | React + Vite + TailwindCSS | Static file hosting with CDN     |
| Backend   | Node.js + Express + ws     | Persistent WebSocket connections |
| State     | In-memory (no database)    | Stateful server process          |

**Critical Requirements:**

- ✅ WebSocket support (persistent connections)
- ✅ Node.js runtime
- ✅ Low latency for real-time gameplay
- ⚠️ No database needed (in-memory state)
- ⚠️ Single server instance OK for MVP (no horizontal scaling needed)

---

## Platform Comparison

### 1. Railway (⭐ Recommended)

**Website:** https://railway.com

| Aspect            | Details                                             |
| ----------------- | --------------------------------------------------- |
| **Pricing Model** | Usage-based, by the second                          |
| **Free Tier**     | 30-day trial with $5 credits, then $1/month + usage |
| **Hobby Plan**    | $5/month (includes $5 usage credits)                |
| **WebSocket**     | ✅ Full support                                     |
| **Monorepo**      | ✅ Native support                                   |

**Pricing Breakdown:**

- CPU: $0.00000772/vCPU/sec (~$0.02/hr)
- Memory: $0.00000386/GB/sec (~$0.01/hr)
- Egress: $0.05/GB
- Estimated monthly: **$2-8** for low traffic

**Pros:**

- Pay only for actual usage (idle = minimal cost)
- Excellent developer experience
- Git push deploys
- Built-in logging and metrics
- Easy environment variables

**Cons:**

- Free tier limited to 1 vCPU / 0.5 GB RAM
- $5 minimum monthly spend on Hobby plan

**Deployment:**

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

---

### 2. Fly.io

**Website:** https://fly.io

| Aspect              | Details                                            |
| ------------------- | -------------------------------------------------- |
| **Pricing Model**   | Per-machine, billed by second                      |
| **Free Tier**       | Legacy only (no longer available for new accounts) |
| **Cheapest Option** | shared-cpu-1x, 256MB: ~$1.94/month                 |
| **WebSocket**       | ✅ Full support                                    |
| **Global Edge**     | ✅ Deploy to 30+ regions                           |

**Pricing Breakdown:**
| Machine Type | RAM | Monthly Cost |
|--------------|-----|--------------|
| shared-cpu-1x | 256MB | $1.94 |
| shared-cpu-1x | 512MB | $3.19 |
| shared-cpu-1x | 1GB | $5.70 |
| shared-cpu-1x | 2GB | $10.70 |

**Additional Costs:**

- Dedicated IPv4: $2/month
- Volumes: $0.15/GB/month
- Egress (NA/EU): $0.02/GB

**Pros:**

- Very cheap for always-on services
- Global edge deployment
- Automatic SSL
- Great for low-latency multiplayer

**Cons:**

- More complex configuration
- No free tier for new users
- Requires credit card

**Deployment:**

```bash
brew install flyctl
fly auth login
cd packages/server
fly launch
fly deploy
```

**fly.toml example:**

```toml
app = "blitz-holdem"
primary_region = "sjc"

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 3001
  force_https = true
  auto_stop_machines = false  # Keep running for WebSocket
  auto_start_machines = true

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512
```

---

### 3. Render

**Website:** https://render.com

| Aspect            | Details                                 |
| ----------------- | --------------------------------------- |
| **Pricing Model** | Instance-based                          |
| **Free Tier**     | ✅ (spins down after 15 min inactivity) |
| **Starter Plan**  | $7/month                                |
| **WebSocket**     | ✅ Full support                         |

**Instance Types:**
| Type | RAM | Price |
|------|-----|-------|
| Free | 512MB | $0 (sleeps after 15 min) |
| Starter | 512MB | $7/month |
| Standard | 2GB | $25/month |

**Pros:**

- Generous free tier for testing
- Simple deployment from Git
- Automatic HTTPS
- Zero-downtime deploys

**Cons:**

- Free tier sleeps (15 min cold start)
- More expensive than Railway/Fly for always-on
- No usage-based pricing

**Note:** Free tier is NOT suitable for Blitz Hold'em because:

- Server sleeps after 15 minutes of inactivity
- WebSocket connections will be dropped
- Cold start takes 30-60 seconds

---

### 4. DigitalOcean App Platform

**Website:** https://www.digitalocean.com/products/app-platform

| Aspect            | Details                |
| ----------------- | ---------------------- |
| **Pricing Model** | Fixed instance pricing |
| **Free Tier**     | Static sites only      |
| **Basic Plan**    | $5/month               |
| **WebSocket**     | ✅ Full support        |

**Container Pricing:**
| Type | vCPU | RAM | Price |
|------|------|-----|-------|
| Basic | 1 (shared) | 512MB | $5/month |
| Basic | 1 (shared) | 1GB | $10/month |
| Professional | 1 | 1GB | $12/month |

**Pros:**

- Predictable pricing
- Simple, reliable platform
- Good documentation
- $200 free credit for new accounts

**Cons:**

- No usage-based pricing
- Less developer-friendly than Railway
- No auto-sleep (always paying)

---

### 5. Vercel

**Website:** https://vercel.com

| Aspect            | Details                          |
| ----------------- | -------------------------------- |
| **Pricing Model** | Serverless functions + bandwidth |
| **Free Tier**     | ✅ Generous for frontend         |
| **WebSocket**     | ❌ Not supported for backend     |

**Why NOT for Backend:**

- Serverless functions have 10-60 second timeout
- No persistent WebSocket connections
- Not designed for stateful applications

**Good For:**

- ✅ Hosting the React frontend
- ✅ Static file serving with global CDN
- ❌ NOT for the WebSocket server

---

### 6. Cloudflare Pages

**Website:** https://pages.cloudflare.com

| Aspect            | Details                                       |
| ----------------- | --------------------------------------------- |
| **Pricing Model** | Free for static sites                         |
| **Free Tier**     | ✅ Unlimited requests                         |
| **WebSocket**     | ❌ (Workers have Durable Objects but complex) |

**Good For:**

- ✅ Hosting the React frontend (free!)
- ✅ Excellent global CDN
- ❌ NOT for the WebSocket server

---

## Recommended Architecture

### Option A: Budget-Friendly (~$2-5/month)

```
┌─────────────────────────────────────────────────┐
│                  Architecture                    │
├─────────────────────────────────────────────────┤
│                                                  │
│   Frontend (Free)          Backend ($2-5/mo)    │
│   ┌─────────────┐          ┌─────────────┐      │
│   │  Cloudflare │          │   Fly.io    │      │
│   │    Pages    │  ──────▶ │  WebSocket  │      │
│   │             │          │   Server    │      │
│   └─────────────┘          └─────────────┘      │
│                                                  │
└─────────────────────────────────────────────────┘
```

| Component | Platform                      | Cost            |
| --------- | ----------------------------- | --------------- |
| Frontend  | Cloudflare Pages              | Free            |
| Backend   | Fly.io (shared-cpu-1x, 512MB) | ~$3.19/month    |
| **Total** |                               | **~$3-4/month** |

### Option B: Best Developer Experience (~$5/month)

```
┌─────────────────────────────────────────────────┐
│                  Architecture                    │
├─────────────────────────────────────────────────┤
│                                                  │
│         Railway (Single Platform)               │
│   ┌─────────────────────────────────────┐       │
│   │  Frontend     │     Backend         │       │
│   │  (Static)     │   (WebSocket)       │       │
│   └─────────────────────────────────────┘       │
│                                                  │
└─────────────────────────────────────────────────┘
```

| Component          | Platform      | Cost                    |
| ------------------ | ------------- | ----------------------- |
| Frontend + Backend | Railway Hobby | ~$5/month (usage-based) |

### Option C: Testing/Development (Free)

```
┌─────────────────────────────────────────────────┐
│                  Architecture                    │
├─────────────────────────────────────────────────┤
│                                                  │
│   Frontend (Free)          Backend (Free*)      │
│   ┌─────────────┐          ┌─────────────┐      │
│   │   Vercel    │          │   Render    │      │
│   │   (Static)  │  ──────▶ │   (Free)    │      │
│   │             │          │   *Sleeps   │      │
│   └─────────────┘          └─────────────┘      │
│                                                  │
└─────────────────────────────────────────────────┘
```

⚠️ **Not recommended for production** - Render free tier sleeps after 15 min

---

## Decision Matrix

| Platform     | WebSocket | Cost/mo | DX         | Cold Start | Monorepo | Best For           |
| ------------ | --------- | ------- | ---------- | ---------: | -------- | ------------------ |
| Railway      | ✅        | $5      | ⭐⭐⭐⭐⭐ |       None | ✅       | Overall best       |
| Fly.io       | ✅        | $2-4    | ⭐⭐⭐⭐   |       None | ⚠️       | Cheapest always-on |
| Render       | ✅        | $0-7    | ⭐⭐⭐⭐   |     30-60s | ✅       | Testing only       |
| DigitalOcean | ✅        | $5+     | ⭐⭐⭐     |       None | ⚠️       | Predictable costs  |
| Vercel       | ❌        | Free    | ⭐⭐⭐⭐⭐ |        N/A | ✅       | Frontend only      |
| Cloudflare   | ❌        | Free    | ⭐⭐⭐⭐   |        N/A | ✅       | Frontend only      |

---

## Final Recommendation

### For Production: **Railway** ($5/month)

**Why:**

1. Best developer experience
2. Usage-based billing (pay for what you use)
3. Native monorepo support
4. Easy environment variables
5. Built-in logging and metrics
6. Git push deploys

### For Budget: **Fly.io** (~$3/month) + **Cloudflare Pages** (free)

**Why:**

1. Cheapest always-on option
2. Global edge deployment
3. Great for low-latency gaming

### Next Steps

1. Choose a platform
2. Set up deployment configuration
3. Configure environment variables:
   - `NODE_ENV=production`
   - `PORT=3001` (or platform default)
   - `CORS_ORIGIN=https://your-frontend-domain.com`
4. Deploy and test WebSocket connectivity

---

## Resources

- [Railway Docs](https://docs.railway.com/)
- [Fly.io Docs](https://fly.io/docs/)
- [Render Docs](https://render.com/docs)
- [DigitalOcean App Platform Docs](https://docs.digitalocean.com/products/app-platform/)
- [Vercel Docs](https://vercel.com/docs)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
