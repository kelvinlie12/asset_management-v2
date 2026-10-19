import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import Badge from "../components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableHeader,
  TableCell,
  TableRow,
} from "../components/ui/table";
import { useAuth, hasPermission } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import { fetchVehicleUnitSummary, type VehicleUnitSummary } from "../services/vehicles";
import { useToast } from "../hooks/useToast";
import { extractApiError as extractError } from "../utils/error";

/**
 * Fleet overview per company.
 *
 * Vehicles are owned by exactly one unit, so this is the page that answers
 * "which vehicles belong to which company". A unit-scoped user sees a single
 * row for their own unit; a super admin sees one row per unit and can jump
 * straight into that unit's filtered vehicle list.
 */
export default function VehicleUnits() {
  const { t } = useLang();
  const { user } = useAuth();
  const canView = hasPermission(user, "vehicles.view");
  const isSuperAdmin = user?.role === "super_admin";

  const [units, setUnits] = useState<VehicleUnitSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { pushToast } = useToast();

  const loadUnits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchVehicleUnitSummary();
      setUnits(res.data.units ?? []);
    } catch (err) {
      pushToast("error", extractError(err, t("Failed to load vehicles.")));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canView) loadUnits();
    else setLoading(false);
  }, [canView, loadUnits]);

  if (!canView) {
    return (
      <>
        <PageMeta
          title={`${t("Vehicles per Team")} | ${t("Access Denied")}`}
          description={t("Vehicles owned by each team")}
        />
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-error-600 dark:text-error-400">
            {t("You do not have permission to view vehicles.")}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title={t("Vehicles per Team")}
        description={t("Each company has its own vehicles.")}
      />

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("Vehicles per Team")}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isSuperAdmin
              ? t("Every company and the vehicles it owns.")
              : t("Only your own team is shown.")}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Team")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Vehicles")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Tax Paid")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Overdue")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("Due Soon")}
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                    {t("Actions")}
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="px-5 py-6 text-center text-sm text-gray-500">
                      {t("Loading...")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading && units.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="px-5 py-6 text-center text-sm text-gray-500">
                      {t("No teams found.")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  units.map((row) => (
                    <TableRow key={row.team.id}>
                      <TableCell className="px-5 py-4">
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {row.team.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {row.team.description || row.team.slug}
                        </p>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {row.total}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {row.tax_paid}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        {row.tax_overdue > 0 ? (
                          <Badge size="sm" variant="light" color="error">
                            {row.tax_overdue}
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-400">0</span>
                        )}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        {row.tax_due_soon > 0 ? (
                          <Badge size="sm" variant="light" color="warning">
                            {row.tax_due_soon}
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-400">0</span>
                        )}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-right">
                        <Link to={`/vehicles?team_id=${row.team.id}`}>
                          <Button size="sm" variant="outline">
                            {t("View Vehicles")}
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </>
  );
}
