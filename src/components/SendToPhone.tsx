import { useEffect, useState } from 'react'
import { encode } from 'uqr'
import type { Life } from '../life/store'
import { linkFragment } from '../life/transfer'

/** Largest QR code we show: bigger ones are hard to scan from a screen. */
const MAX_VERSION = 30

type Code = { url: string; modules: boolean[][] } | { url: string; tooBig: true }

/** A QR code (and link) that carries the whole life in its fragment, to open on another device. */
export function SendToPhone({ life }: { life: Life }) {
  const [code, setCode] = useState<Code | null>(null)
  const [copied, setCopied] = useState<'no' | 'yes' | 'failed'>('no')
  useEffect(() => {
    let current = true
    void linkFragment(life).then((fragment) => {
      const url = `${window.location.origin}${window.location.pathname}#${fragment}`
      let next: Code
      try {
        next = { url, modules: encode(url, { ecc: 'L', maxVersion: MAX_VERSION }).data }
      } catch {
        next = { url, tooBig: true }
      }
      if (current) setCode(next)
    })
    return () => {
      current = false
    }
  }, [life])

  if (!code) return <p className="text-sm text-ink-soft">Making the code…</p>
  return (
    <div className="flex flex-col gap-3">
      {'modules' in code ? (
        <svg
          role="img"
          aria-label="QR code that opens Your Life with your story on another device"
          viewBox={`-2 -2 ${code.modules.length + 4} ${code.modules.length + 4}`}
          className="w-full max-w-72 self-center bg-white"
          shapeRendering="crispEdges"
          data-testid="qr"
        >
          <path
            fill="#000"
            d={code.modules
              .flatMap((row, y) => row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : '')))
              .join('')}
          />
        </svg>
      ) : (
        <p role="status" className="border-l-2 border-today bg-paper-deep px-3 py-2 text-sm">
          Your story is too big for a QR code. Export a file instead, and open it on the other device.
        </p>
      )}
      <p className="text-sm text-ink-soft">
        Scan it with your phone's camera. The code holds your whole story, so treat it like the story itself: anyone who
        scans it can see it. Nothing goes through a server.
      </p>
      <button
        type="button"
        className="self-start text-sm underline underline-offset-4"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code.url)
            setCopied('yes')
          } catch {
            setCopied('failed')
          }
        }}
      >
        {copied === 'yes' ? 'Link copied' : 'Copy the link instead'}
      </button>
      {copied === 'failed' && (
        <label className="flex flex-col gap-1 text-sm">
          This browser wouldn't copy it. Select the link and copy it yourself:
          <textarea readOnly value={code.url} rows={3} className="rounded-sm border border-rule bg-paper p-2 font-mono text-xs break-all" onFocus={(e) => e.target.select()} />
        </label>
      )}
    </div>
  )
}
