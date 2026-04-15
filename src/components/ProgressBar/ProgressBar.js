import { useEffect, useRef } from "react";

const STATUS_CONFIG = {
  in_progress: {
    badgeClass:
      "text-lightBlue-700 bg-lightBlue-50 border border-lightBlue-200",
    textClass: "text-lightBlue-700",
    iconClass: "fas fa-spinner fa-spin",
    statusLabel: "In Progress",
    trackColor: "#DBEAFE",
    fillGradient: "linear-gradient(90deg, #0EA5E9 0%, #0284C7 100%)",
    shimmer: true,
  },
  completed: {
    badgeClass: "text-emerald-700 bg-emerald-50 border border-emerald-200",
    textClass: "text-emerald-700",
    iconClass: "fas fa-check-circle",
    statusLabel: "Completed",
    trackColor: "#D1FAE5",
    fillGradient: "linear-gradient(90deg, #34D399 0%, #059669 100%)",
    shimmer: false,
  },
  partially_completed: {
    badgeClass: "text-yellow-700 bg-yellow-50 border border-yellow-200",
    textClass: "text-yellow-700",
    iconClass: "fas fa-triangle-exclamation",
    statusLabel: "Partially Completed",
    trackColor: "#FEF3C7",
    fillGradient: "linear-gradient(90deg, #FBBF24 0%, #D97706 100%)",
    shimmer: false,
  },
  failed: {
    badgeClass: "text-red-700 bg-red-50 border border-red-200",
    textClass: "text-red-700",
    iconClass: "fas fa-circle-xmark",
    statusLabel: "Failed",
    trackColor: "#FEE2E2",
    fillGradient: "linear-gradient(90deg, #F87171 0%, #DC2626 100%)",
    shimmer: false,
  },
  cancelled: {
    badgeClass: "text-blueGray-700 bg-blueGray-50 border border-blueGray-200",
    textClass: "text-blueGray-700",
    iconClass: "fas fa-ban",
    statusLabel: "Cancelled",
    trackColor: "#E2E8F0",
    fillGradient: "linear-gradient(90deg, #94A3B8 0%, #64748B 100%)",
    shimmer: false,
  },
};

const ProgressBar = ({
  taskInProgress,
  percentage = 0,
  status = "in_progress",
  scrollIntoViewOnMount = false,
}) => {
  const ref = useRef(null);
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.in_progress;
  const normalizedPercentage = Math.min(
    100,
    Math.max(0, Number.isFinite(Number(percentage)) ? Number(percentage) : 0),
  );
  const showMinimumFill = status === "in_progress" && normalizedPercentage > 0;

  useEffect(() => {
    if (!scrollIntoViewOnMount || !ref.current) return;

    ref.current.scrollIntoView({ behavior: "smooth", block: "end" });
    const timer = window.setTimeout(
      () => window.scrollBy({ top: 80, behavior: "smooth" }),
      300,
    );

    return () => window.clearTimeout(timer);
  }, [scrollIntoViewOnMount]);

  return (
    <div ref={ref} className="relative">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${config.badgeClass}`}
          >
            <i className={`${config.iconClass} mr-1.5 text-[11px]`}></i>
            &nbsp;{config.statusLabel}
          </span>
          <span className="ml-3 text-sm font-medium text-blueGray-600">
            {taskInProgress}
          </span>
        </div>
        <span className={`text-sm font-semibold ${config.textClass}`}>
          {Math.round(normalizedPercentage)}%
        </span>
      </div>

      <div
        className="relative w-full overflow-hidden rounded-full"
        style={{
          height: "14px",
          background: config.trackColor,
          boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.08)",
        }}
      >
        <div
          className="relative h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${normalizedPercentage}%`,
            minWidth: showMinimumFill ? "48px" : undefined,
            maxWidth: normalizedPercentage > 0 ? "100%" : "0%",
            background: config.fillGradient,
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.16)",
          }}
        >
          {config.shimmer && (
            <div
              className="absolute inset-y-0 right-0 w-16 opacity-60"
              style={{
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 100%)",
              }}
            ></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
