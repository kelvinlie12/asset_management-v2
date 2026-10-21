import { useState } from "react";
import Button from "../ui/button/Button";
import { DownloadIcon } from "../../icons";
import { useLang } from "../../context/LanguageContext";
import { exportToExcel } from "../../utils/export";

interface ExportButtonProps {
  /**
   * Human title of the report, used as the file name stem
   * (e.g. "Asset Data" -> "asset-data-20261021-1049.csv").
   */
  fileStem: string;
  /** Header row of the sheet. */
  headers: () => string[];
  /**
   * Produces every data row to write. Called lazily on click, so the export
   * always reflects what the screen currently filters — and so pages do not
   * pay the cost of walking every API page until the user asks for a file.
   */
  rows: () => Promise<(string | number | null | undefined)[][]>;
  className?: string;
}

/**
 * "Export Excel" action shared by every list screen.
 *
 * The file itself is written by `exportToExcel` (CSV with a UTF-8 BOM that
 * Excel opens natively). This component only owns the button state: while rows
 * are being gathered the button reads "Menyiapkan…" and cannot be clicked
 * twice.
 */
export default function ExportButton({
  fileStem,
  headers,
  rows,
  className,
}: ExportButtonProps) {
  const { t } = useLang();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      const data = await rows();
      exportToExcel(fileStem, headers(), data);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={busy}
      startIcon={<DownloadIcon className="h-4 w-4" />}
      className={className}
    >
      {busy ? t("Menyiapkan…") : t("Export Excel")}
    </Button>
  );
}
