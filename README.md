# Your Life

A visualization of your life, as divided into years, months, and weeks.

## Demos
 - **[Your life in Years](https://bryanbraun.github.io/your-life/years.html)**
 - **[Your life in Months](https://bryanbraun.github.io/your-life/months.html)**
 - **[Your life in Weeks](https://bryanbraun.github.io/your-life/weeks.html)**

## Credit
Based on the [Your life in Weeks](http://waitbutwhy.com/2014/05/life-weeks.html) post by Tim Urban, from [Wait But Why](http://waitbutwhy.com/).

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
