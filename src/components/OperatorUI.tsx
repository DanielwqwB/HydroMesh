import { useId, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
export function Badge({ children }: { children: string }) {
  return (
    <span
      className={`op-badge ${/critical|high|^open$|closed|offline|suspended/i.test(children) ? "red" : /warning|medium|progress|pending|maintenance/i.test(children) ? "amber" : /info|acknowledged/i.test(children) ? "blue" : "green"}`}
    >
      {children}
    </span>
  );
}
export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`op-panel ${className}`}>
      <div className="op-panel-head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Chart({
  green = false,
  bars = false,
  compact = false,
}: {
  green?: boolean;
  bars?: boolean;
  compact?: boolean;
}) {
  const id = useId();
  return (
    <div className={`op-chart ${compact ? "compact" : ""}`}>
      <svg
        viewBox="0 0 420 120"
        preserveAspectRatio="none"
        role="img"
        aria-label={
          bars
            ? "Sample daily inflow and outflow chart"
            : "Sample seven-day trend"
        }
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor={green ? "#11b67b" : "#1475ff"} stopOpacity=".24" />
            <stop
              offset="1"
              stopColor={green ? "#11b67b" : "#1475ff"}
              stopOpacity=".01"
            />
          </linearGradient>
        </defs>
        {!compact &&
          [20, 55, 90].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="420"
              y2={y}
              stroke="#eaf0f7"
              strokeDasharray="3 3"
            />
          ))}
        {bars ? (
          [50, 68, 58, 77, 65, 88, 72, 60, 81, 69, 91, 73, 61, 83].map(
            (h, i) => (
              <g key={i}>
                <rect
                  x={i * 30 + 3}
                  y={110 - h}
                  width="10"
                  height={h}
                  rx="2"
                  fill="#1876ff"
                />
                <rect
                  x={i * 30 + 15}
                  y={100 - h}
                  width="10"
                  height={h + 10}
                  rx="2"
                  fill="#5dc9f8"
                />
              </g>
            ),
          )
        ) : (
          <>
            <path
              d="M0 70 C20 66 25 47 45 54 S70 80 95 60 S125 52 145 66 S175 72 195 51 S225 31 245 43 S275 69 295 45 S325 53 345 29 S380 45 400 25 L420 16 L420 115 L0 115Z"
              fill={`url(#${id})`}
            />
            <path
              d="M0 70 C20 66 25 47 45 54 S70 80 95 60 S125 52 145 66 S175 72 195 51 S225 31 245 43 S275 69 295 45 S325 53 345 29 S380 45 400 25 L420 16"
              fill="none"
              stroke={green ? "#0bb477" : "#1674ff"}
              strokeWidth={compact ? "4" : "2.5"}
            />
            {!compact && (
              <path
                d="M0 88 Q30 81 60 90 T120 93 T180 82 T240 92 T300 81 T360 87 T420 78"
                fill="none"
                stroke="#15b67c"
                strokeWidth="2"
              />
            )}
          </>
        )}
      </svg>
      {!compact && (
        <div className="op-chart-labels">
          {[12, 13, 14, 15, 16, 17, 18].map((d) => (
            <span key={d}>Oct {d}</span>
          ))}
        </div>
      )}
    </div>
  );
}
export function Metric({
  label,
  value,
  detail,
  icon: Icon,
  tone = "blue",
  bars = false,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: string;
  bars?: boolean;
}) {
  return (
    <div className="op-metric">
      <div className={`op-metric-icon ${tone}`}>
        <Icon size={25} />
      </div>
      <div className="op-metric-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small className={tone === "red" ? "red-text" : ""}>● {detail}</small>
      </div>
      <Chart compact green={tone === "green"} bars={bars} />
    </div>
  );
}
