# Saltmarsh Arcade

Casual high-score games themed on our Ghosts of Saltmarsh party. One HTML file per game, no build step, shared leaderboard on a Cloudflare Worker.

- `index.html` — the arcade homepage: the three games, each with its live top 3
- `weatherlight.html` — Weatherlight Run (lane-dodging sail into the storm)
- `dive.html` — Crabber's Cove Dive (one-breath stealth dive: sneak past sahuagin patrols, work oysters and chest locks, surface to bank)
- `throw.html` — Throw the Rogue (fling Wren off the clifftop into the crew and the tent; five throws a round)
- `worker/` — score API (see `CLAUDE_CODE_BRIEF.md` for deployment)

Play: https://cbingham222-cpu.github.io/saltmarsh-arcade/ — or open `index.html` in any browser (the shared boards only load from the Pages link).
