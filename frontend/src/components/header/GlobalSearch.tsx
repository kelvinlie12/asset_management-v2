import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { NAV_ITEMS, canAccess } from "../../config/menu";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LanguageContext";

interface Entry {
  label: string;
  group?: string;
  path: string;
}

/**
 * Header search box. It jumps to any page the signed-in user is allowed to
 * open (same permission rules as the sidebar). Ctrl/Cmd + K focuses it.
 */
export default function GlobalSearch() {
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const entries = useMemo<Entry[]>(() => {
    const out: Entry[] = [];
    for (const item of NAV_ITEMS) {
      if (item.subItems) {
        for (const sub of item.subItems) {
          if (canAccess(user, sub.permissions)) {
            out.push({ label: t(sub.name), group: t(item.name), path: sub.path });
          }
        }
      } else if (item.path && (item.alwaysVisible || canAccess(user, item.permissions))) {
        out.push({ label: t(item.name), path: item.path });
      }
    }
    return out;
  }, [user, t]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return entries
      .filter((e) => `${e.label} ${e.group ?? ""}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [entries, query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    const onMouseDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, []);

  function go(entry: Entry) {
    navigate(entry.path);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div ref={wrapRef} className="relative w-full lg:w-[300px]">
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M9.4 15.7a6.3 6.3 0 1 0 0-12.6 6.3 6.3 0 0 0 0 12.6ZM18 18l-3.2-3.2"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t("Search anything...")}
          className="h-11 w-full rounded-full border border-gray-200 bg-white pl-11 pr-20 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/15 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/90 dark:placeholder:text-gray-500 dark:focus:border-brand-500/60"
        />
        <span className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 text-xs text-gray-400 sm:block">
          Ctrl + K
        </span>
      </div>

      {open && query.trim() !== "" && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white p-1.5 shadow-theme-lg dark:border-white/10 dark:bg-gray-dark">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">
              {t("No results found")}
            </p>
          ) : (
            results.map((entry, i) => (
              <button
                key={entry.path}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(entry)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                  i === active
                    ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-white"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                <span className="truncate font-medium">{entry.label}</span>
                {entry.group && (
                  <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                    {entry.group}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
