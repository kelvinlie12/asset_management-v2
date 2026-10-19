import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import PageMeta from "../../components/common/PageMeta";
import {
  AlertIcon,
  ArrowRightIcon,
  BoxCubeIcon,
  BoxIconLine,
  CalenderIcon,
  DollarLineIcon,
  GroupIcon,
  ListIcon,
  TaskIcon,
  TimeIcon,
  UserIcon,
} from "../../icons";
import { fetchDashboard, type DashboardData } from "../../services/dashboard";
import { useAuth, hasPermission } from "../../context/AuthContext";
import { useLang } from "../../context/LanguageContext";
import { useToast } from "../../hooks/useToast";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function formatIDR(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function compactIDR(value: number): string {
  return `Rp ${new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)}`;
}

function percentNumber(part: number | undefined, total: number | undefined): number {
  if (!total) return 0;
  return Math.round(((part ?? 0) / total) * 100);
}

function percentOf(part: number | undefined, total: number | undefined): string {
  return `${percentNumber(part, total)}%`;
}

const PALETTE = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#f43f5e"];

const baseChart: ApexOptions["chart"] = {
  fontFamily: "Outfit, sans-serif",
  toolbar: { show: false },
  background: "transparent",
  foreColor: "#8f98c8",
};

const baseGrid: ApexOptions["grid"] = {
  borderColor: "rgba(255,255,255,0.07)",
  strokeDashArray: 4,
};

/* ------------------------------------------------------------------ */
/* small presentational pieces                                         */
/* ------------------------------------------------------------------ */

type Tone = "purple" | "blue" | "green" | "red";

const TONES: Record<Tone, { card: string; icon: string; stroke: string }> = {
  purple: {
    card: "nx-glow-purple",
    icon: "bg-linear-to-br from-violet-500 to-purple-600 shadow-[0_8px_20px_-6px_rgba(139,92,246,0.9)]",
    stroke: "#c4b5fd",
  },
  blue: {
    card: "nx-glow-blue",
    icon: "bg-linear-to-br from-blue-500 to-blue-600 shadow-[0_8px_20px_-6px_rgba(59,130,246,0.9)]",
    stroke: "#60a5fa",
  },
  green: {
    card: "nx-glow-green",
    icon: "bg-linear-to-br from-emerald-400 to-emerald-600 shadow-[0_8px_20px_-6px_rgba(16,185,129,0.9)]",
    stroke: "#34d399",
  },
  red: {
    card: "nx-glow-red",
    icon: "bg-linear-to-br from-orange-400 to-orange-600 shadow-[0_8px_20px_-6px_rgba(249,115,22,0.9)]",
    stroke: "#fb923c",
  },
};

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const w = 120;
  const h = 48;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - 6 - ((v - min) / span) * (h - 14);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  const gid = `spark-${color.replace("#", "")}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="hidden h-12 w-[120px] shrink-0 xl:block 3xl:hidden"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Ring({ percent, color }: { percent: number; color: string }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(Math.max(percent, 0), 100) / 100) * c;
  return (
    <div className="relative hidden h-14 w-14 shrink-0 xl:block 3xl:hidden">
      <svg viewBox="0 0 52 52" className="h-14 w-14 -rotate-90" aria-hidden="true">
        <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5" />
        <circle
          cx="26"
          cy="26"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-white">
        {percent}%
      </span>
    </div>
  );
}

interface KpiProps {
  tone: Tone;
  label: string;
  value: string;
  sub: string;
  icon: ReactNode;
  to: string;
  spark?: number[];
  ring?: number;
}

function KpiCard({ tone, label, value, sub, icon, to, spark, ring }: KpiProps) {
  const s = TONES[tone];
  return (
    <Link
      to={to}
      className={`group relative flex items-center gap-4 overflow-hidden rounded-2xl border p-4 transition-transform duration-200 hover:-translate-y-0.5 ${s.card}`}
    >
      <div
        className={`flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-2xl text-white [&_svg]:size-7 ${s.icon}`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white/80">{label}</p>
        <p className="mt-0.5 break-words text-2xl font-bold leading-tight text-white xl:text-[26px]">
          {value}
        </p>
        <p className="mt-1 text-xs font-medium text-white/60">{sub}</p>
      </div>
      {spark && spark.length > 1 ? (
        <Sparkline values={spark} color={s.stroke} />
      ) : ring !== undefined ? (
        <Ring percent={ring} color={s.stroke} />
      ) : null}
    </Link>
  );
}

const CARD =
  "rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6";

function CardHeader({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-purple-700 text-white shadow-[0_8px_20px_-8px_rgba(139,92,246,0.9)] [&_svg]:size-5">
          {icon}
        </span>
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* page                                                                */
/* ------------------------------------------------------------------ */

export default function Home() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const canView = hasPermission(user, "assets.view");
  const isSuperAdmin = user?.role === "super_admin";

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchaseMetric, setPurchaseMetric] = useState<"count" | "total">("total");
  const { pushToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchDashboard();
      setData(res.data);
    } catch {
      pushToast("error", t("Failed to load dashboard data."));
    } finally {
      setLoading(false);
    }
  }, [pushToast, t]);

  useEffect(() => {
    if (canView) load();
  }, [canView, load]);

  const m = data?.metrics;
  const purchases = data?.purchases_per_month ?? [];
  const lastPurchase = purchases.length ? purchases[purchases.length - 1] : undefined;
  const prevPurchase = purchases.length > 1 ? purchases[purchases.length - 2] : undefined;
  const purchasesThisMonth = lastPurchase?.count ?? 0;

  const dateLabel = new Date().toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const categoryTotal = useMemo(
    () => (data?.assets_by_category ?? []).reduce((a, b) => a + b.value, 0),
    [data],
  );
  const conditionTotal = useMemo(
    () => (data?.assets_by_condition ?? []).reduce((a, b) => a + b.value, 0),
    [data],
  );
  const topCategories = useMemo(
    () => [...(data?.assets_by_category ?? [])].sort((a, b) => b.value - a.value).slice(0, 5),
    [data],
  );

  /* ---- chart options ---- */

  const purchaseOptions: ApexOptions = {
    chart: { ...baseChart, type: "area", zoom: { enabled: false } },
    colors: ["#8b5cf6"],
    stroke: { curve: "smooth", width: 3 },
    fill: {
      type: "gradient",
      gradient: { shade: "dark", type: "vertical", opacityFrom: 0.5, opacityTo: 0.02, stops: [0, 100] },
    },
    dataLabels: { enabled: false },
    markers: {
      size: 0,
      colors: ["#ffffff"],
      strokeColors: "#8b5cf6",
      strokeWidth: 3,
      hover: { size: 6 },
    },
    xaxis: {
      categories: purchases.map((p) => p.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      min: 0,
      labels: {
        formatter: (val: number) =>
          purchaseMetric === "total" ? compactIDR(val) : String(Math.round(val)),
      },
    },
    grid: { ...baseGrid, yaxis: { lines: { show: true } } },
    legend: { show: false },
    tooltip: {
      theme: "dark",
      y: {
        formatter: (val: number) =>
          purchaseMetric === "total" ? formatIDR(val) : String(val),
      },
    },
  };

  const unitOptions: ApexOptions = {
    chart: { ...baseChart, type: "bar" },
    colors: ["#8b5cf6"],
    plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: "52%" } },
    fill: {
      type: "gradient",
      gradient: { shade: "dark", type: "horizontal", gradientToColors: ["#c4b5fd"], stops: [0, 100] },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: data?.assets_by_team.map((x) => x.label) ?? [],
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    grid: { ...baseGrid, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
    legend: { show: false },
    tooltip: { theme: "dark" },
  };

  const conditionColors = ["#10b981", "#f43f5e", "#f59e0b", "#3b82f6"];
  const conditionOptions: ApexOptions = {
    chart: { ...baseChart, type: "donut" },
    labels: data?.assets_by_condition.map((c) => c.label) ?? [],
    colors: conditionColors,
    legend: { show: false },
    dataLabels: { enabled: false },
    stroke: { width: 4, colors: ["#0a0d2c"] },
    tooltip: { theme: "dark" },
    plotOptions: {
      pie: {
        donut: {
          size: "74%",
          labels: {
            show: true,
            name: { show: true, fontSize: "12px", color: "#8f98c8", offsetY: 18 },
            value: { show: true, fontSize: "26px", fontWeight: 700, color: "#ffffff", offsetY: -14 },
            total: {
              show: true,
              label: t("Total Assets"),
              fontSize: "12px",
              color: "#8f98c8",
              formatter: () => String(conditionTotal),
            },
          },
        },
      },
    },
  };

  /* ---- KPI cards ---- */

  const secondaryCards = useMemo(() => {
    if (!m) return [];
    return [
      {
        label: t("In Storage"),
        value: String(m.assets_in_storage),
        sub: t("{pct} of total", { pct: percentOf(m.assets_in_storage, m.total_assets) }),
        icon: <BoxIconLine />,
        iconClass: "from-sky-400 to-blue-600",
        to: "/storage",
      },
      // Super admins see a global "teams" card; every other role gets a
      // unit-scoped "purchases this month" card so the dashboard only talks
      // about their own unit.
      isSuperAdmin
        ? {
            label: t("Total Teams"),
            value: String(m.total_teams),
            sub: t("Work teams"),
            icon: <GroupIcon />,
            iconClass: "from-violet-400 to-purple-600",
            to: "/teams",
          }
        : {
            label: t("Purchases This Month"),
            value: String(purchasesThisMonth),
            sub: t("In this team"),
            icon: <GroupIcon />,
            iconClass: "from-violet-400 to-purple-600",
            to: "/purchases",
          },
      {
        label: t("Total Users"),
        value: String(m.total_users),
        sub: isSuperAdmin ? t("Registered users") : t("In this team"),
        icon: <UserIcon />,
        iconClass: "from-amber-400 to-orange-600",
        to: "/users",
      },
      {
        label: t("Total Rooms"),
        value: String(m.total_rooms),
        sub: isSuperAdmin ? t("Rooms & warehouses") : t("In this team"),
        icon: <ListIcon />,
        iconClass: "from-pink-400 to-rose-600",
        to: "/rooms",
      },
    ];
  }, [m, isSuperAdmin, purchasesThisMonth, t]);

  const taxRows = data
    ? [
        { label: t("Due Today"), value: data.tax_reminders.due_today, color: "bg-error-500/15 text-error-400", icon: <AlertIcon /> },
        { label: t("< 7 Days"), value: data.tax_reminders.due_soon_7, color: "bg-warning-500/15 text-warning-400", icon: <TimeIcon /> },
        { label: t("< 14 Days"), value: data.tax_reminders.due_soon_14, color: "bg-blue-light-500/15 text-blue-light-400", icon: <TimeIcon /> },
        { label: t("< 30 Days"), value: data.tax_reminders.due_soon_30, color: "bg-brand-500/15 text-brand-300", icon: <CalenderIcon /> },
        { label: t("Overdue"), value: data.tax_reminders.overdue, color: "bg-error-500/15 text-error-400", icon: <AlertIcon /> },
        { label: t("Needs Attention"), value: data.tax_reminders.needs_attention, color: "bg-gray-500/20 text-gray-300", icon: <TaskIcon /> },
      ]
    : [];

  const goodCount = data?.assets_by_condition.find((c) => c.label === "Good")?.value ?? 0;

  const purchaseDelta =
    lastPurchase && prevPurchase && prevPurchase.total > 0
      ? ((lastPurchase.total - prevPurchase.total) / prevPurchase.total) * 100
      : null;

  if (!canView) return null;

  return (
    <>
      <PageMeta
        title={t("Dashboard")}
        description={t("Overview of assets, teams, users, rooms, and vehicle tax reminders")}
      />

      {/* Welcome header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white sm:text-[28px]">
            {t("Welcome back, {name}", { name: user?.name ?? t("Admin") })}{" "}
            <span aria-hidden="true">👋</span>
          </h2>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            {!isSuperAdmin && data?.unit
              ? t("Here's a summary of {unit}'s asset conditions.", { unit: data.unit.name })
              : t("Here's what's happening with your assets today.")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isSuperAdmin && data?.unit && (
            <span className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-200">
              <GroupIcon className="size-4 text-brand-400" />
              {data.unit.name}
            </span>
          )}
          <span className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-200">
            <CalenderIcon className="size-4 text-brand-400" />
            {dateLabel}
          </span>
        </div>
      </div>

      {loading && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 3xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[108px] animate-pulse rounded-2xl bg-gray-100 dark:bg-white/[0.04]" />
            ))}
          </div>
          <div className="h-80 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/[0.03]" />
        </div>
      )}

      {!loading && data && m && (
        <div className="mt-6 space-y-5">
          {/* Gradient KPI cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 3xl:grid-cols-4">
            <KpiCard
              tone="purple"
              label={t("Total Assets")}
              value={String(m.total_assets)}
              sub={t("Assets & Vehicles")}
              icon={<BoxCubeIcon />}
              to="/assets"
              spark={purchases.map((p) => p.count)}
            />
            <KpiCard
              tone="blue"
              label={t("In Use")}
              value={String(m.assets_in_use)}
              sub={t("{pct} of total", { pct: percentOf(m.assets_in_use, m.total_assets) })}
              icon={<TaskIcon />}
              to="/assets"
              ring={percentNumber(m.assets_in_use, m.total_assets)}
            />
            <KpiCard
              tone="green"
              label={t("Asset Value")}
              value={formatIDR(m.total_asset_value)}
              sub={t("Total purchase value")}
              icon={<DollarLineIcon />}
              to="/assets"
              spark={purchases.map((p) => p.total)}
            />
            <KpiCard
              tone="red"
              label={t("Damaged Items")}
              value={String(m.assets_damaged)}
              sub={t("{pct} of total", { pct: percentOf(m.assets_damaged, m.total_assets) })}
              icon={<AlertIcon />}
              to="/damages"
              ring={percentNumber(m.assets_damaged, m.total_assets)}
            />
          </div>

          {/* Compact stat cards */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {secondaryCards.map((card) => (
              <Link
                key={card.label}
                to={card.to}
                className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 transition-transform duration-200 hover:-translate-y-0.5 dark:border-gray-800 dark:bg-white/[0.03]"
              >
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-white [&_svg]:size-6 ${card.iconClass}`}
                >
                  {card.icon}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{card.label}</span>
                  <span className="block text-xl font-bold text-gray-800 dark:text-white">{card.value}</span>
                  <span className="block truncate text-[11px] text-gray-400 dark:text-gray-500">{card.sub}</span>
                </span>
              </Link>
            ))}
          </div>

          {/* Row: purchases area chart + top categories + vehicle tax */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <div className={`${CARD} xl:col-span-6`}>
              <CardHeader
                icon={<DollarLineIcon />}
                title={t("Purchases per Month")}
                subtitle={t("Trend of asset purchase transactions.")}
                action={
                  <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-0.5 text-xs dark:border-white/[0.08] dark:bg-white/[0.03]">
                    {(
                      [
                        ["total", t("Value")],
                        ["count", t("Transactions")],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setPurchaseMetric(key)}
                        className={`rounded-[10px] px-3 py-1.5 font-medium transition ${
                          purchaseMetric === key
                            ? "bg-brand-500 text-white shadow-[0_6px_16px_-6px_rgba(124,58,237,0.9)]"
                            : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                }
              />
              {purchases.length === 0 ? (
                <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">{t("No data.")}</p>
              ) : (
                <>
                  <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-3xl font-bold text-gray-800 dark:text-white">
                      {purchaseMetric === "total"
                        ? formatIDR(lastPurchase?.total ?? 0)
                        : String(lastPurchase?.count ?? 0)}
                    </span>
                    {purchaseMetric === "total" && purchaseDelta !== null && (
                      <span
                        className={`text-sm font-medium ${
                          purchaseDelta >= 0 ? "text-success-400" : "text-error-400"
                        }`}
                      >
                        {purchaseDelta >= 0 ? "↑" : "↓"} {Math.abs(purchaseDelta).toFixed(1)}%{" "}
                        <span className="font-normal text-gray-500 dark:text-gray-400">
                          {t("vs last month")}
                        </span>
                      </span>
                    )}
                    {lastPurchase && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">{lastPurchase.label}</span>
                    )}
                  </div>
                  <Chart
                    options={purchaseOptions}
                    series={[
                      {
                        name: purchaseMetric === "total" ? t("Value") : t("Purchases"),
                        data: purchases.map((p) => (purchaseMetric === "total" ? p.total : p.count)),
                      },
                    ]}
                    type="area"
                    height={280}
                  />
                </>
              )}
            </div>

            <div className={`${CARD} xl:col-span-3`}>
              <CardHeader
                icon={<BoxCubeIcon />}
                title={t("Assets by Category")}
                subtitle={t("Asset distribution based on item category.")}
              />
              {topCategories.length === 0 ? (
                <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">{t("No data.")}</p>
              ) : (
                <ul className="mt-5 space-y-4">
                  {topCategories.map((c, i) => (
                    <li key={`${c.label}-${i}`} className="flex items-center gap-3">
                      <span className="w-3 text-center text-xs text-gray-500">{i + 1}</span>
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white [&_svg]:size-5"
                        style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                      >
                        <BoxCubeIcon />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-gray-800 dark:text-white">
                          {c.label}
                        </span>
                        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.08]">
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${percentNumber(c.value, categoryTotal)}%`,
                              backgroundColor: PALETTE[i % PALETTE.length],
                            }}
                          />
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block text-sm font-semibold text-gray-800 dark:text-white">{c.value}</span>
                        <span className="block text-[11px] text-gray-500 dark:text-gray-400">
                          {percentOf(c.value, categoryTotal)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={`${CARD} xl:col-span-3`}>
              <CardHeader
                icon={<TimeIcon />}
                title={t("Vehicle Tax Renewal")}
                subtitle={t("Motorcycle tax deadlines that need your attention.")}
              />
              <ul className="mt-5 space-y-3.5">
                {taxRows.map((row) => (
                  <li key={row.label} className="flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5 ${row.color}`}
                    >
                      {row.icon}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800 dark:text-white">
                      {row.label}
                    </span>
                    <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-sm font-semibold text-gray-800 dark:bg-white/[0.06] dark:text-white">
                      {row.value}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                to="/vehicles"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
              >
                {t("View Vehicles")}
                <ArrowRightIcon className="size-4" />
              </Link>
            </div>
          </div>

          {/* Row: assets by unit + condition donut + quick summary */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <div className={`${CARD} xl:col-span-5`}>
              <CardHeader
                icon={<GroupIcon />}
                title={t("Assets by Team")}
                subtitle={t("Number of assets assigned to each team.")}
              />
              {data.assets_by_team.length === 0 ? (
                <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">{t("No data.")}</p>
              ) : (
                <Chart
                  options={unitOptions}
                  series={[{ name: t("Assets"), data: data.assets_by_team.map((x) => x.value) }]}
                  type="bar"
                  height={280}
                />
              )}
            </div>

            <div className={`${CARD} xl:col-span-4`}>
              <CardHeader
                icon={<TaskIcon />}
                title={t("Asset Condition")}
                subtitle={t("Comparison of assets in good and damaged condition.")}
              />
              {data.assets_by_condition.length === 0 ? (
                <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">{t("No data.")}</p>
              ) : (
                <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row xl:flex-col 2xl:flex-row">
                  <div className="w-[190px] shrink-0">
                    <Chart
                      options={conditionOptions}
                      series={data.assets_by_condition.map((c) => c.value)}
                      type="donut"
                      width="100%"
                      height={190}
                    />
                  </div>
                  <ul className="w-full space-y-3">
                    {data.assets_by_condition.map((c, i) => (
                      <li key={c.label} className="flex items-center gap-2.5 text-sm">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: conditionColors[i % conditionColors.length] }}
                        />
                        <span className="flex-1 text-gray-700 dark:text-gray-300">{t(c.label)}</span>
                        <span className="font-semibold text-gray-800 dark:text-white">
                          {percentOf(c.value, conditionTotal)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:col-span-3">
              {[
                {
                  label: t("Good Condition"),
                  value: String(goodCount),
                  pct: percentOf(goodCount, conditionTotal),
                  color: "text-success-400",
                  bar: "from-emerald-500/25",
                  to: "/assets",
                },
                {
                  label: t("Total Purchases This Month"),
                  value: String(purchasesThisMonth),
                  pct: t("transactions"),
                  color: "text-brand-300",
                  bar: "from-violet-500/25",
                  to: "/purchases",
                },
                {
                  label: t("Total Vehicles"),
                  value: String(data.tax_reminders.total_vehicles),
                  pct: t("registered vehicles"),
                  color: "text-warning-400",
                  bar: "from-amber-500/25",
                  to: "/vehicles",
                },
              ].map((s) => (
                <Link
                  key={s.label}
                  to={s.to}
                  className={`flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-linear-to-r to-transparent px-5 py-4 transition-transform duration-200 hover:-translate-y-0.5 dark:border-white/[0.07] ${s.bar}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
                    <p className={`mt-1 text-3xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-white/80 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-white/[0.07] dark:text-gray-300">
                    {s.pct}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
