import { Link, useLocation } from "react-router";
import { ROUTE_TITLES } from "../../config/menu";
import { useLang } from "../../context/LanguageContext";

const LayoutBreadcrumb: React.FC = () => {
  const location = useLocation();
  const { t } = useLang();
  // Exact match first, then patterns such as "/tasks/:id".
  const title =
    ROUTE_TITLES[location.pathname] ??
    Object.entries(ROUTE_TITLES).find(([pattern]) =>
      pattern.includes(":") &&
      new RegExp(`^${pattern.replace(/:[^/]+/g, "[^/]+")}$`).test(location.pathname),
    )?.[1] ??
    "Dashboard";

  // The dashboard renders its own welcome header.
  if (location.pathname === "/") return null;

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
        {t(title)}
      </h2>
      <nav>
        <ol className="flex items-center gap-1.5">
          <li>
            <Link
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400"
              to="/"
            >
              {t("Home")}
            </Link>
          </li>
          <span className="text-gray-400 dark:text-gray-600">/</span>
          <li className="text-sm text-gray-800 dark:text-white/90">{t(title)}</li>
        </ol>
      </nav>
    </div>
  );
};

export default LayoutBreadcrumb;
