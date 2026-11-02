import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { postRows } from './sheet.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const DATA = path.join(__dirname, 'data');
const FILE = path.join(DATA, 'responses.jsonl');   // every answer, one per line (never rewritten, only added to)
const SYNCED = path.join(DATA, 'synced.jsonl');    // ids already saved in the Google Sheet
const LEGACY = path.join(DATA, 'responses.json');  // older versions of this app
const DIST = path.join(__dirname, '..', 'client', 'dist');
const { SHEETS_WEBHOOK_URL: WEBHOOK, ADMIN_KEY, TRUST_PROXY, IMG_HOSTS = '' } = process.env;
const PORT = process.env.PORT || 5000;
const RATE_MAX = Number(process.env.RATE_LIMIT) || 3000;
const FLAVORS = ['red-velvet', 'chocolate'];
const BATCH = 100;
const ALLOW_REPEAT = process.env.ALLOW_REPEAT_VOTES === '1';   // 1 = allow the same name many times (for testing only)

// "Keshav  Raj-Joshi" and "keshav raj joshi" count as the same person
const normName = (n) => n.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

fs.mkdirSync(DATA, { recursive: true });

// ---------- load what is already saved ----------
const readLines = (f) => {
  try {
    return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
};
const toLines = (arr) => (arr.length ? arr.map((x) => JSON.stringify(x)).join('\n') + '\n' : '');

if (fs.existsSync(LEGACY) && !fs.existsSync(FILE)) {   // import answers from the old file format
  try {
    const old = JSON.parse(fs.readFileSync(LEGACY, 'utf8')).map((r) => ({ ...r, id: r.id || crypto.randomUUID() }));
    fs.writeFileSync(FILE, toLines(old));
    fs.writeFileSync(SYNCED, toLines(old.filter((r) => r.synced).map((r) => r.id)));
    fs.renameSync(LEGACY, LEGACY + '.imported');
  } catch (e) { console.error('Could not import old answers:', e.message); }
}

const rows = readLines(FILE);
const syncedIds = new Set(readLines(SYNCED));
const seen = new Set(rows.map((r) => r.id));
const voted = new Set(rows.map((r) => (r.email || '').toLowerCase().trim()).filter(Boolean));   // emails that already voted
const queue = rows.filter((r) => !syncedIds.has(r.id));   // waiting to go to the Google Sheet

const out = fs.createWriteStream(FILE, { flags: 'a' });
const syncOut = fs.createWriteStream(SYNCED, { flags: 'a' });
out.on('error', (e) => console.error('Disk error:', e.message));
syncOut.on('error', (e) => console.error('Disk error:', e.message));
const persist = (entry) => new Promise((ok, fail) => out.write(JSON.stringify(entry) + '\n', (e) => (e ? fail(e) : ok())));

// ---------- send to Google Sheet in batches ----------
// Votes are saved on disk first and the user gets an instant "saved".
// A background loop then sends up to 100 answers at a time, so Google is never flooded.
let busy = false, failures = 0;
async function flush() {
  if (busy || !WEBHOOK || queue.length === 0) return;
  busy = true;
  const batch = queue.slice(0, BATCH);
  const r = await postRows(WEBHOOK, batch);
  if (r.ok) {
    queue.splice(0, batch.length);
    syncOut.write(toLines(batch.map((e) => e.id)));
    failures = 0;
  } else {
    failures++;
    if (failures === 1 || failures % 10 === 0) console.error(`Google Sheet: not saved yet (${queue.length} waiting, will retry). ${r.reason}`);
  }
  busy = false;
}
if (WEBHOOK) {
  const loop = async () => {
    await flush();
    const wait = failures ? Math.min(30000, 3000 * 2 ** Math.min(failures, 4)) : queue.length >= BATCH ? 200 : 3000;
    setTimeout(loop, wait);
  };
  loop();
}

// ---------- app ----------
const app = express();
app.disable('x-powered-by');
if (TRUST_PROXY) app.set('trust proxy', 1);

// Enable CORS for all incoming requests (Vercel, local dev, custom domains)
app.use(cors({
  origin: true,
  credentials: true,
}));
app.options('*', cors());

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'", '*'],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ['https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'https://images.unsplash.com', ...IMG_HOSTS.split(',').map((h) => h.trim()).filter(Boolean).map((h) => `https://${h}`)],
      connectSrc: ["'self'", 'https://*.vercel.app', 'https://*.onrender.com', '*'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(compression());
app.use(express.json({ limit: '10kb' }));

// Spam guard (high limit, because a whole college can share one internet address)
const hits = new Map();
setInterval(() => { const cut = Date.now() - 600000; for (const [k, v] of hits) if (!v.length || v[v.length - 1] < cut) hits.delete(k); }, 60000).unref();
const limiter = (req, res, next) => {
  const now = Date.now();
  let l = hits.get(req.ip);
  if (!l) hits.set(req.ip, (l = []));
  while (l.length && now - l[0] > 600000) l.shift();
  if (l.length >= RATE_MAX) return res.status(429).json({ error: 'Too many tries. Please wait a few minutes.' });
  l.push(now);
  next();
};
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/poll', limiter, async (req, res) => {
  const b = req.body || {};
  const name = clean(b.name, 60);
  const email = clean(b.email, 120).toLowerCase();
  if (!name) return res.status(400).json({ error: 'Please enter your name.' });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (!['yes', 'no'].includes(b.interested)) return res.status(400).json({ error: 'Please choose Yes or No.' });
  const yes = b.interested === 'yes';
  const flavors = yes ? [...new Set((Array.isArray(b.flavors) ? b.flavors : []).filter((f) => FLAVORS.includes(f)))] : [];
  if (yes && flavors.length === 0) return res.status(400).json({ error: 'Please pick at least one flavour.' });

  // same id twice (double tap, retry) = counted once
  const id = typeof b.id === 'string' && /^[\w-]{8,64}$/.test(b.id) ? b.id : crypto.randomUUID();
  if (seen.has(id)) return res.json({ ok: true });

  // Allow repeat votes with the same name, but check by email
  const emailKey = email.trim().toLowerCase();
  if (!ALLOW_REPEAT && emailKey && voted.has(emailKey)) {
    return res.status(409).json({ error: 'Already submitted with this email.' });
  }
  seen.add(id);
  if (emailKey) voted.add(emailKey);

  const entry = {
    id,
    time: new Date().toISOString(),
    name,
    email,
    interested: b.interested,
    flavors,
    quantity: yes ? Math.max(1, Math.min(10, parseInt(b.quantity, 10) || 1)) : 0,
    suggestion: clean(b.suggestion, 300),
  };
  try {
    await persist(entry);
  } catch (err) {
    seen.delete(id);
    if (emailKey) voted.delete(emailKey);
    console.error('Could not save to disk:', err.message);
    return res.status(503).json({ error: 'busy' });
  }
  rows.push(entry);
  queue.push(entry);
  res.json({ ok: true });
});

