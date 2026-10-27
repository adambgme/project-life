import { useEffect, useRef, useState } from 'react'
import { drawLife, measuredLayout, type DrawInput } from './drawLife'

export type Paper = 'A4' | 'A3'
/** Printable page height (mm) inside 10mm margins. */
const PAGE_HEIGHT_MM: Record<Paper, number> = { A4: 297 - 20, A3: 420 - 20 }
const PAGE_WIDTH_MM: Record<Paper, number> = { A4: 210 - 20, A3: 297 - 20 }
const PX_PER_MM = 96 / 25.4

type Props = {
  open: boolean
  onClose: () => void
  /** Everything needed to draw the grid, given whether to include labels. */
  drawing: (labels: boolean) => DrawInput
  fileName: string
}

/** Size the printed grid to fit one page of the chosen paper, then open the browser's print dialog. The grid's
 * labels and gaps are fixed sizes, so its height isn't proportional to its width: measure it at trial widths. */
export function printPoster(paper: Paper) {
  const figure = document.querySelector<HTMLElement>('[data-testid="grid-figure"]')
  // Everything else that prints (title, summary, key) is measured too; the print gap between parts is 12px.
  const parts = [...document.querySelectorAll<HTMLElement>('[data-print-part]')]
  const others = parts.reduce((sum, el) => sum + el.getBoundingClientRect().height + 12, 0)
  const available = PAGE_HEIGHT_MM[paper] * PX_PER_MM - others - 24
  let width = PAGE_WIDTH_MM[paper] * PX_PER_MM
  if (figure) {
    // Measure at exactly the trial width, even if the screen is narrower than the paper.
    const before = figure.getAttribute('style')
    for (let i = 0; i < 8; i++) {
      Object.assign(figure.style, { width: `${width}px`, maxWidth: 'none', flexShrink: '0' })
      const height = figure.getBoundingClientRect().height
      if (height <= available) break
      width *= (available / height) * 0.98
    }
    if (before === null) figure.removeAttribute('style')
    else figure.setAttribute('style', before)
  }
  document.documentElement.style.setProperty('--print-grid-width', `${Math.floor(width)}px`)
  let style = document.getElementById('print-page-size')
  if (!style) {
    style = Object.assign(document.createElement('style'), { id: 'print-page-size' })
    document.head.append(style)
  }
  style.textContent = `@page { size: ${paper} portrait; margin: 10mm; }`
  window.print()
}

/** Print a poster (A4 or A3) or save a share image (no words unless labels are chosen). */
export function PrintShareDialog({ open, onClose, drawing, fileName }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const preview = useRef<HTMLCanvasElement>(null)
  const [paper, setPaper] = useState<Paper>('A4')
  const [labels, setLabels] = useState(false)

  useEffect(() => {
    const dialog = ref.current
    if (open && dialog && !dialog.open) dialog.showModal()
    if (!open && dialog?.open) dialog.close()
  }, [open])

  useEffect(() => {
    const canvas = preview.current
    if (!open || !canvas) return
    const input = drawing(labels)
    void document.fonts.ready.then(() => {
      const ctx = canvas.getContext('2d')!
      const { width, height } = measuredLayout(ctx, input)
      canvas.width = width
      canvas.height = height
      drawLife(ctx, input)
    })
  }, [open, labels, drawing])

  async function saveImage() {
    const input = drawing(labels)
    await document.fonts.ready
    const scale = 2
    const canvas = document.createElement('canvas')
    const { width, height } = measuredLayout(canvas.getContext('2d')!, input)
    Object.assign(canvas, { width: width * scale, height: height * scale })
    const ctx = canvas.getContext('2d')!
    ctx.scale(scale, scale)
    drawLife(ctx, input)
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'))
    const url = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), { href: url, download: fileName }).click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  const button = 'rounded-sm border border-ink px-3 py-1.5 font-display text-sm hover:bg-paper-deep'
  return (
    <dialog
      ref={ref}
      aria-labelledby="share-title"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto max-h-[90dvh] w-[min(36rem,calc(100%-2rem))] overflow-y-auto rounded-lg border border-ink bg-paper p-5 text-ink backdrop:bg-ink/30"
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between">
          <h2 id="share-title" className="font-display text-2xl">
            Print or share
          </h2>
          <button type="button" onClick={onClose} className="text-sm underline underline-offset-4">
            Close
          </button>
        </div>

        <section className="flex flex-col gap-2" aria-labelledby="print-title">
          <h3 id="print-title" className="font-display text-sm tracking-[0.12em] text-ink-soft uppercase">
            Poster
          </h3>
          <fieldset className="flex gap-5">
            <legend className="sr-only">Paper size</legend>
            {(['A4', 'A3'] as const).map((size) => (
              <label key={size} className="flex items-center gap-2 text-sm">
                <input type="radio" name="paper" checked={paper === size} onChange={() => setPaper(size)} className="accent-accent" />
                {size}
              </label>
            ))}
          </fieldset>
          <button
            type="button"
            className={`${button} self-start`}
            onClick={() => {
              onClose()
              requestAnimationFrame(() => printPoster(paper))
            }}
          >
            Print or save as PDF
          </button>
          <p className="text-xs text-ink-soft">One page, portrait, with your title, summary and key. Choose "Save as PDF" in the print dialog for a file.</p>
        </section>

        <section className="flex flex-col gap-2" aria-labelledby="image-title">
          <h3 id="image-title" className="font-display text-sm tracking-[0.12em] text-ink-soft uppercase">
            Image
          </h3>
          <canvas ref={preview} aria-label="Preview of the image" role="img" className="max-h-64 w-auto self-start rounded-sm border border-rule" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={labels} onChange={(e) => setLabels(e.target.checked)} className="accent-accent" />
            Include labels (title, ages and your era names)
          </label>
          <p className="text-xs text-ink-soft">
            {labels
              ? 'Anyone you share it with will see the names of your eras.'
              : 'No words at all: it shows the shape of your life without the details.'}
          </p>
          <button type="button" className={`${button} self-start`} onClick={() => void saveImage()}>
            Save image
          </button>
        </section>
      </div>
    </dialog>
  )
}
