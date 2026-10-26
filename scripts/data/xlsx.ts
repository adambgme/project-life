import ExcelJS from 'exceljs'

export type Cell = string | number | null

/** A worksheet as plain rows of strings and numbers (0-based), with rich text flattened. */
export async function readSheetRows(file: URL, sheetName: string): Promise<Cell[][]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(file.pathname)
  const sheet = workbook.worksheets.find((ws) => ws.name.toLowerCase() === sheetName.toLowerCase())
  if (!sheet) throw new Error(`${file.pathname}: no sheet "${sheetName}" (have: ${workbook.worksheets.map((ws) => ws.name).join(', ')})`)
  const rows: Cell[][] = []
  sheet.eachRow({ includeEmpty: true }, (row, number) => {
    const values = (row.values as unknown[]).slice(1)
    rows[number - 1] = values.map(toCell)
  })
  return Array.from(rows, (row) => row ?? [])
}

function toCell(value: unknown): Cell {
  if (value === null || value === undefined) return null
  if (typeof value === 'number' || typeof value === 'string') return value
  if (typeof value === 'object' && 'richText' in value) return (value.richText as { text: string }[]).map((t) => t.text).join('')
  if (typeof value === 'object' && 'text' in value) return String(value.text)
  if (typeof value === 'object' && 'result' in value) return toCell(value.result)
  return String(value)
}
