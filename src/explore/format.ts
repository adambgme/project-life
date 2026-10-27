/** A published date ("2026-04-15") as "15 April 2026", the same calendar day wherever the reader is. */
export function longDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}
