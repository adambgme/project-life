# Your Life

A visualization of your life in years, months and weeks. Your date of birth (and everything else you add) stays in
your browser: nothing is sent anywhere.

Live at <https://adambgme.github.io/project-life/>. The redesign is planned in [issue #2](https://github.com/adambgme/project-life/issues/2);
every merge to `gh-pages` is tested and deployed to Pages by the `Deploy` workflow. The old addresses (`years.html`,
`months.html`, `weeks.html`) redirect to the matching view; the original static pages are in git history.

## Develop

Node 24+.

```sh
npm install
npm run dev        # http://localhost:5173/project-life/
npm test           # unit tests (Vitest)
npx playwright install chromium
npm run e2e        # browser journeys (Playwright, desktop + phone)
npm run typecheck && npm run lint
```

### Statistics

UK life tables, causes of death and life expectancy by area deprivation come from the ONS (Open Government Licence
v3.0); see `docs/adr/0002-life-tables.md`. Other countries' life tables come from the UN: United Nations, Department of
Economic and Social Affairs, Population Division (2024), *World Population Prospects 2024*, licensed under
[CC BY 3.0 IGO](https://creativecommons.org/licenses/by/3.0/igo/). The generated JSON in `src/data/` and
`public/data/countries/` is committed. To refresh it:

```sh
npm run data:fetch   # downloads into data-cache/ (slow and polite: ONS rate-limits)
npm run data:build   # parses, checks and writes src/data/ and public/data/countries/
```

The editions in use are recorded in `scripts/data/editions.json`. On the 1st of each month the **Refresh statistics**
workflow (`.github/workflows/refresh-data.yml`) checks each source for a newer edition (`node scripts/data/refresh.ts`).
If it finds one, it fetches, rebuilds and checks the data, then opens a PR summarising the changes in life expectancy.
A source whose layout has changed fails the job, and no PR is opened. It can also be run by hand from the Actions tab.

## Credit

Forked from [bryanbraun/your-life](https://github.com/bryanbraun/your-life) (MIT), based on the
[Your Life in Weeks](https://waitbutwhy.com/2014/05/life-weeks.html) post by Tim Urban, from
[Wait But Why](https://waitbutwhy.com/).

## Vendored skills

[mattpocock/skills](https://github.com/mattpocock/skills) (MIT, licence copied to
`.claude/skills/LICENSE-mattpocock-skills`), installed into this repo only, not globally.

| | |
|---|---|
| Pinned commit | `5beb35b040e3de97e54fa9e386d7e42d15c295c2` (19 Oct 2026, plugin version 1.3.1) |
| Installed | 26 Oct 2026 |
| What | The 27 skills listed in the upstream `.claude-plugin/plugin.json` (`skills/engineering/*` and `skills/productivity/*`), copied as-is. Not installed: `skills/in-progress`, `skills/misc`, `skills/deprecated`. |

To update: clone upstream, check out the new commit, diff `skills/` against `.claude/skills/`, re-read every changed
`SKILL.md` and support file, copy, and update the commit above.

### Audit

The same files, at the same commit, were audited for `adambgme/store-engine` on 22 Oct 2026, and the copy here is
byte-for-byte identical to that one. The skills are prompt instructions only: no hooks, no `allowed-tools` grants, no
install scripts, nothing runs when a skill loads. Things beyond plain instructions:

- **Bundled shell scripts (templates, not run automatically):** `wizard/template.sh` (opens URLs, writes `.env`, can
  set GitHub Actions secrets/variables with `gh`) and `diagnosing-bugs/scripts/hitl-loop.template.sh` (a prompt-and-
  capture loop for a human).
- **Skills that run commands or start agents:** issue-tracker operations (`gh issue`, labels, `gh api` dependency
  links); `implement`/`implement-spec` (commit, branch, spawn subagents); `wayfinder`/`research` (background
  subagents; wayfinder pushes a `research/<name>` branch); `prototype` (throwaway `prototype/<name>` branch);
  `improve-codebase-architecture` (HTML report in `$TMPDIR`, pulls Tailwind/Mermaid from CDNs); `code-review`,
  `diagnosing-bugs`, `tdd` (git diff, tests); `teach`, `handoff`, `to-questionnaire` (write files).
- Each `agents/openai.yaml` is Codex metadata only; Claude Code ignores it.
