# 5. Motion that never hides anything

Date: 28 Oct 2026 · Status: accepted

**The ask.** A page that reads as one story down a single scroll, with scroll animation of the quality of Apple's
product pages and design agencies' sites.

**Few moments, calm timing.**
- The page is about lifetimes, so motion is slow and eases out (`--ease-calm`, 0.2–0.9 s). It never bounces.
- Three set pieces carry the feel:
  - the grid inking in, on every visit (Adam's choice);
  - the survival odds told step by step beside a chart that stays put;
  - one comparison strip that builds as it arrives.
- Everything else is quiet:
  - each figures chapter rises into place once;
  - the life bar fills as the page opens;
  - switching weeks, months and years fades the new grid in. (A view transition would cross-fade, but the browser holds
    back clicks until it has its snapshot, so a quick second choice was lost.)
- Causes of death, the wellbeing note and the Samaritans line never move.

**Rules.**
- **Finished at rest.** Each element's own style is its final, readable state. Animations only play *from* it, so
  printing, find-in-page, screen readers and reduced motion all get the whole page. Tests check computed opacity and
  position, because Playwright counts an invisible element as visible.
- **Native scrolling.** No smooth-scroll library and no taking over the wheel or touch. Nothing is pinned for long on
  phones.
- **Reduced motion turns everything off.**
  - CSS animations and transitions are off.
  - Motion started from script must check the preference itself, as that rule can't reach it.
- **Cheap to draw.** Only `transform`/`translate`/`scale` and `opacity` animate. The grid's 4,700 boxes are never
  animated one by one; at most a single layer over them moves.
- **No new libraries.** CSS scroll-driven animations do the scroll-linked work:
  - Chromium and Safari 26 have them.
  - Firefox is due to turn them on by default in 159. Until then it shows the page still, which is designed to look
    finished.
  - The rules sit inside `@supports (animation-timeline: view()) and (animation-range: …)`, since Firefox's flagged
    version lacks `animation-range`.
  - `animation-timeline` comes after the `animation` shorthand, which resets it.
- **Other engines are tested.** Motion tests also run in Firefox (the still path) and, in CI, WebKit (Safari).

**Layout decisions (Adam, 28 Oct 2026).**
- Settings goes in a side panel (a bottom sheet on phones) that updates the grid live.
- The grid marks the age half of people like you reach, by default.
- Nations, deprivation and countries become one comparison strip on a shared age axis.
- On phones, the survival steps show as a still, annotated chart.
- The grid's ink-in plays on every visit.