// Totals, for you only: http://localhost:5000/api/stats   (or /api/stats?key=YOUR_ADMIN_KEY)
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
app.get('/api/stats', (req, res) => {
  const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress) && !req.headers['x-forwarded-for'];
  const allowed = ADMIN_KEY ? safeEq(req.query.key ?? '', ADMIN_KEY) : local;
  if (!allowed) return res.status(403).json({ error: 'Not allowed' });
  const yes = rows.filter((e) => e.interested === 'yes');
  const people = (f) => yes.filter((e) => e.flavors.includes(f));
  const waffles = (list) => list.reduce((s, e) => s + e.quantity, 0);
  res.json({
    responses: rows.length,
    interested: yes.length,
    notInterested: rows.length - yes.length,
    totalWaffles: waffles(yes),
    redVelvet: { people: people('red-velvet').length, waffles: waffles(people('red-velvet')) },
    chocolate: { people: people('chocolate').length, waffles: waffles(people('chocolate')) },
    waitingForSheet: queue.length,
    suggestions: rows.filter((e) => e.suggestion).map((e) => ({ name: e.name, suggestion: e.suggestion })),
  });
});

// Website files (after "npm run build"). Hashed files are cached for a year, index.html is never cached.
if (fs.existsSync(DIST)) {
  app.use('/assets', express.static(path.join(DIST, 'assets'), { maxAge: '1y', immutable: true }));
  app.use(express.static(DIST, { maxAge: '1h', setHeaders: (res, p) => { if (p.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache'); } }));
  app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));
}
app.use((err, _req, res, _next) => { res.status(400).json({ error: 'Something went wrong. Please try again.' }); });

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(WEBHOOK ? `Google Sheet: link found (${queue.length} answer(s) waiting to be sent). Run "npm run sheet:check" to test it.` : 'Google Sheet: NOT connected (SHEETS_WEBHOOK_URL is empty in server/.env). Answers are only saved on this computer.');
  console.log(fs.existsSync(DIST) ? 'Website: serving the built site from this server.' : 'Website: not built yet (use npm run dev, or npm start).');
});
server.keepAliveTimeout = 65000;
server.headersTimeout = 70000;

// Never lose queued answers when the server restarts
async function shutdown() {
  server.close();
  for (let i = 0; i < 20 && WEBHOOK && queue.length; i++) { await flush(); await new Promise((r) => setTimeout(r, 300)); }
  out.end(); syncOut.end(() => process.exit(0));
  setTimeout(() => process.exit(0), 8000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('unhandledRejection', (e) => console.error('Problem:', e?.message || e));
process.on('uncaughtException', (e) => console.error('Problem:', e?.message || e));
