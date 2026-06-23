# Aegis AntiBot

## How it works

1. Server serves a protected JavaScript SDK to the browser
2. The SDK collects a browser fingerprint (canvas, webgl, audio, user-agent, screen)
3. Server checks the fingerprint and gives a risk score
4. If risk is high, the client must solve a challenge (proof-of-work)
5. The client gets a session token after verification
6. Every API request is signed with the session token
7. Server validates the token before allowing access

## Installation

```bash
git clone https://github.com/dein-user/aegis-antibot.git
cd aegis-antibot
npm install
```

## Integration Guide

This guide walks you through integrating Aegis into a web server from scratch. By the end, you will have a running Express server with bot detection, fingerprinting, challenge verification, and request validation.

---

### Step 1: Create a new project

```bash
mkdir my-protected-app
cd my-protected-app
npm init -y
```

### Step 2: Install dependencies

```bash
npm install aegis-antibot express
npm install -D typescript tsx @types/express @types/node
```

Aegis ships as TypeScript. You compile it with `tsc` (or use `tsx` to run directly during development).

Create a `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

### Step 3: Create the server file

Create `src/server.ts`:

```typescript
import express from 'express';
import { Aegis, AegisMiddleware } from 'aegis-antibot';

async function main() {
  const app = express();
  app.use(express.json());

  // ---- Step 4: Initialize Aegis ----
  const aegis = new Aegis({
    apiKey: 'my-secret-key-change-me',
    challengeDifficulty: 3,
    enableTelemetry: true,
  });
  await aegis.initialize();

  // ---- Step 5: Create the validation middleware ----
  const middleware = new AegisMiddleware({
    apiKey: 'my-secret-key-change-me',
    requireValidation: true,
    blockHighRisk: true,
    challengeOnSuspicious: true,
    rateLimit: 100,
    rateLimitWindow: 60000,
  });

  // ---- Step 6: Serve the client SDK ----
  // The browser loads this script. It handles fingerprinting,
  // challenge solving, and signing every request automatically.
  app.get('/aegis/sdk.js', (req, res) => {
    res.type('js').send(aegis.build.generateSDK());
  });

  // ---- Step 7: Session endpoint ----
  // The browser calls this after loading the SDK.
  // It sends a fingerprint, the server evaluates the risk,
  // and returns a session token (plus a challenge if needed).
  app.post('/api/session', async (req, res) => {
    const token = await aegis.createSession();

    if (req.body?.fingerprint) {
      const detection = aegis.detectAutomation();
      const integrity = aegis.checkIntegrity();
      const risk = aegis.calculateRisk({
        detection,
        integrity,
        fingerprint: req.body.fingerprint,
        challengeResults: [],
      });

      if (risk.score > 40) {
        const challenge = aegis.createChallenge('hash', 2);
        res.json({ token, challenge, risk: risk.level, riskScore: risk.score });
        return;
      }

      res.json({ token, risk: risk.level, riskScore: risk.score });
      return;
    }

    res.json({ token });
  });

  // ---- Step 8: Protect your API routes ----
  // Every request to this route is validated.
  // The middleware checks session tokens, signatures, and rate limits.
  // It returns one of three actions:
  //   "allow"     → request is legitimate, serve the response
  //   "challenge" → suspicious, needs proof-of-work
  //   "block"     → malicious, reject immediately
  app.get('/api/protected/data', async (req, res) => {
    const result = await middleware.processRequest({
      headers: req.headers as Record<string, string>,
      ip: req.ip,
      url: req.url,
      method: req.method,
    });

    if (result.action === 'block') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (result.action === 'challenge') {
      res.status(401).json({ error: 'Challenge required', challenge: result.result });
      return;
    }

    res.json({ success: true, data: 'Protected content' });
  });

  // ---- Step 9: Start the server ----
  app.listen(3000, () => {
    console.log('Aegis protected server running on http://localhost:3000');
  });
}

main().catch(console.error);
```

### Step 10: Run it

```bash
npx tsx src/server.ts
```

Open `http://localhost:3000/aegis/sdk.js` in your browser – you should see the protected SDK.

### Step 11: What happens under the hood

