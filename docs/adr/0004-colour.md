# 4. Colour that doesn't carry meaning alone

Date: 27 Oct 2026 · Status: accepted (T14, #16)

**The problem.** The first story palette failed the dataviz palette validator (`validate_palette.js`). Work and Health
were indistinguishable for deuteranopes (ΔE 0.5). Home and This week were hard to tell apart even with full colour
vision (ΔE 2.3). Lived green, Work, Travel and Other also read as grey.

**Fewer hues doing the work.** Nine colours (seven categories, Lived and This week) can't all be told apart pairwise,
because the grid can put any era next to any other. So two of them stopped being hues:
- **Lived** is the ink colour: the classic filled box, unlike any category.
- **This week** keeps its colour, but is marked by its shape: a ring set off from its neighbours by a gap of paper.
  Its colour is #a34a24 in light mode, which also makes it readable as text (4.5:1 on both paper tones).

**Six hues and a grey, validated in each mode** (OKLab ΔE ×100, Machado 2009 simulation):

| Category | Light | Dark |
|---|---|---|
| Home | `#993b01` | `#cb6f42` |
| Work | `#5a48c9` | `#594ac2` |
| Education | `#857e24` | `#9e8f12` |
| Relationships | `#97238c` | `#b32692` |
| Travel | `#139bab` | `#0da2bb` |
| Health | `#3cc376` | `#18744b` |
| Other | `#c0bab4` | `#a6a099` |

- **Light, every pair:** the worst colour-blind pair is 8.2 (target 8), and the worst normal-vision pair 15.8 (floor 15).
- **Dark, adjacent pairs in legend order:** 11.2 colour-blind and 18.9 normal vision. Dark mode's narrower lightness
  band can't separate every pair (Home and Education are close for deuteranopes). Each category keeps its light-mode
  hue, stepped for the dark surface.
- **Relief on contrast:** some fills are under 3:1 against the paper. Every era is also named in the key, on hover and
  in each box's accessible name, which is the relief WCAG 1.4.11 allows.

**Patterns.** A setting, "Patterns on eras", gives each category its own texture over the fill, drawn in the paper
colour: lines at four angles, a crosshatch and rings, with Other left plain. It carries the difference for colour-blind
readers and on black-and-white prints. It is off by default so the grid stays calm, and is saved with the profile.

People can still choose their own category colours. Those are theirs, and the patterns still work over them.

**Around the grid.**
- **Focus:** a focused box gets an ink outline with a paper band inside it, so the ring shows against ink, paper or any
  era.
- **This week:** its ring has a wider paper gap, so it stays clear of the inked weeks next to it.
- **Forced colours:** in forced-colours mode (Windows high contrast), the grid and key keep their own colours, because
  stripping the fills would make lived, this week, eras and the future identical.
- **Future eras:** patterns on eras still ahead are drawn in the era's own colour, since paper lines vanish on their
  pale wash.

**Share image.** The canvas draws the same patterns (when the setting is on) and the same key as the page: Lived, Now
with its ring, each era, Moment and Goal (#34).
