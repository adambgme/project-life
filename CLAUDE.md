# project-life: notes for Claude sessions

Adam's life calendar: a fork of [bryanbraun/your-life](https://github.com/bryanbraun/your-life) (MIT), served on
GitHub Pages at <https://adambgme.github.io/project-life/>. Owned by the **Life Calendar** agent
(~/Work/briefs/AGENT-ORG.md). A full redesign is being planned (26 Oct 2026); see the `wayfinder:map` issue.

## Rules
- **The repo is public.** Never commit personal data: birth dates, family names, life events. Users' data stays in
  their browser; examples use obviously made-up data.
- **Shipping:** `gh-pages` has no protection or required checks yet, so open PRs and leave them for Adam (no
  `ship-pr`) until the repo meets ~/Work/briefs/PLATFORM-STANDARD.md §8.
- **Pages deploys from GitHub Actions** (build type `workflow`, since 26 Oct 2026). Pushing to `gh-pages` no longer
  publishes. The first Actions deploy replaces the live site, so it must be a working build.
- No AI attribution lines in commits or PRs.
- Keep the MIT licence and the credit to Bryan Braun and Wait But Why.

## Agent skills

Matt Pocock's skills are vendored in `.claude/skills/` at a pinned commit (see README.md).

### Issue tracker

GitHub Issues on `adambgme/project-life`, via `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) as GitHub labels of the same names. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