```
Browser                          Server
  │                                │
  ├── GET /aegis/sdk.js ──────────►│  (serves protected JS SDK)
  │◄────────── SDK JavaScript ─────┤
  │                                │
  ├── POST /api/session ──────────►│  (sends browser fingerprint)
  │   { fingerprint: {...} }       │
  │                                ├── detectAutomation()
  │                                ├── checkIntegrity()
  │                                ├── calculateRisk()
  │                                │   if risk > 40 → createChallenge()
  │◄────── { token, challenge } ───┤
  │                                │
  │   (solves proof-of-work)       │
  │                                │
  ├── GET /api/protected/data ────►│  (signed request with token)
  │   Headers: X-Client-Session    │
  │            X-Client-Request    ├── middleware.processRequest()
  │            X-Client-Signature  │   if block  → 403
  │            X-Client-Version    │   if challenge → 401
  │◄────── { success: true } ──────┤   if allow  → 200
```

---

### Applying to your existing API routes

You do not need to restructure your whole app. Protect individual routes by running them through the middleware:

```typescript
// Your existing route, now protected
app.post('/api/checkout', async (req, res) => {
  const result = await middleware.processRequest({
    headers: req.headers as Record<string, string>,
    ip: req.ip,
    url: req.url,
    method: req.method,
  });

  if (result.action !== 'allow') {
    res.status(result.response!.statusCode).json(JSON.parse(result.response!.body));
    return;
  }

  // Your original logic
  const cart = req.body.cart;
  const order = await processOrder(cart);
  res.json({ orderId: order.id });
});
```

---

### Strip comments from submitted code (security)

Aegis removes `//` comments from code before running it in the protected VM. This prevents attackers from disguising malicious logic inside comments.

```typescript
// Automatic: comments stripped before VM execution
const result = await aegis.runProtectedCode(`
  // this comment is removed
  const x = 42;
  x + 1;
`);

// Manual: strip comments from user input
app.post('/api/execute', async (req, res) => {
  const safeCode = aegis.stripComments(req.body.code);
  const result = await aegis.runProtectedCode(safeCode);
  res.json({ result });
});
```

---

### Other frameworks

**Fastify:**
```typescript
import Fastify from 'fastify';
import { Aegis, AegisMiddleware } from 'aegis-antibot';

const app = Fastify();
const aegis = new Aegis({ apiKey: 'secret' });
await aegis.initialize();
const middleware = new AegisMiddleware({ apiKey: 'secret' });

app.post('/api/protected', async (request, reply) => {
  const result = await middleware.processRequest({
    headers: request.headers as Record<string, string>,
    ip: request.ip, url: request.url, method: request.method,
  });
  if (result.action !== 'allow') {
    reply.code(result.response!.statusCode).send(JSON.parse(result.response!.body));
    return;
  }
  return { success: true };
});
```

**Next.js (App Router):**
```typescript
// app/api/protected/route.ts
import { Aegis, AegisMiddleware } from 'aegis-antibot';
import { NextRequest, NextResponse } from 'next/server';

const aegis = new Aegis({ apiKey: process.env.AEGIS_API_KEY! });
await aegis.initialize();
const middleware = new AegisMiddleware({ apiKey: process.env.AEGIS_API_KEY! });

export async function GET(req: NextRequest) {
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => { headers[key] = value; });

  const result = await middleware.processRequest({
    headers, ip: req.headers.get('x-forwarded-host') || '',
    url: req.url, method: 'GET',
  });
  if (result.action !== 'allow') {
    return NextResponse.json(JSON.parse(result.response!.body), { status: result.response!.statusCode });
  }
  return NextResponse.json({ success: true });
}
```

## API

```typescript
import { Aegis } from 'aegis-antibot';

const aegis = new Aegis({ challengeDifficulty: 3 });
await aegis.initialize();

// Check for automation
const detection = aegis.detectAutomation();

// Generate browser fingerprint
const fingerprint = aegis.generateFingerprint();

// Create a challenge
const challenge = aegis.createChallenge('hash', 3);

// Verify a challenge response
const result = await aegis.verifyChallenge(response);

// Create a trust session
const session = await aegis.createSession();

// Calculate risk score
const risk = aegis.calculateRisk({ detection, fingerprint, challengeResults });

// Run code in the protected VM (comments auto-stripped)
const value = await aegis.runProtectedCode('2 + 3 * 4;');

// Strip comments from any code
const clean = aegis.stripComments(code);
```

## Middleware Options

| Option | Default | Description |
|--------|---------|-------------|
| `apiKey` | `'aegis-default-key'` | Secret key for HMAC signing |
| `requireValidation` | `true` | Reject requests without valid tokens |
| `blockHighRisk` | `true` | Block requests with risk score > 60 |
| `challengeOnSuspicious` | `true` | Challenge requests with risk score > 30 |
| `rateLimit` | `100` | Max requests per window per IP |
| `rateLimitWindow` | `60000` | Rate limit window in ms |

## License

MIT
