import { useState } from "react";
import {
  Activity,
  Pencil,
  Plus,
  Radio,
  Search,
  Wifi,
  WifiOff,
  Wrench,
  X,
} from "lucide-react";
import { demoAssets } from "../data/assets";
import { seedNodes, type DemoNode } from "../data/adminSeeds";
import { useSharedState } from "../services/workspaceStore";
import { Badge, Metric, Panel } from "./OperatorUI";
import { OperatorMap } from "./OperatorMap";
export function AdminNodes() {
  const [nodes, setNodes] = useSharedState(
    "nodes",
    seedNodes,
    "Administrator",
    "IoT Nodes",
  );
  const [selected, setSelected] = useState(nodes[0].id);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [edit, setEdit] = useState<DemoNode | "new" | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const node = nodes.find((n) => n.id === selected) ?? nodes[0];
  const asset = demoAssets.find((a) => a.id === node.asset)!;
  const list = nodes.filter(
    (n) =>
      (filter === "All" || n.status === filter) &&
      `${n.name} ${n.id} ${n.type} ${demoAssets.find((a) => a.id === n.asset)?.zone}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(list.length / 7));
  const current = Math.min(page, pages);
  const update = (change: Partial<DemoNode>) =>
    setNodes((items) =>
      items.map((n) => (n.id === node.id ? { ...n, ...change } : n)),
    );
  return (
    <>
      <div className="op-metrics">
        <Metric
          label="Total Nodes"
          value={String(nodes.length)}
          detail="Registered devices"
          icon={Radio}
        />
        <Metric
          label="Online"
          value={String(nodes.filter((n) => n.status === "Online").length)}
          detail="Demo connections"
          icon={Wifi}
          tone="green"
        />
        <Metric
          label="Offline"
          value={String(nodes.filter((n) => n.status === "Offline").length)}
          detail="Requires attention"
          icon={WifiOff}
          tone="red"
        />
        <Metric
          label="Maintenance"
          value={String(nodes.filter((n) => n.status === "Maintenance").length)}
          detail="Service in progress"
          icon={Wrench}
          tone="amber"
        />
      </div>
      <div className="ad-node-layout">
        <div className="op-map-card">
          <OperatorMap
            selectedAssetId={node.asset}
            onSelectAsset={(id) => {
              const match = nodes.find((n) => n.asset === id);
              if (match) setSelected(match.id);
            }}
          />
        </div>
        <Panel
          title="Node Registry"
          action={
            <button
              className="op-primary"
              onClick={() => {
                setEdit("new");
                setError("");
              }}
            >
              <Plus size={15} />
              Register Node
            </button>
          }
        >
          <div className="op-list-search">
            <Search size={14} />
            <input
              aria-label="Search nodes"
              placeholder="Search ID, device, or location…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="op-tabs">
            {["All", "Online", "Offline", "Maintenance"].map((s) => (
              <button
                className={filter === s ? "active" : ""}
                key={s}
                onClick={() => {
                  setFilter(s);
                  setPage(1);
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="op-table-scroll">
            <table className="op-table">
              <thead>
                <tr>
                  <th>Node / type</th>
                  <th>Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {list.slice((current - 1) * 7, current * 7).map((n) => (
                  <tr
                    key={n.id}
                    className={selected === n.id ? "selected" : ""}
                  >
                    <td>
                      <button
                        className="op-cell-button"
                        onClick={() => setSelected(n.id)}
                      >
                        <strong>{n.id}</strong>
                        <small>{n.name}</small>
                        <small>{n.type}</small>
                      </button>
                    </td>
                    <td>{demoAssets.find((a) => a.id === n.asset)?.zone}</td>
                    <td>
                      <Badge>{n.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!list.length && <p className="op-empty">No matching nodes.</p>}
          </div>
          <div className="ad-pagination">
            <span>
              {list.length} nodes · Page {current} of {pages}
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
        <Panel title="Node Details">
          <div className="ad-device">
            <Radio size={34} />
            <h3>{node.name}</h3>
            <p>
              {node.id} · {node.type}
            </p>
            <Badge>{node.status}</Badge>
          </div>
          <dl className="op-details">
            <dt>Location</dt>
            <dd>{asset.zone}</dd>
            <dt>Coordinates</dt>
            <dd>
              {asset.latitude.toFixed(4)}° N<br />
              {asset.longitude.toFixed(4)}° E
            </dd>
            <dt>Firmware</dt>
            <dd>{node.firmware}</dd>
            <dt>Sample interval</dt>
            <dd>{node.interval} seconds</dd>
            <dt>Calibration</dt>
            <dd>{node.calibration}</dd>
          </dl>
          <div className="ad-panel-actions">
            <button
              className="op-primary full"
              onClick={() => {
                setEdit(node);
                setError("");
              }}
            >
              <Pencil size={15} />
              Configure Device
            </button>
            <button
              className="op-secondary"
              onClick={() =>
                update({
                  status:
                    node.status === "Maintenance" ? "Online" : "Maintenance",
                })
              }
            >
              <Wrench size={14} />
              {node.status === "Maintenance" ? "Finish service" : "Maintenance"}
            </button>
            <button
              className="op-secondary"
              onClick={() =>
                update({
                  status: node.status === "Offline" ? "Online" : "Offline",
                })
              }
            >
              {node.status === "Offline" ? "Activate" : "Deactivate"}
            </button>
            <button
              className="op-secondary full"
              onClick={() =>
                update({
                  calibration: new Date().toLocaleDateString("en-CA", {
                    timeZone: "Asia/Manila",
                  }),
                })
              }
            >
              Calibrate now (demo)
            </button>
          </div>
          <div className="op-section-label">ASSET SAMPLE READINGS</div>
          <div className="ad-readings">
            {asset.snapshot.map((s) => (
              <div key={s.label}>
                <Activity size={15} />
                <small>{s.label}</small>
                <strong>
                  {s.value} {s.unit}
                </strong>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      {edit && (
        <div className="op-modal-backdrop">
          <section
            className="op-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="node-title"
          >
            <div className="op-panel-head">
              <h2 id="node-title">
                {edit === "new" ? "Register Node" : "Configure Node"}
              </h2>
              <button
                className="ad-icon"
                aria-label="Close node dialog"
                onClick={() => setEdit(null)}
              >
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const id = String(f.get("id")).trim();
                const name = String(f.get("name")).trim();
                if (!id || !name) {
                  setError("Node ID and name cannot be blank.");
                  return;
                }
                if (
                  nodes.some(
                    (n) =>
                      n.id.toLowerCase() === id.toLowerCase() &&
                      (edit === "new" || n.id !== edit.id),
                  )
                ) {
                  setError("Node ID already exists.");
                  return;
                }
                const saved: DemoNode = {
                  id,
                  name,
                  asset: String(f.get("asset")),
                  type: String(f.get("type")),
                  status: f.get("status") as DemoNode["status"],
                  firmware: String(f.get("firmware")).trim(),
                  interval: Number(f.get("interval")),
                  calibration:
                    edit === "new" ? "Not calibrated" : edit.calibration,
                };
                setNodes((items) =>
                  edit === "new"
                    ? [...items, saved]
                    : items.map((n) => (n.id === edit.id ? saved : n)),
                );
                setSelected(id);
                setEdit(null);
              }}
            >
              <label className="op-field">
                Node ID
                <input
                  required
                  name="id"
                  maxLength={30}
                  readOnly={edit !== "new"}
                  defaultValue={edit === "new" ? "" : edit.id}
                />
              </label>
              <label className="op-field">
                Device name
                <input
                  required
                  name="name"
                  maxLength={70}
                  defaultValue={edit === "new" ? "" : edit.name}
                />
              </label>
              <label className="op-field">
                Map to existing asset
                <select
                  name="asset"
                  defaultValue={edit === "new" ? demoAssets[0].id : edit.asset}
                >
                  {demoAssets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} · {a.zone}
                    </option>
                  ))}
                </select>
              </label>
              <label className="op-field">
                Device type
                <select
                  name="type"
                  defaultValue={
                    edit === "new" ? "Water Quality Sensor" : edit.type
                  }
                >
                  {[
                    "Water Quality Sensor",
                    "Pump Controller",
                    "Water Level Sensor",
                    "Treatment Monitor",
                    "Flow Sensor",
                    "Pressure Sensor",
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="op-field">
                Status
                <select
                  name="status"
                  defaultValue={edit === "new" ? "Online" : edit.status}
                >
                  {["Online", "Offline", "Maintenance"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <div className="ad-form-columns">
                <label className="op-field">
                  Firmware
                  <input
                    name="firmware"
                    required
                    defaultValue={edit === "new" ? "v2.4.1" : edit.firmware}
                  />
                </label>
                <label className="op-field">
                  Interval (seconds)
                  <input
                    name="interval"
                    type="number"
                    min="5"
                    max="3600"
                    required
                    defaultValue={edit === "new" ? 60 : edit.interval}
                  />
                </label>
              </div>
              {error && (
                <p className="ad-error" role="alert">
                  {error}
                </p>
              )}
              <div className="op-detail-actions">
                <button
                  className="op-secondary"
                  type="button"
                  onClick={() => setEdit(null)}
                >
                  Cancel
                </button>
                <button className="op-primary" type="submit">
                  Save Device
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
