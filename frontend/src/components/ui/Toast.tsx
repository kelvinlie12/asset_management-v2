import { CheckCircleIcon, CloseLineIcon, ErrorIcon } from "../../icons";

export type ToastType = "success" | "error";

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastStyle {
  title: string;
  border: string;
  accent: string;
  iconWrap: string;
  bar: string;
}

const CONFIG: Record<ToastType, ToastStyle> = {
  success: {
    title: "Success",
    border: "border-success-200 dark:border-success-500/30",
    accent: "bg-success-500",
    iconWrap:
      "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400",
    bar: "bg-success-500",
  },
  error: {
    title: "Error",
    border: "border-error-200 dark:border-error-500/30",
    accent: "bg-error-500",
    iconWrap:
      "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400",
    bar: "bg-error-500",
  },
};

const POSITION_CLASS: Record<string, string> = {
  "top-right": "right-4 top-20",
  "top-left": "left-4 top-20",
  "bottom-right": "bottom-4 right-4",
};

export default function Toast({
  toasts,
  onClose,
  duration = 4000,
  position = "top-right",
}: {
  toasts: ToastItem[];
  onClose: (id: number) => void;
  duration?: number;
  position?: keyof typeof POSITION_CLASS;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      className={`fixed z-[999999] flex w-[380px] max-w-[calc(100vw-2rem)] flex-col gap-3 ${POSITION_CLASS[position]}`}
    >
      {toasts.map((t) => {
        const cfg = CONFIG[t.type];
        return (
          <div
            key={t.id}
            className={`toast-enter relative flex items-start gap-3 overflow-hidden rounded-xl border ${cfg.border} bg-white p-4 shadow-lg shadow-gray-900/5 dark:bg-gray-900`}
          >
            <span
              aria-hidden
              className={`absolute inset-y-0 left-0 w-1 ${cfg.accent}`}
            />
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-full ${cfg.iconWrap}`}
            >
              {t.type === "success" ? (
                <CheckCircleIcon className="size-5" />
              ) : (
                <ErrorIcon className="size-5" />
              )}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                {cfg.title}
              </p>
              <p className="mt-0.5 break-words text-sm leading-snug text-gray-600 dark:text-gray-400">
                {t.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onClose(t.id)}
              className="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              <CloseLineIcon className="size-4" />
            </button>
            <span
              aria-hidden
              className={`toast-bar absolute bottom-0 left-0 h-0.5 ${cfg.bar}`}
              style={{ animationDuration: `${duration}ms` }}
            />
          </div>
        );
      })}
    </div>
  );
}