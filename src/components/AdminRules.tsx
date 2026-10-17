import { useState } from "react";
import {
  Bell,
  Check,
  CircleAlert,
  FileText,
  Play,
  Plus,
  Search,
  Settings2,
} from "lucide-react";
import { demoAssets } from "../data/assets";
import {
  parameters,
  ruleTriggered,
  seedRules,
  type Rule,
} from "../data/adminSeeds";
import { seedIncidents, seedOrders } from "../data/operatorSeeds";
import { recordEvent, useSharedState } from "../services/workspaceStore";
import { Badge, Chart, Metric, Panel } from "./OperatorUI";
import { OperatorMap } from "./OperatorMap";
export function AdminRules() {
  const [rules, setRules] = useSharedState(
    "rules",
    seedRules,
    "Administrator",
    "System Settings",
  );
  const [, setIncidents] = useSharedState(
    "incidents",
    seedIncidents,
    "Administrator",
    "Alerts",
  );
  const [, setOrders] = useSharedState(
    "orders",
    seedOrders,
    "Administrator",
    "Work Orders",
  );
  const [draft, setDraft] = useState<Rule>({ ...rules[0] });
  const [isNew, setIsNew] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [notice, setNotice] = useState("");
  const [reading, setReading] = useState(parameters[draft.parameter].sample);
  const parameter = parameters[draft.parameter];
  const patch = (change: Partial<Rule>) => {
    setDraft((d) => ({ ...d, ...change }));
    setNotice("");
  };
  const select = (rule: Rule) => {
    setDraft({ ...rule });
    setReading(parameters[rule.parameter].sample);
    setIsNew(false);
    setNotice("");
  };
  const create = () => {
    setDraft({
      ...seedRules[0],
      id: crypto.randomUUID(),
      name: "",
      enabled: true,
    });
    setIsNew(true);
    setNotice("");
    setReading(96);
  };
  const simulate = () => {
    const saved = rules.find((r) => r.id === draft.id);
    if (!saved || JSON.stringify(saved) !== JSON.stringify(draft)) {
      setNotice("Save the rule before running a simulation.");
      return;
    }
    if (!ruleTriggered(saved, reading)) {
      setNotice(
        saved.enabled
          ? "Sample reading does not exceed this rule. No alert created."
          : "This rule is disabled. No alert created.",
      );
      return;
    }
    const id = `AL-${crypto.randomUUID().slice(0, 8)}`;
    setIncidents((items) => [
      {
        id,
        title: saved.name,
        asset: saved.asset,
        severity: saved.severity,
        time: "Just now",
        status: "Open",
        team: "Unassigned",
      },
      ...items,
    ]);
    if (saved.autoResponse)
      setOrders((items) => [
        {
          id: `WO-${crypto.randomUUID().slice(0, 8)}`,
          title: `Investigate: ${saved.name}`,
          asset: saved.asset,
          priority: saved.severity === "Critical" ? "High" : "Medium",
          status: "Open",
          team: "Team A",
          due: new Date().toLocaleDateString("en-CA", {
            timeZone: "Asia/Manila",
          }),
        },
        ...items,
      ]);
    recordEvent(
      "Administrator",
      "System Settings",
      "Simulation",
      `${saved.name}: ${reading} ${parameter.unit}; created ${id}${saved.autoResponse ? " and maintenance work order" : ""}. ${saved.channels.filter((c) => c !== "In-App").join(" / ")} channels simulated only.`,
    );
    setNotice(
      `Threshold exceeded. Alert ${id}${saved.autoResponse ? " and a work order" : ""} created in both workspaces. No messages or equipment commands were sent.`,
    );
  };
  return (
    <>
      <div className="ad-page-tools">
        <div className="op-tabs">
          {[
            "All",
            "Water Level",
            "Pressure",
            "Flow Rate",
            "Water Quality",
            "Device Health",
          ].map((t) => (
            <button
              key={t}
              className={category === t ? "active" : ""}
              onClick={() => setCategory(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <button className="op-primary" onClick={create}>
          <Plus size={16} />
          Create Rule
        </button>
      </div>
      <div className="op-metrics">
        <Metric
          label="Active Rules"
          value={String(rules.filter((r) => r.enabled).length)}
          detail="Enabled configurations"
          icon={FileText}
        />
        <Metric
          label="Critical Thresholds"
          value={String(rules.filter((r) => r.severity === "Critical").length)}
          detail="Priority monitoring"
          icon={CircleAlert}
          tone="red"
        />
        <Metric
          label="Notification Channels"
          value="3"
          detail="In-app · simulated email / SMS"
          icon={Bell}
        />
        <Metric
          label="Auto Responses"
          value={String(
            rules.filter((r) => r.autoResponse && r.enabled).length,
          )}
          detail="Demo work-order creation"
          icon={Settings2}
          tone="green"
        />
      </div>
      <div className="ad-rules-layout">
        <Panel
          title={isNew ? "Create Threshold Rule" : "Threshold Configuration"}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.name.trim()) {
                setNotice("Enter a rule name.");
                return;
              }
              if (
                draft.comparison === "outside" &&
                draft.upper <= draft.value
              ) {
                setNotice("Upper threshold must exceed the lower threshold.");
                return;
              }
              if (!draft.channels.length) {
                setNotice("Select at least one notification channel.");
                return;
              }
              const saved = { ...draft, name: draft.name.trim() };
              setRules((items) =>
                isNew
                  ? [...items, saved]
                  : items.map((r) => (r.id === draft.id ? saved : r)),
              );
              setDraft(saved);
              setIsNew(false);
              setNotice("Rule saved and available in the shared demo.");
            }}
          >
            <label className="op-field">
              Rule name
              <input
                required
                maxLength={80}
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </label>
            <label className="op-field">
              Parameter
              <select
                value={draft.parameter}
                onChange={(e) => {
                  const p = parameters[e.target.value];
                  patch({
                    parameter: e.target.value,
                    value: p.sample,
                    upper: p.max,
                  });
                  setReading(p.sample);
                }}
              >
                {Object.keys(parameters).map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="op-field">
              Asset / location
              <select
                value={draft.asset}
                onChange={(e) => patch({ asset: e.target.value })}
              >
                {demoAssets.map((a) => (
                  <option value={a.id} key={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="op-field">
              Threshold type
              <select
                value={draft.comparison}
                onChange={(e) =>
                  patch({ comparison: e.target.value as Rule["comparison"] })
                }
              >
                <option value="above">Upper limit — above</option>
                <option value="below">Lower limit — below</option>
                <option value="outside">Outside range</option>
              </select>
            </label>
            <div className="ad-form-columns">
              <label className="op-field">
                {draft.comparison === "outside" ? "Lower" : "Threshold"} (
                {parameter.unit})
                <input
                  type="number"
                  step="any"
                  min={parameter.min}
                  max={parameter.max}
                  required
                  value={draft.value}
                  onChange={(e) => patch({ value: Number(e.target.value) })}
                />
              </label>
              {draft.comparison === "outside" && (
                <label className="op-field">
                  Upper ({parameter.unit})
                  <input
                    type="number"
                    step="any"
                    min={parameter.min}
                    max={parameter.max}
                    required
                    value={draft.upper}
                    onChange={(e) => patch({ upper: Number(e.target.value) })}
                  />
                </label>
              )}
            </div>
            <label className="op-field">
              Severity
              <select
                value={draft.severity}
                onChange={(e) =>
                  patch({ severity: e.target.value as Rule["severity"] })
                }
              >
                {["Info", "Warning", "Critical"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <div className="op-section-label">NOTIFICATION CHANNELS</div>
            <div className="ad-checks">
              {["Email", "SMS", "In-App"].map((c) => (
                <label key={c}>
                  <input
                    type="checkbox"
                    checked={draft.channels.includes(c)}
                    onChange={(e) =>
                      patch({
                        channels: e.target.checked
                          ? [...draft.channels, c]
                          : draft.channels.filter((v) => v !== c),
                      })
                    }
                  />
                  {c}
                </label>
              ))}
            </div>
            <label className="ad-switch-label">
              <input
                type="checkbox"
                className="ad-toggle"
                checked={draft.autoResponse}
                onChange={(e) => patch({ autoResponse: e.target.checked })}
              />
              Create work order automatically
            </label>
            <p className="op-hint">
              Email and SMS are configuration previews. In-app alerts and work
              orders are shared locally.
            </p>
            <div className="op-detail-actions">
              <button
                className="op-secondary"
                type="button"
                onClick={() =>
                  select(rules.find((r) => r.id === draft.id) ?? rules[0])
                }
              >
                Cancel
              </button>
              <button className="op-primary" type="submit">
                <Check size={14} />
                Save Rule
              </button>
            </div>
          </form>
        </Panel>
        <div className="op-right-stack">
          <Panel title="Historical Data & Threshold Preview">
            <div className="ad-threshold-legend">
              <span>● {draft.parameter}</span>
              <span>
                {draft.comparison} {draft.value}
                {draft.comparison === "outside" ? `–${draft.upper}` : ""}{" "}
                {parameter.unit}
              </span>
            </div>
            <div className="ad-threshold-chart">
              <Chart />
              <div
                className="ad-threshold-line"
                style={{
                  bottom: `${24 + Math.max(0, Math.min(1, draft.value / parameter.max)) * 60}%`,
                }}
              />
            </div>
            <div className="ad-simulate">
              <label>
                Sample reading ({parameter.unit})
                <input
                  aria-label="Simulation reading"
                  type="number"
                  min={parameter.min}
                  max={parameter.max}
                  step="any"
                  value={reading}
                  onChange={(e) => setReading(Number(e.target.value))}
                />
              </label>
              <button
                className="op-secondary"
                disabled={
                  !Number.isFinite(reading) ||
                  reading < parameter.min ||
                  reading > parameter.max
                }
                onClick={simulate}
              >
                <Play size={14} />
                Run simulation
              </button>
            </div>
            {notice && (
              <p className="ad-notice" role="status">
                {notice}
              </p>
            )}
          </Panel>
          <Panel title="Affected Asset on Map" className="ad-embedded-map">
            <OperatorMap
              selectedAssetId={draft.asset}
              onSelectAsset={(id) => {
                if (id) patch({ asset: id });
              }}
            />
          </Panel>
        </div>
        <Panel title={`Alert Rules (${rules.length})`}>
          <div className="op-list-search">
            <Search size={14} />
            <input
              aria-label="Search rules"
              placeholder="Search rules…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="ad-rules-list">
            {rules
              .filter(
                (r) =>
                  (category === "All" ||
                    r.parameter === category ||
                    (category === "Water Quality" &&
                      ["pH", "Turbidity", "Chlorine"].includes(r.parameter)) ||
                    (category === "Device Health" &&
                      r.parameter === "Offline Minutes")) &&
                  r.name.toLowerCase().includes(query.toLowerCase()),
              )
              .map((r) => (
                <div className={r.id === draft.id ? "selected" : ""} key={r.id}>
                  <button onClick={() => select(r)}>
                    <span className="ad-rule-icon">
                      <Bell size={18} />
                    </span>
                    <span>
                      <strong>{r.name}</strong>
                      <small>
                        {demoAssets.find((a) => a.id === r.asset)?.name}
                      </small>
                      <small>
                        {r.parameter} {r.comparison} {r.value}
                        {r.comparison === "outside" ? `–${r.upper}` : ""}{" "}
                        {parameters[r.parameter].unit}
                      </small>
                    </span>
                  </button>
                  <div>
                    <Badge>{r.severity}</Badge>
                    <input
                      className="ad-toggle"
                      type="checkbox"
                      aria-label={`Enable ${r.name}`}
                      checked={r.enabled}
                      onChange={(e) => {
                        setRules((items) =>
                          items.map((item) =>
                            item.id === r.id
                              ? { ...item, enabled: e.target.checked }
                              : item,
                          ),
                        );
                        if (draft.id === r.id)
                          patch({ enabled: e.target.checked });
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
