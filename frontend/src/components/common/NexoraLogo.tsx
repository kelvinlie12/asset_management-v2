import { Link } from "react-router";
import { useBranding } from "../../context/BrandingContext";

interface NexoraMarkProps {
  size?: number;
  className?: string;
}

export const NexoraMark: React.FC<NexoraMarkProps> = ({
  size = 40,
  className = "",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="nexora-mark" x1="6" y1="44" x2="42" y2="4">
        <stop offset="0" stopColor="#6d28d9" />
        <stop offset="1" stopColor="#b57bff" />
      </linearGradient>
    </defs>
    <path d="M24 4 44 41H31.5L24 27.2 16.5 41H4L24 4Z" fill="url(#nexora-mark)" />
    <path d="M24 15.5 33.2 33.5H29.2L24 23.6 18.8 33.5H14.8L24 15.5Z" fill="#050720" fillOpacity="0.6" />
  </svg>
);

interface NexoraLogoProps {
  /** Show only the mark (collapsed sidebar). */
  compact?: boolean;
  to?: string;
  className?: string;
}

const NexoraLogo: React.FC<NexoraLogoProps> = ({
  compact = false,
  to = "/",
  className = "",
}) => {
  const { logoUrl, companyName } = useBranding();
  const brandName = companyName || "NEXORA";
  // A long company name is rendered a bit smaller and allowed to wrap onto a
  // second line, so it stays readable without stretching the sidebar.
  const isLongName = brandName.length > 14;

  return (
    <Link to={to} className={`flex min-w-0 items-center gap-3 ${className}`}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={companyName || "Logo"}
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
        // Long company names wrap to at most two lines (then ellipsis) so the
        // sidebar keeps its width and the edit button never gets pushed out.
        <span className="flex min-w-0 max-w-[180px] flex-col leading-tight">
          <span
            className={`line-clamp-2 break-words font-bold text-gray-900 dark:text-white ${
              isLongName
                ? "text-[16px] tracking-[0.01em]"
                : "text-[22px] tracking-[0.08em]"
            }`}
          >
            {brandName}
          </span>
          <span className="mt-1 truncate text-[9px] font-medium uppercase tracking-[0.24em] text-gray-500 dark:text-brand-300/80">
            Asset Management
          </span>
        </span>
      )}
    </Link>
  );
};

export default NexoraLogo;
