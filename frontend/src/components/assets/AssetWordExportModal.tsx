import { useEffect, useMemo, useState } from "react";
import { Modal } from "../ui/modal";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import Checkbox from "../form/input/Checkbox";
import { DownloadIcon } from "../../icons";
import { useLang } from "../../context/LanguageContext";
import { exportWordDocument, escapeHtml } from "../../utils/exportWord";
import {
  conditionLabel,
  USAGE_STATUS_OPTIONS,
  type Asset,
  type AssetFilters,
} from "../../services/assets";

interface AssetWordExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Loads every asset matching the screen filters (walked across API pages). */
  loadAssets: (filters: AssetFilters) => Promise<Asset[]>;
  /** Current screen filters, so the export matches what the list shows. */
  filters: AssetFilters;
}

/**
 * Builds a Word document from a set of assets.
 *
 * Each asset becomes its own section with the fields an operator needs on
 * paper: identity, placement and condition. Kept here (not in the exporting
 * screen) so the Assets page only has to open a modal.
 */
function renderAssetDocument(
  t: (s: string) => string,
  assets: Asset[],
): string {
  return assets
    .map((a) => {
      const usage =
        USAGE_STATUS_OPTIONS.find((o) => o.value === a.usage_status)?.label ??
        a.usage_status;
      const fields = [
        [t("Code"), a.asset_code],
        [t("Name"), a.name],
        [t("Category"), a.category?.name ?? "-"],
        [t("Company"), a.team?.name ?? "-"],
        [t("Team"), a.work_team?.name ?? "-"],
        [t("Condition"), conditionLabel(a.condition)],
        [t("Usage Status"), t(usage)],
        [t("Location"), a.room?.name ?? "-"],
        [t("Assigned To"), a.assigned_user?.name ?? "-"],
        [t("Quantity"), a.quantity],
        [t("Description"), a.description ?? "-"],
      ];
      const rows = fields
        .map(
          ([label, value]) =>
            `<tr><td class="field-label">${escapeHtml(label)}</td>` +
            `<td class="field-value">${escapeHtml(value ?? "-")}</td></tr>`,
        )
        .join("");
      return (
        `<h2>${escapeHtml(a.name)} — ${escapeHtml(a.asset_code)}</h2>` +
        `<table>${rows}</table>`
      );
    })
    .join("");
}

export default function AssetWordExportModal({
  isOpen,
  onClose,
  loadAssets,
  filters,
}: AssetWordExportModalProps) {
  const { t } = useLang();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"all" | "pick">("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reload the item list each time the modal opens, so it always reflects the
  // current filters and any asset added since the page loaded.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const all = await loadAssets(filters);
        if (cancelled) return;
        setAssets(all);
      } catch {
        if (!cancelled) setError(t("Failed to export data."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // `filters` is a fresh object each render in the host; depend on identity
    // only when the modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Reset the selection to "all items" every time the modal is opened.
  useEffect(() => {
    if (isOpen) {
      setMode("all");
      setSelected([]);
      setSearch("");
    }
  }, [isOpen]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter(
      (a) =>
        a.asset_code.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q),
    );
  }, [assets, search]);

  const allVisibleSelected =
    visible.length > 0 && visible.every((a) => selected.includes(a.asset_code));

  function toggle(code: string) {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }

  function toggleAllVisible() {
    const codes = visible.map((a) => a.asset_code);
    setSelected((prev) =>
      allVisibleSelected
        ? prev.filter((c) => !codes.includes(c))
        : Array.from(new Set([...prev, ...codes])),
    );
  }

  function handleExport() {
    const chosen =
      mode === "all"
        ? assets
        : assets.filter((a) => selected.includes(a.asset_code));

    if (chosen.length === 0) {
      setError(t("Select at least one item to export."));
      return;
    }

    const body = renderAssetDocument(t, chosen);
    exportWordDocument(t("Asset Data"), body);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[640px] m-4">
      <div className="no-scrollbar max-h-[85vh] w-full max-w-[640px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-8">
        <h4 className="mb-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
          {t("Export Word")}
        </h4>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          {t("Choose which asset codes to include in the Word document.")}
        </p>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:gap-6">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200">
            <input
              type="radio"
              name="word-export-mode"
              checked={mode === "all"}
              onChange={() => setMode("all")}
              className="h-4 w-4"
            />
            {t("All items")} ({assets.length})
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200">
            <input
              type="radio"
              name="word-export-mode"
              checked={mode === "pick"}
              onChange={() => setMode("pick")}
              className="h-4 w-4"
            />
            {t("Select items")}
          </label>
        </div>

        {mode === "pick" && (
          <div className="mb-4 rounded-xl border border-gray-200 dark:border-gray-800">
            <div className="border-b border-gray-200 p-3 dark:border-gray-800">
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Search by code or name...")}
              />
              <div className="mt-2 flex items-center justify-between">
                <Checkbox
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                  label={t("Select all")}
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {t("{count} selected", { count: selected.length })}
                </span>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto p-2">
              {loading && (
                <p className="p-3 text-sm text-gray-500">{t("Loading...")}</p>
              )}
              {!loading && visible.length === 0 && (
                <p className="p-3 text-sm text-gray-500">
                  {t("No assets found.")}
                </p>
              )}
              {!loading &&
                visible.map((a) => (
                  <label
                    key={a.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(a.asset_code)}
                      onChange={() => toggle(a.asset_code)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-gray-800 dark:text-white/90">
                      <span className="font-medium">{a.asset_code}</span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {" — "}
                        {a.name}
                      </span>
                    </span>
                  </label>
                ))}
            </div>
          </div>
        )}

        {error && (
          <p className="mb-3 text-sm text-error-600 dark:text-error-400">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button
            size="sm"
            onClick={handleExport}
            disabled={loading}
            startIcon={<DownloadIcon className="h-4 w-4" />}
          >
            {t("Export Word")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
