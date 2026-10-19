import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router";

import { ChevronDownIcon, PencilIcon } from "../icons";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import { useBranding } from "../context/BrandingContext";
import { useLang } from "../context/LanguageContext";
import { NAV_ITEMS, canAccess, type MenuItem } from "../config/menu";
import UnitBrand, { useBrandUnit } from "../components/common/UnitBrand";

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { user } = useAuth();
  const { openModal } = useBranding();
  const brandUnit = useBrandUnit();
  const { t } = useLang();
  const location = useLocation();

  const navItems = useMemo<MenuItem[]>(() => {
    return NAV_ITEMS.reduce<MenuItem[]>((acc, item) => {
      if (!item.subItems) {
        if (item.alwaysVisible || canAccess(user, item.permissions)) acc.push(item);
        return acc;
      }
      const accessibleSubItems = item.subItems.filter((sub) =>
        canAccess(user, sub.permissions),
      );
      if (accessibleSubItems.length === 0) return acc;
      // Copy the group instead of trimming NAV_ITEMS in place: that array is
      // module state shared by the whole session, so mutating it would leak one
      // user's permissions into the next user's menu.
      acc.push({ ...item, subItems: accessibleSubItems });
      return acc;
    }, []);
  }, [user]);

  const [openSubmenu, setOpenSubmenu] = useState<number | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {},
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback(
    (path: string) =>
      location.pathname === path ||
      // The ticket page keeps the Task menu highlighted.
      (path === "/tasks" && location.pathname.startsWith("/tasks/")),
    [location.pathname],
  );

  useEffect(() => {
    let matched = false;
    navItems.forEach((nav, index) => {
      if (nav.subItems) {
        nav.subItems.forEach((subItem) => {
          if (isActive(subItem.path)) {
            setOpenSubmenu(index);
            matched = true;
          }
        });
      }
    });
    if (!matched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive, navItems]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number) => {
    setOpenSubmenu((prevOpenSubmenu) =>
      prevOpenSubmenu === index ? null : index,
    );
  };

  const showText = isExpanded || isHovered || isMobileOpen;

  // The sidebar shows the unit's own logo and name (set on the Unit page), so
  // the company-logo editor only applies when no single unit is shown, i.e. a
  // super admin looking at "All teams".
  const canManageBranding =
    !brandUnit && (user?.role === "super_admin" || user?.role === "owner");

  const renderMenuItems = (items: MenuItem[]) => (
    <ul className="flex flex-col gap-1.5">
      {items.map((nav) => {
        // Keep the index into the full list so the open-submenu state stays
        // valid even though the sidebar renders the list in sections.
        const index = navItems.indexOf(nav);
        return (
          <li key={nav.name}>
            {nav.subItems ? (
              <button
                onClick={() => handleSubmenuToggle(index)}
                className={`menu-item group ${
                  openSubmenu === index
                    ? "menu-item-active"
                    : "menu-item-inactive"
                } cursor-pointer ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "lg:justify-start"
                }`}
              >
                <span
                  className={`menu-item-icon-size  ${
                    openSubmenu === index
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {showText && <span className="menu-item-text">{t(nav.name)}</span>}
                {showText && (
                  <ChevronDownIcon
                    className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                      openSubmenu === index ? "rotate-180" : ""
                    }`}
                  />
                )}
              </button>
            ) : (
              nav.path && (
                <Link
                  to={nav.path}
                  className={`menu-item group ${
                    isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                  } ${
                    !isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "lg:justify-start"
                  }`}
                >
                  <span
                    className={`menu-item-icon-size ${
                      isActive(nav.path)
                        ? "menu-item-icon-active"
                        : "menu-item-icon-inactive"
                    }`}
                  >
                    {nav.icon}
                  </span>
                  {showText && <span className="menu-item-text">{t(nav.name)}</span>}
                </Link>
              )
            )}
            {nav.subItems && showText && (
              <div
                ref={(el) => {
                  subMenuRefs.current[`${index}`] = el;
                }}
                className="overflow-hidden transition-all duration-300"
                style={{
                  height:
                    openSubmenu === index
                      ? `${subMenuHeight[`${index}`]}px`
                      : "0px",
                }}
              >
                <ul className="mt-1.5 ml-[26px] space-y-0.5 border-l border-gray-200 pl-3 dark:border-white/[0.07]">
                  {nav.subItems.map((subItem) => (
                    <li key={subItem.name}>
                      <Link
                        to={subItem.path}
                        className={`menu-dropdown-item ${
                          isActive(subItem.path)
                            ? "menu-dropdown-item-active"
                            : "menu-dropdown-item-inactive"
                        }`}
                      >
                        {t(subItem.name)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  const sections: { key: "main" | "manage" | "tools"; label?: string }[] = [
    { key: "main" },
    { key: "manage", label: t("Manage") },
    { key: "tools", label: t("Tools") },
  ];

  const displayName = user?.name || "User";
  const roleLabel = user?.role ? user.role.replace(/_/g, " ") : "";

  return (
    <aside
      className={`fixed top-0 left-0 z-50 mt-16 flex h-screen flex-col border-r border-gray-200 bg-white px-4 text-gray-900 transition-all duration-300 ease-in-out dark:border-white/[0.06] dark:bg-[#050720] lg:mt-0
        ${
          isExpanded || isMobileOpen
            ? "w-[270px]"
            : isHovered
              ? "w-[270px]"
              : "w-[88px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`flex py-7 ${
          !isExpanded && !isHovered
            ? "lg:justify-center"
            : "items-center gap-2 px-1"
        }`}
      >
        <UnitBrand
          compact={!showText}
          className={showText ? "min-w-0 flex-1" : ""}
        />
        {canManageBranding && showText && (
          <button
            type="button"
            onClick={openModal}
            title={t("Change Logo")}
            aria-label={t("Change Logo")}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-brand-500 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-brand-400"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <nav className="pb-4">
          {sections.map(({ key, label }) => {
            const items = navItems.filter((n) => (n.group ?? "manage") === key);
            if (items.length === 0) return null;
            return (
              <div key={key} className={key === "main" ? "" : "mt-6"}>
                {label &&
                  (showText ? (
                    <h2 className="mb-3 px-3.5 text-[11px] font-medium uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
                      {label}
                    </h2>
                  ) : (
                    <div className="mx-auto mb-3 hidden h-px w-8 bg-gray-200 dark:bg-white/[0.08] lg:block" />
                  ))}
                {renderMenuItems(items)}
              </div>
            );
          })}
        </nav>
      </div>

      <div className="space-y-3 pb-5 pt-3">
       

        <Link
          to="/profile"
          className={`flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-gray-100 dark:hover:bg-white/[0.04] ${
            !showText ? "lg:justify-center" : ""
          }`}
        >
          <span className="relative shrink-0">
            <img
              src={user?.avatar_url || "/images/user/default-avatar.svg"}
              alt={displayName}
              className="h-10 w-10 rounded-full object-cover ring-2 ring-brand-500/40"
            />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-success-500 dark:border-[#050720]" />
          </span>
          {showText && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-gray-800 dark:text-white">
                  {displayName}
                </span>
                <span className="block truncate text-xs capitalize text-gray-500 dark:text-gray-400">
                  {roleLabel}
                </span>
              </span>
              <ChevronDownIcon className="h-4 w-4 shrink-0 -rotate-90 text-gray-400" />
            </>
          )}
        </Link>
      </div>
    </aside>
  );
};

export default AppSidebar;
