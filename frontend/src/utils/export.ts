/**
 * Spreadsheet (Excel) export helpers.
 *
 * The app ships no spreadsheet library, so exports are produced as CSV with a
 * UTF-8 BOM and a `;` separator. Excel opens that natively and, unlike a plain
 * comma file, keeps Indonesian decimal commas and thousand separators readable.
 */

const SEPARATOR = ";";

/** Turn any value into a single spreadsheet cell. */
function cell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  // A quote inside a cell is escaped by doubling it. Any value that could be
  // read as a separator, a line break or a formula is quoted.
  if (/["\n\r;]/.test(text) || /^[=+\-@\t]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Build the CSV body from a header row and the data rows. */
export function buildCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][],
): string {
  const lines = [headers, ...rows].map((row) => row.map(cell).join(SEPARATOR));
  return lines.join("\r\n");
}

/** Filename stem: "Asset Data" + timestamp -> "asset-data-20261021-1049". */
export function exportFileName(stem: string, stamp = new Date()): string {
  const slug = stem
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const pad = (n: number) => n.toString().padStart(2, "0");
  const date = [
    stamp.getFullYear(),
    pad(stamp.getMonth() + 1),
    pad(stamp.getDate()),
  ].join("");
  const time = [pad(stamp.getHours()), pad(stamp.getMinutes())].join("");
  return `${slug || "export"}-${date}-${time}`;
}

/**
 * Download a CSV Excel opens without a conversion prompt.
 *
 * `fileStem` is the human title of the report; the date suffix keeps repeated
 * exports of the same page apart.
 */
export function exportToExcel(
  fileStem: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
): void {
  const csv = `${buildCsv(headers, rows)}\r\n`;
  // The BOM is what tells Excel the file is UTF-8 rather than ANSI.
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${exportFileName(fileStem)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
