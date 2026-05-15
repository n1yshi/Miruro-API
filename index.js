import express from 'express';
import cors from 'cors';
import routes from './src/routes.js';

let app = express();

let ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',');
let VALID_API_KEY = process.env.API_KEY;
let PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ALLOWED_ORIGINS.length && ALLOWED_ORIGINS[0] !== '' ? ALLOWED_ORIGINS : '*',
  credentials: true,
  methods: ['*'],
  allowedHeaders: ['*'],
}));

app.use((req, res, next) => {
  if (['/', '/docs', '/redoc', '/openapi.json'].includes(req.path)) return next();

  let apiKey = req.headers['x-api-key'];
  if (VALID_API_KEY && apiKey === VALID_API_KEY) return next();

  let origin = req.headers.origin;
  let referer = req.headers.referer;

  let isAllowed = ALLOWED_ORIGINS.some(allowed =>
    (origin && origin.startsWith(allowed)) || (referer && referer.startsWith(allowed))
  );

  if (!isAllowed && ALLOWED_ORIGINS.join('') !== '') {
    return res.status(403).json({ detail: 'Access forbidden: Invalid Origin, Referer, or API Key.' });
  }

  next();
});

app.use(routes);

let HOME = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Miruro Wrapper API v2.0</title><link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;700&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box;font-family:Outfit,sans-serif}body{background:radial-gradient(circle at top,#0f172a,#020617);color:#e2e8f0;min-height:100vh;padding:50px 20px}.container{max-width:960px;margin:0 auto;background:rgba(30,41,59,.5);backdrop-filter:blur(10px);padding:40px;border-radius:24px;border:1px solid rgba(255,255,255,.05);box-shadow:0 20px 40px rgba(0,0,0,.5)}.header{text-align:center;margin-bottom:50px}.logo{width:120px;border-radius:20px;box-shadow:0 0 30px rgba(56,189,248,.3);border:1px solid rgba(255,255,255,.1);margin-bottom:25px}h1{font-size:3em;font-weight:700;background:linear-gradient(90deg,#38bdf8,#818cf8);-webkit-background-clip:text;color:transparent;margin-bottom:10px}.subtitle{color:#94a3b8;font-size:1.1em}.version{display:inline-block;background:rgba(56,189,248,.15);color:#38bdf8;padding:4px 14px;border-radius:20px;font-size:.85em;margin-top:10px;border:1px solid rgba(56,189,248,.2)}.section-title{font-size:1.3em;font-weight:700;color:#818cf8;margin:35px 0 15px;border-left:3px solid #818cf8;padding-left:12px}.endpoint{background:rgba(15,23,42,.8);border-left:4px solid #38bdf8;padding:25px;margin:15px 0;border-radius:0 16px 16px 0}.endpoint:hover{transform:translateX(5px);box-shadow:0 10px 20px rgba(0,0,0,.2);border-left-color:#818cf8;background:rgba(30,41,59,.9)}.method{color:#10b981;font-weight:700;background:rgba(16,185,129,.1);padding:4px 10px;border-radius:6px;font-size:.9em;margin-right:10px}.url{font-family:monospace;color:#cbd5e1;font-size:1.1em}.params{margin-top:10px;font-size:.85em;color:#64748b;font-family:monospace}.params span{color:#a5b4fc}.example{margin-top:15px;font-size:.95em;color:#64748b}a{color:#38bdf8;text-decoration:none;word-break:break-all;font-weight:500}a:hover{color:#818cf8}.desc{color:#cbd5e1;font-size:1em;margin-top:10px;line-height:1.6}.badge{display:inline-block;font-size:.7em;padding:2px 8px;border-radius:6px;margin-left:8px;font-weight:500;vertical-align:middle}.badge-new{background:rgba(16,185,129,.15);color:#10b981;border:1px solid rgba(16,185,129,.3)}.note{background:rgba(250,204,21,.08);border:1px solid rgba(250,204,21,.15);border-radius:10px;padding:14px 18px;margin-top:12px;font-size:.88em;color:#fbbf24}.note b{color:#fde68a}table.param-table{width:100%;margin-top:12px;border-collapse:collapse;font-size:.85em}table.param-table th{text-align:left;color:#818cf8;font-weight:500;padding:6px 10px;border-bottom:1px solid rgba(255,255,255,.08)}table.param-table td{padding:6px 10px;color:#94a3b8;border-bottom:1px solid rgba(255,255,255,.03)}table.param-table td:first-child{color:#a5b4fc;font-family:monospace}.footer{text-align:center;margin-top:50px;color:#475569;font-size:.9em;border-top:1px solid rgba(255,255,255,.05);padding-top:20px}</style></head><body><div class="container"><div class="header"><img src="https://www.miruro.to/icon-512x512.png" alt="Logo" class="logo"><h1>Miruro Wrapper API</h1><div class="subtitle">Decrypted, bypassed, and reverse-engineered anime streaming API</div><div class="version">v2.0</div></div>';

HOME += '<div class="section-title">Search</div>';
HOME += '<div class="endpoint"><div><span class="method">GET</span> <span class="url">/search</span></div><div class="desc">Search anime. Params: query, page, per_page</div><div class="example"><a href="/search?query=naruto">/search?query=naruto</a></div></div>';
HOME += '<div class="endpoint"><div><span class="method">GET</span> <span class="url">/suggestions</span></div><div class="desc">Autocomplete. Params: query</div><div class="example"><a href="/suggestions?query=one">/suggestions?query=one</a></div></div>';
HOME += '<div class="endpoint"><div><span class="method">GET</span> <span class="url">/filter</span></div><div class="desc">Filter by genre, tag, year, season, format, status, sort</div><div class="example"><a href="/filter?genre=Action&format=TV">/filter?genre=Action&format=TV</a></div></div>';

HOME += '<div class="section-title">Collections</div>';
HOME += '<div class="endpoint"><div><span class="method">GET</span> <span class="url">/trending</span></div></div>';
HOME += '<div class="endpoint"><div><span class="method">GET</span> <span class="url">/popular</span></div></div>';
HOME += '<div class="endpoint"><div><span class="method">GET</span> <span class="url">/upcoming</span></div></div>';
HOME += '<div class="endpoint"><div><span class="method">GET</span> <span class="url">/recent</span></div></div>';
HOME += '<div class="endpoint"><div><span class="method">GET</span> <span class="url">/spotlight</span></div></div>';
HOME += '<div class="endpoint"><div><span class="method">GET</span> <span class="url">/schedule</span></div></div>';

HOME += '<div class="section-title">Details</div>';
HOME += '<div class="endpoint"><div><span class="method">GET</span> <span class="url">/info/:id</span></div><div class="example"><a href="/info/20">/info/20</a></div></div>';
HOME += '<div class="endpoint"><div><span class="method">GET</span> <span class="url">/anime/:id/characters</span></div></div>';
HOME += '<div class="endpoint"><div><span class="method">GET</span> <span class="url">/anime/:id/relations</span></div></div>';
HOME += '<div class="endpoint"><div><span class="method">GET</span> <span class="url">/anime/:id/recommendations</span></div></div>';

HOME += '<div class="section-title">Streaming</div>';
HOME += '<div class="note"><b>3 steps:</b> episodes → watch → play</div>';
HOME += '<div class="endpoint"><div><span class="method">GET</span> <span class="url">/episodes/:id</span></div><div class="example"><a href="/episodes/178005">/episodes/178005</a></div></div>';
HOME += '<div class="endpoint"><div><span class="method">GET</span> <span class="url">/watch/:provider/:id/:cat/:slug</span></div><div class="example"><a href="/watch/kiwi/178005/sub/animepahe-1">/watch/kiwi/178005/sub/animepahe-1</a></div></div>';
HOME += '<div class="endpoint"><div><span class="method">GET</span> <span class="url">/sources</span></div><div class="desc">Params: episodeId, provider, anilistId, category</div></div>';

HOME += '<div class="footer"><a href="https://github.com/walterwhite-69/Miruro-API">Miruro-API</a> by Walter</div></div></body></html>';

app.get('/', (req, res) => {
  res.type('html').send(HOME);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || err.statusCode || 500).json({ detail: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log('Miruro Wrapper API running on port ' + PORT);
});

export default app;
