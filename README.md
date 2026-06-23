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
mkdir my-protected-app
cd my-protected-app
npm init -y
npm install express git+https://github.com/dein-user/aegis-antibot.git
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

  // Setup Aegis
  const aegis = new Aegis({
    apiKey: 'my-secret-key-change-me',
    challengeDifficulty: 3,
    enableTelemetry: true,
  });
  await aegis.initialize();

  // Setup request validation
  const middleware = new AegisMiddleware({
    apiKey: 'my-secret-key-change-me',
    requireValidation: true,
    blockHighRisk: true,
    challengeOnSuspicious: true,
    rateLimit: 100,
    rateLimitWindow: 60000,
  });

  // Serve SDK to browser (fingerprinting, challenges, signing)
  app.get('/aegis/sdk.js', (req, res) => {
    res.type('js').send(aegis.build.generateSDK());
  });

  // Browser sends fingerprint, server returns token
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

  // Check if request is safe. Returns allow, challenge, or block
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

  // Start server
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

### Applying to your existing API routes

You do not need to restructure your whole app. Protect individual routes by running them through the middleware:

```typescript
// Protect your route
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

  // Your code here
  const cart = req.body.cart;
  const order = await processOrder(cart);
  res.json({ orderId: order.id });
});
```

---

### Strip comments from submitted code (security)

Aegis removes `//` comments from code before running it in the protected VM. This prevents attackers from disguising malicious logic inside comments.

```typescript
// Auto-strip comments in VM
const result = await aegis.runProtectedCode(`
  // this comment is removed
  const x = 42;
  x + 1;
`);

// Strip comments from user code
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
// File: app/api/protected/route.ts
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

// Check for bots
const detection = aegis.detectAutomation();

// Get browser fingerprint
const fingerprint = aegis.generateFingerprint();

// Make a proof-of-work challenge
const challenge = aegis.createChallenge('hash', 3);

// Check if challenge was solved
const result = await aegis.verifyChallenge(response);

// Create a session for trusted clients
const session = await aegis.createSession();

// Get risk score
const risk = aegis.calculateRisk({ detection, fingerprint, challengeResults });

// Run code in protected VM (comments removed)
const value = await aegis.runProtectedCode('2 + 3 * 4;');

// Remove comments from any code
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
