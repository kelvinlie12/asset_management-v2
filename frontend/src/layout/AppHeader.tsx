import { useState } from "react";

import { useSidebar } from "../context/SidebarContext";
import TeamSelector from "../components/header/TeamSelector";
import UserDropdown from "../components/header/UserDropdown";
import GlobalSearch from "../components/header/GlobalSearch";
import UnitBrand from "../components/common/UnitBrand";
import { ThemeToggleButton } from "../components/common/ThemeToggleButton";

const AppHeader: React.FC = () => {
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);

  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  return (
    <header className="sticky top-0 z-99999 flex w-full border-gray-200 bg-white/80 backdrop-blur-xl dark:border-white/[0.05] dark:bg-[#050720]/55 lg:border-b-0">
      <div className="flex grow flex-col items-center justify-between lg:flex-row lg:px-8">
        <div className="flex w-full items-center justify-between gap-2 border-b border-gray-200 px-3 py-3 dark:border-white/[0.06] sm:gap-4 lg:w-auto lg:justify-normal lg:border-b-0 lg:px-0 lg:py-5">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.06]"
            onClick={handleToggle}
            aria-label="Toggle Sidebar"
          >
            {isMobileOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 6l12 12M18 6 6 18"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 7h16M4 12h16M4 17h10"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>

          <UnitBrand compact className="lg:hidden" />

          <button
            onClick={() => setApplicationMenuOpen(!isApplicationMenuOpen)}
            aria-label="Toggle header menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.06] lg:hidden"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="6" cy="12" r="1.6" fill="currentColor" />
              <circle cx="12" cy="12" r="1.6" fill="currentColor" />
              <circle cx="18" cy="12" r="1.6" fill="currentColor" />
            </svg>
          </button>
        </div>

        <div
          className={`${
            isApplicationMenuOpen ? "flex" : "hidden"
          } w-full flex-wrap items-center justify-between gap-3 px-5 py-4 shadow-theme-md lg:flex lg:w-auto lg:flex-nowrap lg:justify-end lg:gap-4 lg:px-0 lg:py-0 lg:shadow-none`}
        >
          <GlobalSearch />
          <div className="flex items-center gap-2 2xsm:gap-3">
            <TeamSelector />
            <ThemeToggleButton />
            <UserDropdown />
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
