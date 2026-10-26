import { useId } from 'react'
import { readExport } from '../life/transfer'
import type { PendingImport } from './ImportDialog'

/** "Import a file": reads a backup the person picks and hands it over for preview. Nothing is read until they pick. */
export function ImportButton({ onPending, className }: { onPending: (pending: PendingImport) => void; className: string }) {
  const id = useId()
  return (
    <>
      <label htmlFor={id} className={`${className} cursor-pointer`}>
        Import a file
      </label>
      <input
        id={id}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) onPending({ source: 'file', result: readExport(await file.text()) })
        }}
      />
    </>
  )
}
