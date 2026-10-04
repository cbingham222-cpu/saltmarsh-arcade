# Saltmarsh Arcade — Claude Code brief

Owner: Chris (DM, Ghosts of Saltmarsh table). Players: six friends on Discord. Nobody will create an account to play.

## Goal

Ship **Weatherlight Run** at a public link with a **shared, account-free leaderboard**, then reuse the same backend for game two (**Crabber's Cove Dive**). The game is already built (`index.html`, self-contained). Your job is hosting, the score API, and the wiring between them. Work phase by phase and stop for approval at each gate.

## What's in this repo

> **Layout update (Oct 2026):** `index.html` is now the arcade homepage (three game cards, each with its live top 3). Weatherlight Run moved, unchanged, to `weatherlight.html`; where the phases below say `index.html` for the game, read `weatherlight.html`. The rule "don't edit the game except its `LEADERBOARD_URL` line" now applies to `weatherlight.html`.

```
index.html              The arcade homepage: links to the three games, top 3 from each board.
weatherlight.html       Weatherlight Run (game one, board id weatherlight-run). Self-contained; two Google Fonts.
dive.html               Crabber's Cove Dive (game two, board id crabbers-cove-dive).
throw.html              Throw the Rogue (game three, board id throw-the-rogue; built in a claude.ai chat, bundles matter-js 0.20.0).
worker/worker.js        Cloudflare Worker: GET/POST scores to KV, keyed by ?game=<id>. Optional Discord webhook.
worker/wrangler.toml    Worker config (KV namespace id, CORS origin locked to the Pages origin).
.gitignore
CLAUDE_CODE_BRIEF.md    This file.
```

Game ↔ API contract (already implemented on both sides):
- `GET  {LEADERBOARD_URL}?game=weatherlight-run` → `[{name, score, helm, dist, ts}]` top 25
- `POST {LEADERBOARD_URL}?game=weatherlight-run` with `{name, score, helm, dist, tokens}` → `{rank, board}`
- In `index.html`, `const LEADERBOARD_URL = ''` near the top of the script is the only switch. Empty = scores stay in localStorage; set = fleet board on.

## Phase 1 — Repo + GitHub Pages (gate: Chris confirms the link loads on his phone)

1. `git init`, commit everything, push to a new **public** GitHub repo (suggest `saltmarsh-arcade`).
2. Enable GitHub Pages from the `main` branch root. Confirm `https://<user>.github.io/saltmarsh-arcade/` serves the game.
3. Do not edit `index.html` in this phase except the single `LEADERBOARD_URL` line (leave it empty for now).

## Phase 2 — Worker + KV (gate: curl round-trip works)

1. Cloudflare account needed (free tier is enough). `npx wrangler login`.
2. `cd worker && npx wrangler kv namespace create SCORES` → paste the id into `wrangler.toml`.
3. Set `ALLOWED_ORIGIN` in `wrangler.toml` to the exact Pages origin (`https://<user>.github.io`, no path).
4. `npx wrangler deploy`. Note the `*.workers.dev` URL.
5. Verify from the terminal and paste the outputs for Chris:
   ```
   curl "https://<worker>/?game=weatherlight-run"                       # expect []
   curl -X POST "https://<worker>/?game=weatherlight-run" -H 'Content-Type: application/json' \
        -d '{"name":"test","score":123,"helm":"wren","dist":4000,"tokens":3}'   # expect {"rank":1,...}
   ```
6. Delete the test entry afterwards (`npx wrangler kv key put --binding SCORES "board:weatherlight-run" "[]"`), or leave it and tell Chris.

## Phase 3 — Wire it (gate: Chris posts a real score from his phone and sees it on a second device)

1. Set `LEADERBOARD_URL` in `index.html` to the Worker URL (no trailing slash). Commit, push, wait for Pages to rebuild.
2. Test on the live Pages URL: title screen shows "The fleet" board; posting a score returns a rank.
3. If CORS fails, the Pages origin and `ALLOWED_ORIGIN` don't match exactly — fix the var, redeploy.

## Phase 4 — Discord (optional, gate: Chris supplies the webhook)

1. Chris creates a webhook in the Discord channel (Channel settings → Integrations → Webhooks).
2. `npx wrangler secret put DISCORD_WEBHOOK` — never commit the URL.
3. Top-5 scores post to the channel automatically. Tune `NOTIFY_RANK` in `worker.js` if it's too chatty.

## Acceptance

- Anyone with the Pages link can play on iPhone, Android and desktop with no login.
- A score posted on one device appears on another within a few seconds.
- The game still works offline-ish: if the Worker is unreachable, the player sees "Couldn't reach the fleet. Saved on this device." and nothing else breaks.
- No secrets in the repo.

## Don't

- Don't change game feel (speeds, spawn rates, perks, fog, scoring) without asking — those numbers were tuned deliberately and Chris wants to playtest them first. Tuning requests will come from him.
- Don't swap the fonts, the lane layout, or the one-tap control scheme. (Lanes and one-tap apply to Weatherlight Run. Crabber's Cove Dive deliberately uses its own controls — tap to swim, hold on loot to work it, hide in kelp — so it doesn't play like game one.)
- Don't add a framework or a build step. One HTML file per game is the point.
- Don't add anti-cheat. It's six friends; trust is the model. (If someone posts 50 million, Chris will know who.)

## Tuning reference (current build, wall-clock)

| Run time | Speed px/s | Row gap px | A row every | Fog reaches y= |
|---|---|---|---|---|
| 1:00 | 309 | 239 | 0.77 s | 197 |
| 2:00 | 434 | 195 | 0.45 s | 263 |
| 2:45 | 560 (plateau) | 150 | 0.27 s | 313 |
| 5:00 | 626 | 141 | 0.22 s | 330 |
| 7:00 | 691 | 131 | 0.19 s | 380 |

Ship's stores (power-ups) and squalls (stages) were added at Chris's request; their knobs (`POWERS`, `POWER_GAP`, `SQUALL_SECS`, `CALM_SECS`) sit just below `HIT_WORDS`. Speed, spawn and fog curves are unchanged.

Ship sits at y=540 on a 640-tall field. Knobs live near the top of the script in `weatherlight.html` (formerly `index.html`): `diff` (first ramp), `squeeze` (second ramp), the `g.spd` line, the `g.fogY` line, and the `g.nextRow` line. McNalty's perk scales both ramps by 1.25.

## Known limits (tell Chris if they bite)

- KV is eventually consistent and the POST is read-modify-write. Two players posting within the same second could drop one entry. Acceptable for this table; a Durable Object is the fix if it ever matters.
- GitHub Pages caches hard. After pushing a change, a hard refresh (or `?v=2` on the URL) may be needed.

## Phase 5 — Game two: Crabber's Cove Dive (separate build, same backend)

Chris's chosen second game. Concept locked at design level, not yet built:

- Push-your-luck dive for sunken loot on one breath. Deeper pays more; you only bank what you surface with. Drown and the run's gold is gone.
- Skill: steering down a scrolling cove between rocks, nets and sahuagin. Endurance: the breath meter and a single long descent per run.
- Same six helmsmen (now divers) with one perk each; same party names. Same visual language as `index.html` (palette, fonts, HUD placement) so the two feel like one cabinet.
- Posts to the same Worker with `?game=crabbers-cove-dive`. The Worker already knows the display name.
- Build it as `dive.html` in this repo. Link the two games from each other's title screens once both exist.

Status: first playable build of `dive.html` is in, linked both ways with Weatherlight Run, and each game has a How to page. Tuning knobs for the dive (breath, descent/ascent speed, hit costs, loot values, depth bonus) sit together near the top of its script; they're a first pass and need a playtest.

Update (Oct 2026): the first build played too much like Weatherlight, so Chris compared three alternatives and picked the stealth version, "Sneak and Harvest", which is now `dive.html`. Eight one-screen shelves of rock and kelp; sahuagin patrol with visible sight cones (`?` fills, `!` hunts); hold on oysters, chest locks, nets and air pockets to work them (timing rings); opened loot alerts patrols for the climb back; a quiet streak (×1–×4) rewards unseen looting. Breath is 90 s. Local scores use `ccd.v2`; the Worker contract is unchanged. All of its numbers are a first pass, untested at the table.
