import type { View } from './lifeMaths'

const VIEWS: readonly View[] = ['weeks', 'months', 'years']

/** The view in the address (`?view=months`); Weeks when absent. The old site's years.html and months.html redirect
 * here with the parameter set. Only the view goes in the address, never anything personal. */
export function readView(search: string): View {
  const value = new URLSearchParams(search).get('view')
  return VIEWS.find((view) => view === value) ?? 'weeks'
}

export function writeView(view: View) {
  const url = new URL(window.location.href)
  if (view === 'weeks') url.searchParams.delete('view')
  else url.searchParams.set('view', view)
  window.history.replaceState(null, '', url)
}

/** Which page: the grid, or the Explore page (`?page=explore`). */
export function readPage(search: string): 'grid' | 'explore' {
  return new URLSearchParams(search).get('page') === 'explore' ? 'explore' : 'grid'
}
