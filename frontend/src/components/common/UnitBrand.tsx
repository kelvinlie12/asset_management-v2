import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { useTeam } from "../../context/TeamContext";
import { fetchTeams, resolveTeamLogo, type Team } from "../../services/teams";
import NexoraLogo, { NexoraMark } from "./NexoraLogo";

export interface BrandUnit {
  id: number;
  name: string;
  logoUrl: string | null;
}

/**
 * The unit whose logo and name the sidebar shows.
 *
 * - A unit user always sees their own unit.
 * - A super admin sees the unit picked in the header; with "All teams" there
 *   is no single unit, so this returns null and the company branding is used.
 */
export function useBrandUnit(): BrandUnit | null {
  const { user } = useAuth();
  const { activeTeamId } = useTeam();
  const isSuperAdmin = user?.role === "super_admin";

  const wantedId = isSuperAdmin
    ? activeTeamId
      ? Number(activeTeamId)
      : null
    : (user?.team_id ?? user?.team?.id ?? null);

  // Units fetched from the API. Only needed when the signed-in user's own
  // payload doesn't carry the logo (super admin picking a unit, or a session
  // cached before logos existed).
  const [fetched, setFetched] = useState<Team | null>(null);

  const own = !isSuperAdmin && user?.team ? user.team : null;
  const ownHasLogoField = own ? "logo_url" in own || "logo" in own : false;

  useEffect(() => {
    setFetched(null);
    if (!wantedId || ownHasLogoField) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchTeams({ per_page: 100 });
        if (!cancelled) {
          setFetched(res.data.data.find((t) => t.id === wantedId) ?? null);
        }
      } catch {
        if (!cancelled) setFetched(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wantedId, ownHasLogoField]);

  if (!wantedId) return null;

  const source = ownHasLogoField && own ? own : fetched;
  if (!source) return null;

  return {
    id: wantedId,
    name: source.name,
    logoUrl: resolveTeamLogo(source),
  };
}

interface UnitBrandProps {
  /** Show only the logo (collapsed sidebar). */
  compact?: boolean;
  className?: string;
}

/**
 * Sidebar / header brand: the unit's logo and name. Falls back to the
 * company branding when no single unit applies.
 */
const UnitBrand: React.FC<UnitBrandProps> = ({
  compact = false,
  className = "",
}) => {
  const unit = useBrandUnit();

  if (!unit) return <NexoraLogo compact={compact} className={className} />;

  const isLongName = unit.name.length > 14;

  return (
    <Link to="/" className={`flex min-w-0 items-center gap-3 ${className}`}>
      {unit.logoUrl ? (
        <img
          src={unit.logoUrl}
          alt={unit.name}
          className={
            compact
              ? "h-9 w-9 shrink-0 rounded-lg object-contain"
              : "h-10 max-w-[120px] shrink-0 object-contain"
          }
        />
      ) : (
        <NexoraMark size={compact ? 34 : 40} className="shrink-0" />
      )}
      {!compact && (
        <span className="flex min-w-0 max-w-[180px] flex-col leading-tight">
          <span
            className={`line-clamp-2 break-words font-bold text-gray-900 dark:text-white ${
              isLongName
                ? "text-[16px] tracking-[0.01em]"
                : "text-[22px] tracking-[0.08em]"
            }`}
          >
            {unit.name}
          </span>
          <span className="mt-1 truncate text-[9px] font-medium uppercase tracking-[0.24em] text-gray-500 dark:text-brand-300/80">
            Asset Management
          </span>
        </span>
      )}
    </Link>
  );
};

export default UnitBrand;
