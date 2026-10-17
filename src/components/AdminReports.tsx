import { useState } from "react";
import {
  Activity,
  CalendarDays,
  Wrench,
  ArrowDownToLine,
  Bell,
  Droplets,
  FileText,
  FlaskConical,
  Gauge,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import { demoAssets } from "../data/assets";
import { seedIncidents, seedOrders } from "../data/operatorSeeds";
import type { SavedReport } from "../data/adminSeeds";
import {
  displayTime,
  downloadCsv,
  recordEvent,
  useSharedState,
} from "../services/workspaceStore";
import { Chart, Metric, Panel } from "./OperatorUI";
import { OperatorMap } from "./OperatorMap";
const emptyReports: SavedReport[] = [];
const reportTypes = [
  "Water Supply",
  "Water Quality",
  "Pressure & Flow",
  "Incident & Alert",
  "Asset Performance",
  "Maintenance",
];
export function AdminReports({ analytics = false }: { analytics?: boolean }) {
  const [incidents] = useSharedState("incidents", seedIncidents);
  const [orders] = useSharedState("orders", seedOrders);
  const [reports, setReports] = useSharedState(
    "reports",
    emptyReports,
    "Administrator",
    "Reports",
  );
  const [zone, setZone] = useState("All Zones");
  const [selected, setSelected] = useState<string | null>(null);
  const [type, setType] = useState(reportTypes[0]);
  const [preview, setPreview] = useState<SavedReport | null>(null);
  const [page, setPage] = useState(1);
  const assets = demoAssets.filter(
    (a) => zone === "All Zones" || a.zone === zone,
  );
  const pages = Math.max(1, Math.ceil(reports.length / 5));
  const current = Math.min(page, pages);
  const generate = (requestedType = type, downloadNow = false) => {
    const type = requestedType;
    let rows: (string | number)[][];
    if (type === "Incident & Alert")
      rows = [
        ["ID", "Title", "Asset", "Severity", "Status", "Team"],
        ...incidents
          .filter((i) => assets.some((a) => a.id === i.asset))
          .map((i) => [i.id, i.title, i.asset, i.severity, i.status, i.team]),
      ];
    else if (type === "Maintenance")
      rows = [
        ["ID", "Title", "Asset", "Priority", "Status", "Assigned to", "Due"],
        ...orders
          .filter((o) => assets.some((a) => a.id === o.asset))
          .map((o) => [
            o.id,
            o.title,
            o.asset,
            o.priority,
            o.status,
            o.team,
            o.due,
          ]),
      ];
    else
      rows = [
        ["Asset", "Zone", "Parameter", "Sample value", "Unit", "Status"],
        ...assets.flatMap((a) =>
          a.snapshot
            .filter(
              (s) =>
                type === "Asset Performance" ||
                (type === "Water Supply" &&
                  ["Storage", "Capacity", "Outflow"].includes(s.label)) ||
                (type === "Water Quality" &&
                  ["pH", "Turbidity", "Chlorine", "TDS"].includes(s.label)) ||
                (type === "Pressure & Flow" &&
                  /Pressure|Flow|Outflow|Head/i.test(s.label)),
            )
            .map((s) => [
              a.name,
              a.zone,
              s.label,
              s.value,
              s.unit ?? "",
              a.status,
            ]),
        ),
      ];
    const report: SavedReport = {
      id: crypto.randomUUID(),
      name: `${type} · ${zone}`,
      type,
      at: new Date().toISOString(),
      generatedBy: "Administrator",
      rows,
    };
    setReports((items) => [report, ...items]);
    if (downloadNow) download(report);
    else setPreview(report);
    setPage(1);
  };
  const download = (r: SavedReport) => {
    downloadCsv(`HydroMesh-${r.type.replaceAll(" ", "-")}.csv`, [
      ["Demo report", r.name],
      ["Generated UTC", r.at],
      ...r.rows,
    ]);
    recordEvent("Administrator", "Reports", "Export", `Downloaded ${r.name}`);
  };
  const savedReports = (
    <Panel title="Saved Reports">
      <div className="op-table-scroll">
        <table className="op-table">
          <thead>
            <tr>
              <th>Report name</th>
              <th>Generated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.slice((current - 1) * 5, current * 5).map((r) => (
              <tr key={r.id}>
                <td>
                  <button
                    className="op-cell-button"
                    onClick={() => setPreview(r)}
                  >
                    <strong>{r.name}</strong>
                    <small>{r.generatedBy}</small>
                  </button>
                </td>
                <td>{displayTime(r.at)}</td>
                <td>
                  <button
                    className="ad-icon"
                    aria-label={`Download ${r.name}`}
                    onClick={() => download(r)}
                  >
                    <ArrowDownToLine size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!reports.length && (
          <p className="op-empty">Generate a report to save a snapshot here.</p>
        )}
      </div>
      <div className="ad-pagination">
        <span>{reports.length} reports</span>
        <button disabled={current === 1} onClick={() => setPage(current - 1)}>
          Previous
        </button>
        <b>{current}</b>
        <button
          disabled={current === pages}
          onClick={() => setPage(current + 1)}
        >
          Next
        </button>
      </div>
    </Panel>
  );
  return (
    <>
      <div className="op-metrics">
        <Metric
          icon={Droplets}
          label="Stored Water"
          value="4.35 ML"
          detail="Illustrative network supply"
        />
        <Metric
          icon={Gauge}
          label="Average Pressure"
          value="3.4 bar"
          detail="Sample network average"
          tone="green"
        />
        <Metric
          icon={ShieldCheck}
          label="Water Quality"
          value="98%"
          detail="Illustrative compliance"
        />
        <Metric
          icon={Bell}
          label="Total Alerts"
          value={String(incidents.length)}
          detail={`${incidents.filter((i) => i.status !== "Resolved").length} active incidents`}
          tone="red"
        />
      </div>
      {analytics ? (
        <>
          <div className="ad-reports-layout">
            <Panel
              title="Water Supply Trend"
              action={
                <span className="op-chart-key">
                  ● Supply <i>● Demand</i>
                </span>
              }
            >
              <Chart />
              <p className="op-hint">Oct 12–18 · Static demo trend</p>
            </Panel>
            <Panel
              title="Pressure Distribution"
              action={
                <select
                  aria-label="Report zone"
                  value={zone}
                  onChange={(e) => {
                    setZone(e.target.value);
                    setSelected(
                      demoAssets.find((a) => a.zone === e.target.value)?.id ??
                        null,
                    );
                  }}
                >
                  {["All Zones", ...new Set(demoAssets.map((a) => a.zone))].map(
                    (z) => (
                      <option key={z}>{z}</option>
                    ),
                  )}
                </select>
              }
            >
              <div className="ad-pressure-bars">
                {assets
                  .filter((a) => a.type === "pipeline")
                  .map((a) => {
                    const pressure = Number(
                      a.snapshot.find((s) => s.label === "Pressure")?.value ??
                        0,
                    );
                    return (
                      <button
                        key={a.id}
                        onClick={() => setSelected(a.id)}
                        title={`${a.name}: ${pressure} bar`}
                      >
                        <strong>{pressure}</strong>
                        <i
                          style={{
                            height: `${Math.max(5, pressure * 25)}px`,
                            background:
                              a.status === "critical" ? "#ff6677" : "#33a8ff",
                          }}
                        />
                        <small>
                          {a.name.replace("Mainline Segment ", "Line ")}
                        </small>
                      </button>
                    );
                  })}
                {!assets.some((a) => a.type === "pipeline") && (
                  <p className="op-hint">
                    No pipeline pressure readings in this zone.
                  </p>
                )}
              </div>
            </Panel>
            <Panel title="Report Generation">
              <div className="ad-report-types">
                {reportTypes.map((r, i) => {
                  const Icon = [
                    Droplets,
                    FlaskConical,
                    Gauge,
                    Bell,
                    Activity,
                    CalendarDays,
                    Wrench,
                    FileText,
                  ][i];
                  return (
                    <button
                      key={r}
                      className={type === r ? "selected" : ""}
                      onClick={() => setType(r)}
                    >
                      <Icon size={24} />
                      <span>
                        {r}
                        <small>Report</small>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="ad-panel-actions">
                <button className="op-primary full" onClick={() => generate()}>
                  <Plus size={15} />
                  Generate {type} Report
                </button>
              </div>
            </Panel>
            <Panel title="Water Quality Trend">
              <Chart green />
              <p className="op-hint">
                Illustrative pH and turbidity trend · 7 days
              </p>
            </Panel>
            <Panel
              title="Network Coverage & Asset Status"
              className="ad-embedded-map"
            >
              <OperatorMap
                selectedAssetId={selected}
                onSelectAsset={setSelected}
              />
            </Panel>
            {savedReports}
          </div>
          <div className="op-bottom-grid">
            <Panel title="Alerts & Incidents Summary">
              <div className="ad-summary-counts">
                {["Critical", "Warning", "Info"].map((s) => (
                  <div key={s}>
                    <strong>
                      {incidents.filter((i) => i.severity === s).length}
                    </strong>
                    <small>{s}</small>
                  </div>
                ))}
              </div>
              <Chart bars />
            </Panel>
            <Panel title="Locations Requiring Attention">
              <div className="ad-location-bars">
                {[...new Set(demoAssets.map((a) => a.zone))].map((z) => {
                  const count = incidents.filter(
                    (i) =>
                      demoAssets.find((a) => a.id === i.asset)?.zone === z &&
                      i.status !== "Resolved",
                  ).length;
                  return (
                    <button
                      key={z}
                      onClick={() => {
                        setZone(z);
                        setSelected(
                          demoAssets.find((a) => a.zone === z)?.id ?? null,
                        );
                      }}
                    >
                      <span>{z}</span>
                      <i style={{ width: `${Math.max(5, count * 18)}%` }} />
                      <b>{count}</b>
                    </button>
                  );
                })}
              </div>
            </Panel>
            <Panel title="Key Insights">
              <ul className="ad-insights">
                <li>
                  {incidents.filter((i) => i.status !== "Resolved").length}{" "}
                  incidents currently require follow-up.
                </li>
                <li>
                  {orders.filter((o) => o.status === "Completed").length}{" "}
                  maintenance tasks completed.
                </li>
                <li>
                  {orders.filter((o) => o.status === "Open").length} work orders
                  await action.
                </li>
                <li>
                  Reports use shared records and the project's existing asset
                  readings.
                </li>
              </ul>
            </Panel>
          </div>
        </>
      ) : (
        <>
          <div className="ad-page-tools">
            <p className="op-hint">
              Administrator snapshots of shared network data. Downloads are
              saved below and recorded in the audit log.
            </p>
            <label className="op-field">
              Report scope
              <select
                aria-label="Admin report zone"
                value={zone}
                onChange={(event) => setZone(event.target.value)}
              >
                {[
                  "All Zones",
                  ...new Set(demoAssets.map((asset) => asset.zone)),
                ].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="op-report-grid">
            {[
              {
                title: "Network performance",
                type: "Asset Performance",
                description:
                  "Administrator overview of infrastructure status, asset inventory, and network readings.",
                icon: Activity,
              },
              {
                title: "Water quality",
                type: "Water Quality",
                description:
                  "Review monitoring parameters and sample water quality readings across the network.",
                icon: FlaskConical,
              },
              {
                title: "Maintenance",
                type: "Maintenance",
                description:
                  "Oversee operator work orders, team assignments, priorities, and completion status.",
                icon: Wrench,
              },
            ].map((report) => (
              <Panel key={report.type} title={report.title}>
                <div className="op-report-icon">
                  <report.icon size={34} />
                </div>
                <p>{report.description}</p>
                <div className="op-report-meta">
                  <CalendarDays size={15} />
                  Admin report ? {zone}
                </div>
                <Chart green={report.type === "Water Quality"} />
                <button
                  className="op-primary full"
                  aria-label={`Download admin ${report.title} CSV`}
                  onClick={() => generate(report.type, true)}
                >
                  <ArrowDownToLine size={16} />
                  Download CSV
                </button>
              </Panel>
            ))}
          </div>
          <div className="ad-saved-report-section">{savedReports}</div>
        </>
      )}
      {preview && (
        <div className="op-modal-backdrop">
          <section
            className="op-modal ad-report-preview"
            role="dialog"
            aria-modal="true"
            aria-label="Report preview"
          >
            <div className="op-panel-head">
              <h2>{preview.name}</h2>
              <button
                className="ad-icon"
                aria-label="Close report preview"
                onClick={() => setPreview(null)}
              >
                <X size={18} />
              </button>
            </div>
            <p className="op-hint">
              Saved snapshot · {displayTime(preview.at)} · Demo data
            </p>
            <div className="op-table-scroll">
              <table className="op-table">
                <thead>
                  <tr>
                    {preview.rows[0].map((h, i) => (
                      <th key={i}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(1).map((r, i) => (
                    <tr key={i}>
                      {r.map((c, j) => (
                        <td key={j}>{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.rows.length === 1 && (
                <p className="op-empty">
                  No matching readings for this report and zone.
                </p>
              )}
            </div>
            <div className="ad-panel-actions">
              <button
                className="op-primary full"
                onClick={() => download(preview)}
              >
                <ArrowDownToLine size={15} />
                Download CSV
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
