import { useRegisterSW } from 'virtual:pwa-register/react'

/** Registers the offline service worker. When a new version has downloaded, offers a reload instead of swapping
 * the page out from under someone mid-edit. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  if (!needRefresh) return null
  return (
    <div role="status" className="fixed inset-x-4 bottom-4 z-10 mx-auto flex max-w-md flex-wrap items-center gap-3 rounded-lg border border-ink bg-paper px-4 py-3 shadow-lg">
      <span className="flex-1 text-sm">A new version of Your Life is ready.</span>
      <button type="button" className="rounded-sm bg-ink px-3 py-1.5 font-display text-sm text-paper" onClick={() => void updateServiceWorker(true)}>
        Reload
      </button>
      <button type="button" className="text-sm underline underline-offset-4" onClick={() => setNeedRefresh(false)}>
        Later
      </button>
    </div>
  )
}
