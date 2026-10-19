import { useCallback, useEffect, useMemo, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import Select from "../components/form/Select";
import Button from "../components/ui/button/Button";
import Badge from "../components/ui/badge/Badge";
import { Modal } from "../components/ui/modal";
import {
  Table,
  TableBody,
  TableHeader,
  TableCell,
  TableRow,
} from "../components/ui/table";
import { useAuth, hasPermission } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import { BoxIconLine, EyeIcon } from "../icons";
import { fetchAssets, type Asset } from "../services/assets";
import { fetchLookups } from "../services/lookups";
import { type Room } from "../services/rooms";
import { useToast } from "../hooks/useToast";
import { extractApiError as extractError } from "../utils/error";

const PER_PAGE = 100;

export default function Storage() {
  const { user } = useAuth();
  const { t } = useLang();
  const canView = hasPermission(user, "assets.view");
  const { pushToast } = useToast();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [roomId, setRoomId] = useState("");

  const [selected, setSelected] = useState<Asset | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const storageRooms = useMemo(
    () => rooms.filter((room) => room.is_storage),
    [rooms],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAssets({
        usage_status: "IN_STORAGE",
        condition: "GOOD",
        per_page: PER_PAGE,
      });
      setAssets(res.data.data);
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to load storage items.")));
    } finally {
      setLoading(false);
    }
  }, [pushToast, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Storage only needs assets.view, so the room picker comes from the
        // shared lookup endpoint rather than a rooms.view gated call.
        const res = await fetchLookups();
        if (!cancelled) setRooms(res.data.rooms as Room[]);
      } catch {
        if (!cancelled) setRooms([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    return assets.filter((a) => {
      if (roomId && String(a.room?.id ?? "") !== roomId) return false;
      if (
        q &&
        !`${a.name} ${a.asset_code} ${a.description || ""}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
  }, [assets, searchInput, roomId]);

  const totalValue = useMemo(
    () =>
      filtered.reduce(
        (sum, a) => sum + Number(a.purchase_price || 0),
        0,
      ),
    [filtered],
  );

  if (!canView) {
    return (
      <>
        <PageMeta title={t("Storage | Access Denied")} description={t("Storage management")} />
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-error-600 dark:text-error-400">
            {t("You do not have permission to view assets.")}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title={t("Storage")}
        description={t("Good items in storage.")}
      />

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("Storage")}
          </h3>
          <Badge size="sm" variant="light" color="info">
            {t("Good items in storage.")}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("Total Items")}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              {filtered.length}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("Warehouses")}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              {storageRooms.length}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("Value (Rp)")}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              {totalValue.toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-4 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
            <Input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("Search by code, name, or description...")}
              className="lg:max-w-[280px]"
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Select
                options={storageRooms.map((room) => ({
                  value: String(room.id),
                  label: room.name,
                }))}
                placeholder={t("All warehouses")}
                defaultValue=""
                onChange={setRoomId}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Asset")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Category")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Condition")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Warehouse")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Team")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Purchase Date")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                    {t("Actions")}
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="px-5 py-6 text-center text-sm text-gray-500">
                      {t("Loading...")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="px-5 py-6 text-center text-sm text-gray-500">
                      {t("No items in storage.")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  filtered.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                            <BoxIconLine />
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                              {a.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {a.asset_code}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {a.category?.name || "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <Badge
                          size="sm"
                          variant="light"
                          color={a.condition === "GOOD" ? "success" : "error"}
                        >
                          {a.condition}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {a.room?.name || "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {a.team?.name || "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {a.purchase_date || "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center justify-end whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelected(a);
                              setModalOpen(true);
                            }}
                            startIcon={<EyeIcon />}
                          >
                            {t("View")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} className="max-w-[560px] m-4">
        <div className="no-scrollbar relative w-full max-w-[560px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900">
          {selected && (
            <>
              <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
                {selected.name}
              </h4>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {selected.asset_code}
              </p>
              {selected.photo_url && (
                <img
                  src={selected.photo_url}
                  alt={selected.name}
                  className="mt-4 h-40 w-full rounded-lg border border-gray-200 object-cover dark:border-gray-700"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>{t("Category")}</Label>
                  <p className="text-sm text-gray-800 dark:text-white/90">
                    {selected.category?.name || "-"}
                  </p>
                </div>
                <div>
                  <Label>{t("Condition")}</Label>
                  <p className="text-sm text-gray-800 dark:text-white/90">
                    {selected.condition}
                  </p>
                </div>
                <div>
                  <Label>{t("Warehouse")}</Label>
                  <p className="text-sm text-gray-800 dark:text-white/90">
                    {selected.room?.name || "-"}
                  </p>
                </div>
                <div>
                  <Label>{t("Team")}</Label>
                  <p className="text-sm text-gray-800 dark:text-white/90">
                    {selected.team?.name || "-"}
                  </p>
                </div>
                <div>
                  <Label>{t("Purchase Date")}</Label>
                  <p className="text-sm text-gray-800 dark:text-white/90">
                    {selected.purchase_date || "-"}
                  </p>
                </div>
                <div>
                  <Label>{t("Purchase Price")}</Label>
                  <p className="text-sm text-gray-800 dark:text-white/90">
                    {selected.purchase_price
                      ? Number(selected.purchase_price).toLocaleString("id-ID")
                      : "-"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <Label>{t("Description")}</Label>
                  <p className="text-sm text-gray-800 dark:text-white/90">
                    {selected.description || "-"}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-end gap-3">
                <Button size="sm" variant="outline" onClick={() => setModalOpen(false)}>
                  {t("Close")}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}