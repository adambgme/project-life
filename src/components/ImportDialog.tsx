import { useEffect, useRef } from 'react'
import type { Life } from '../life/store'
import { describeLife, type ImportResult } from '../life/transfer'

export type PendingImport = { result: ImportResult; source: 'file' | 'link' }

type Props = { pending: PendingImport | null; current: Life; onReplace: (life: Life) => void; onCancel: () => void }

/** Shows what an import holds next to what's here now, and replaces only when asked. */
export function ImportDialog({ pending, current, onReplace, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (pending && dialog && !dialog.open) dialog.showModal()
    if (!pending && dialog?.open) dialog.close()
  }, [pending])

  const result = pending?.result
  const hasCurrent = describeLife(current) !== 'Nothing saved'
  return (
    <dialog
      ref={ref}
      aria-labelledby="import-title"
      onClose={onCancel}
      className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-lg border border-ink bg-paper p-5 text-ink backdrop:bg-ink/30"
    >
      {result && (
        <div className="flex flex-col gap-4">
          <h2 id="import-title" className="font-display text-2xl">
            {pending.source === 'link' ? 'Import from a link' : 'Import a backup'}
          </h2>
          {result.ok ? (
            <>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-ink-soft">In the {pending.source === 'link' ? 'link' : 'file'}</dt>
                <dd data-testid="import-incoming">{describeLife(result.life)}</dd>
                <dt className="text-ink-soft">In this browser</dt>
                <dd data-testid="import-current">{describeLife(current)}</dd>
              </dl>
              <p className="text-sm">
                {hasCurrent
                  ? 'Importing replaces everything in this browser with what you are importing.'
                  : 'Importing saves this in this browser.'}
              </p>
              <div className="flex gap-3">
                <button type="button" className="rounded-sm bg-ink px-4 py-2 font-display text-paper" onClick={() => onReplace(result.life)}>
                  {hasCurrent ? 'Replace with import' : 'Import'}
                </button>
                <button type="button" className="px-2 text-sm underline underline-offset-4" onClick={onCancel}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <p role="alert">{result.problem}</p>
              <button type="button" className="self-start px-2 text-sm underline underline-offset-4" onClick={onCancel}>
                Close
              </button>
            </>
          )}
        </div>
      )}
    </dialog>
  )
}
