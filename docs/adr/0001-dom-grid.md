# 1. The life grid is drawn with DOM elements, not Canvas or SVG

Date: 26 Oct 2026 · Status: accepted (T1, #3)

The spec left Canvas versus SVG to the first ticket. We draw the grid as plain elements in an ARIA `grid` (one `row`
per year of age, 52 `gridcell`s each, up to about 5,000 boxes), styled with CSS.

- **Accessibility comes free:** every box is focusable with a roving tab stop and has its own accessible name, which
  Canvas can't give and SVG makes awkward.
- **Theming and print are CSS:** light/dark tokens, eras, patterns and the print poster (T11) are style rules.
- **Fast enough:** about 4,700 elements render once per change. Interaction (focus, hover) doesn't re-render the grid.

Consequences: automated accessibility scans of the full grid are slow (axe takes about 36s), so the browser tests scan
two sample rows plus the current one. If later layers (statistics shading, eras) make rendering slow, draw the
decoration on a Canvas behind the same DOM grid rather than replacing it.
