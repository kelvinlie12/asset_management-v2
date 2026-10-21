/**
 * Word (.doc) export helpers.
 *
 * The app ships no document library, so a Word file is produced as a
 * Word-compatible HTML document: the markup is plain HTML, but the download is
 * named `.doc` and served as `application/msword`. Microsoft Word (and
 * LibreOffice) opens that natively and lays it out as a real document — no
 * conversion prompt, no external dependency.
 */

/** Escape text so arbitrary asset data cannot break the HTML markup. */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** A readable, filesystem-safe filename stem: "Data Aset" -> "data-aset". */
export function wordFileName(stem: string, stamp = new Date()): string {
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
 * Wrap a document body in the minimal HTML shell Word expects.
 *
 * The `@page` rule sets A4 with normal margins, so the printed/opened document
 * already looks like something written in Word rather than a web page.
 */
export function buildWordHtml(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 2cm; }
  body { font-family: "Calibri", "Segoe UI", Arial, sans-serif; font-size: 11pt; color: #1f2937; }
  h1 { font-size: 16pt; margin: 0 0 4pt; }
  .meta { font-size: 10pt; color: #6b7280; margin: 0 0 16pt; }
  h2 { font-size: 13pt; margin: 18pt 0 6pt; padding-bottom: 3pt; border-bottom: 1pt solid #d1d5db; }
  table { border-collapse: collapse; width: 100%; }
  td, th { padding: 4pt 6pt; font-size: 10.5pt; vertical-align: top; }
  th { background: #f3f4f6; text-align: left; font-weight: 600; }
  .field-label { width: 32%; color: #4b5563; }
  .field-value { width: 68%; }
  .grid td { width: 50%; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<p class="meta">${escapeHtml(new Date().toLocaleString("id-ID"))}</p>
${bodyHtml}
</body>
</html>`;
}

/** Download a Word-compatible document built from already-rendered HTML. */
export function exportWordDocument(title: string, bodyHtml: string): void {
  const html = buildWordHtml(title, bodyHtml);
  const blob = new Blob(["\uFEFF", html], {
    type: "application/msword;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${wordFileName(title)}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
