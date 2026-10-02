// Saltmarsh arcade — score API (Cloudflare Worker + KV).
// One Worker serves every game: scores are keyed by ?game=<id> (weatherlight-run, crabbers-cove-dive, ...).
// GET  /?game=weatherlight-run           -> top 25 [{name, score, helm, dist, ts}]
// POST /?game=weatherlight-run  {name, score, helm, dist, tokens}  -> {rank, board}
// Bindings: SCORES (KV namespace). Vars: ALLOWED_ORIGIN. Secret: DISCORD_WEBHOOK (optional).

const MAX_KEEP = 50;
const MAX_RETURN = 25;
const NOTIFY_RANK = 5;           // post to Discord when a score lands in the top N
const GAME_NAMES = {
  'weatherlight-run': 'Weatherlight Run',
  'crabbers-cove-dive': "Crabber's Cove Dive",
};

export default {
  async fetch(req, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-store',
    };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(req.url);
    const game = (url.searchParams.get('game') || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
    if (!game) return json({ error: 'game query parameter required' }, 400, cors);
    const key = `board:${game}`;

    if (req.method === 'GET') {
      const board = (await env.SCORES.get(key, 'json')) || [];
      return json(board.slice(0, MAX_RETURN), 200, cors);
    }

    if (req.method === 'POST') {
      let body;
      try { body = await req.json(); } catch { return json({ error: 'body must be JSON' }, 400, cors); }
      const name = String(body.name || '').replace(/[^\w .'\-]/g, '').trim().slice(0, 12);
      const score = Math.floor(Number(body.score));
      const helm = String(body.helm || '').replace(/[^a-z]/g, '').slice(0, 20);
      const dist = Math.max(0, Math.floor(Number(body.dist) || 0));
      const tokens = Math.max(0, Math.floor(Number(body.tokens) || 0));
      if (!name) return json({ error: 'name required' }, 400, cors);
      if (!Number.isFinite(score) || score < 0 || score > 50_000_000) return json({ error: 'score out of range' }, 400, cors);

      const board = (await env.SCORES.get(key, 'json')) || [];
      const entry = { name, score, helm, dist, tokens, ts: Date.now() };
      board.push(entry);
      board.sort((a, b) => b.score - a.score || a.ts - b.ts);
      const rank = board.indexOf(entry) + 1;
      const kept = board.slice(0, MAX_KEEP);
      await env.SCORES.put(key, JSON.stringify(kept));

      if (env.DISCORD_WEBHOOK && rank <= NOTIFY_RANK) {
        const title = GAME_NAMES[game] || game;
        const helmLine = helm ? ` at the helm of ${cap(helm)}` : '';
        const content = rank === 1
          ? `🏴 **${name}** just took the top of the board on **${title}** with **${score.toLocaleString()}**${helmLine}.`
          : `⚓ **${name}** posted **${score.toLocaleString()}** on **${title}** (#${rank})${helmLine}.`;
        // fire-and-forget; a failed webhook must not fail the score post
        try { await fetch(env.DISCORD_WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) }); } catch {}
      }
      return json({ rank, board: kept.slice(0, MAX_RETURN) }, 200, cors);
    }

    return json({ error: 'method not allowed' }, 405, cors);
  },
};

function json(data, status, headers) {
  return new Response(JSON.stringify(data), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
