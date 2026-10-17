import { useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  Database,
  FileText,
  Globe,
  Radio,
  Search,
  Server,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  displayTime,
  downloadCsv,
  recordEvent,
  useSharedState,
  type AuditEvent,
} from "../services/workspaceStore";
import { Badge, Chart, Metric, Panel } from "./OperatorUI";
const emptyEvents: AuditEvent[] = [];
export function AdminAudit() {
  const [events] = useSharedState("events", emptyEvents);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All");
  const [days, setDays] = useState("7");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<AuditEvent | null>(null);
  const list = events.filter(
    (e) =>
      (type === "All" || e.action === type) &&
      `${e.actor} ${e.description} ${e.module}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (days === "all" ||
        Date.now() - new Date(e.at).getTime() <= Number(days) * 86400000),
  );
  const pages = Math.max(1, Math.ceil(list.length / 8));
  const current = Math.min(page, pages);
  const exportLogs = () => {
    downloadCsv("HydroMesh-audit-logs.csv", [
      ["Timestamp (UTC)", "Actor", "Module", "Action", "Description"],
      ...list.map((e) => [e.at, e.actor, e.module, e.action, e.description]),
    ]);
    recordEvent(
      "Administrator",
      "Audit Logs",
      "Export",
      `Exported ${list.length} filtered audit records`,
    );
  };
  return (
    <>
      <div className="op-metrics">
        <Metric
          label="Total Events"
          value={String(events.length)}
          detail="Recorded demo activity"
          icon={FileText}
        />
        <Metric
          label="Access Changes"
          value={String(
            events.filter((e) => ["Users", "Permissions"].includes(e.module))
              .length,
          )}
          detail="User and role events"
          icon={ShieldCheck}
          tone="red"
        />
        <Metric
          label="Operator Actions"
          value={String(events.filter((e) => e.actor === "Operator").length)}
          detail="Connected utility workspace"
          icon={Activity}
          tone="green"
        />
        <Metric
          label="Browser Storage"
          value="Local"
          detail="No database connected"
          icon={Database}
          tone="green"
        />
      </div>
      <div className="ad-audit-layout">
        <div className="op-right-stack">
          <Panel
            title="System Infrastructure Status"
            action={<Badge>Demo topology</Badge>}
          >
            <div className="ad-infrastructure">
              <div className="ad-server-center">
                <Server size={70} />
                <strong>HydroMesh</strong>
                <small>Local demonstration</small>
              </div>
              {[
                ["Web Application", Globe, "Browser runtime"],
                ["Data Store", Database, "Local browser storage"],
                ["GIS Engine", Globe, "Cesium / Mapbox"],
                ["IoT Broker", Radio, "Simulated · not connected"],
              ].map(([name, Icon, status], i) => {
                const Component = Icon as typeof Globe;
                return (
                  <div className={`ad-service service-${i}`} key={String(name)}>
                    <Component size={27} />
                    <div>
                      <strong>{String(name)}</strong>
                      <small>{String(status)}</small>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="ad-health-row">
              {[
                "API: not connected",
                "Storage: local",
                "Backups: manual export",
                "Network: browser",
              ].map((v) => (
                <span key={v}>
                  <ShieldCheck size={16} />
                  {v}
                </span>
              ))}
            </div>
          </Panel>
          <Panel title="Illustrative Performance Metrics">
            <div className="ad-performance">
              {[
                ["CPU Usage", "28%"],
                ["Memory Usage", "62%"],
                ["Disk Usage", "42%"],
                ["Network Traffic", "120 Mbps"],
              ].map(([label, value], i) => (
                <div key={label}>
                  <small>{label}</small>
                  <strong>{value}</strong>
                  <Chart compact green={i % 2 === 0} />
                </div>
              ))}
            </div>
            <p className="op-hint">
              Sample infrastructure metrics for the reference layout; not
              measurements of this computer or a server.
            </p>
          </Panel>
        </div>
        <Panel
          title="Recent Audit Logs"
          action={
            <button className="op-primary" onClick={exportLogs}>
              <ArrowDownToLine size={15} />
              Export Logs
            </button>
          }
        >
          <div className="ad-audit-filters">
            <div className="op-list-search">
              <Search size={14} />
              <input
                aria-label="Search audit logs"
                placeholder="Search user, action, or module…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              aria-label="Audit event type"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
            >
              {[
                "All",
                "Create",
                "Update",
                "Export",
                "Simulation",
                "Command",
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <select
              aria-label="Audit time range"
              value={days}
              onChange={(e) => {
                setDays(e.target.value);
                setPage(1);
              }}
            >
              <option value="1">Last 24 hours</option>
              <option value="7">Last 7 days</option>
              <option value="all">All time</option>
            </select>
          </div>
          <div className="op-table-scroll">
            <table className="op-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Event</th>
                  <th>Description</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.slice((current - 1) * 8, current * 8).map((e) => (
                  <tr key={e.id}>
                    <td>{displayTime(e.at)}</td>
                    <td>{e.actor}</td>
                    <td>
                      <Badge>{e.action}</Badge>
                    </td>
                    <td>
                      <strong>{e.module}</strong>
                      <p className="ad-audit-description">{e.description}</p>
                    </td>
                    <td>
                      <button
                        className="op-text-button"
                        onClick={() => setDetail(e)}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!list.length && (
              <div className="ad-empty">
                <FileText size={32} />
                <h3>No matching activity yet</h3>
                <p>Actions in either workspace appear here automatically.</p>
              </div>
            )}
          </div>
          <div className="ad-pagination">
            <span>
              {list.length} events · {current} / {pages}
            </span>
            <button
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              Previous
            </button>
            <button
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
            >
              Next
            </button>
          </div>
        </Panel>
      </div>
      {detail && (
        <div className="op-modal-backdrop">
          <section
            className="op-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Audit event details"
          >
            <div className="op-panel-head">
              <h2>Audit Event</h2>
              <button
                className="ad-icon"
                aria-label="Close event details"
                onClick={() => setDetail(null)}
              >
                <X size={18} />
              </button>
            </div>
            <dl className="op-details">
              <dt>Event ID</dt>
              <dd className="ad-wrap">{detail.id}</dd>
              <dt>Timestamp</dt>
              <dd>{displayTime(detail.at)} (Manila)</dd>
              <dt>Actor</dt>
              <dd>{detail.actor}</dd>
              <dt>Module</dt>
              <dd>{detail.module}</dd>
              <dt>Action</dt>
              <dd>{detail.action}</dd>
            </dl>
            <p className="ad-event-detail">{detail.description}</p>
            <p className="op-hint">
              Local demo audit record. No IP address is collected.
            </p>
          </section>
        </div>
      )}
    </>
  );
}
