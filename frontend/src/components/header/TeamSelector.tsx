"use client";

import { useEffect, useState } from "react";
import { GroupIcon, CheckLineIcon, ChevronDownIcon } from "../../icons";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { useTeam } from "../../context/TeamContext";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LanguageContext";
import { fetchTeams, type Team } from "../../services/teams";

export default function TeamSelector() {
  const { user } = useAuth();
  const { t } = useLang();
  // Only a super admin switches between units, and that list needs teams.view.
  const isSuperAdmin = user?.role === "super_admin";
  const { activeTeamId, setActiveTeamId } = useTeam();
  const [isOpen, setIsOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchTeams({ per_page: 100 });
        if (!cancelled) setTeams(res.data.data);
      } catch {
        if (!cancelled) setTeams([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin]);
  const activeTeam =
    teams.find((team) => String(team.id) === activeTeamId) ?? null;

  /**
   * A unit user is pinned to their own team, so the header shows a plain label:
   * there is nothing to switch to.
   *
   * Deliberately not gated on `teams.view` — before this it called the team API
   * whenever the permission was held, which 403s for anyone granted
   * `permissions.view` instead (see the Settings module). The user's own team
   * name already travels with their profile.
   */
  if (!isSuperAdmin) {
    const teamName = user?.team?.name;
    if (teamName) {
      return (
        <div className="relative">
          <div className="dropdown-toggle relative flex h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 text-gray-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-400">
            <GroupIcon className="h-5 w-5 shrink-0" />
            <span className="max-w-[110px] truncate text-theme-sm font-medium">
              {teamName}
            </span>
          </div>
        </div>
      );
    }
    return null;
  }

  function select(id: string) {
    setActiveTeamId(id);
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={t("Select team")}
        className="dropdown-toggle relative flex h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
      >
        <GroupIcon className="h-5 w-5 shrink-0" />
        <span className="max-w-[110px] truncate text-theme-sm font-medium">
          {activeTeam ? activeTeam.name : t("All teams")}
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        className="mt-2 flex w-[220px] flex-col rounded-2xl p-2"
      >
        <button
          onClick={() => select("")}
          className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-theme-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
        >
          <span>{t("All teams")}</span>
          {!activeTeam && <CheckLineIcon className="h-4 w-4 shrink-0" />}
        </button>

        <div className="my-1 border-t border-gray-200 dark:border-gray-800" />

        {teams.map((team) => (
          <button
            key={team.id}
            onClick={() => select(String(team.id))}
            className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-theme-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
          >
            <span className="truncate">{team.name}</span>
            {String(team.id) === activeTeamId && (
              <CheckLineIcon className="h-4 w-4 shrink-0" />
            )}
          </button>
        ))}
      </Dropdown>
    </div>
  );
}