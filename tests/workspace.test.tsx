import { StrictMode } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";
import {
  STORAGE_PREFIX,
  readShared,
  recordEvent,
  useSharedState,
  type AuditEvent,
} from "../src/services/workspaceStore";
import {
  seedIncidents,
  seedOrders,
  type Incident,
  type WorkOrder,
} from "../src/data/operatorSeeds";
import {
  ruleTriggered,
  seedNodes,
  seedRules,
  type DemoNode,
  type DemoUser,
  type SavedReport,
} from "../src/data/adminSeeds";

vi.mock("../src/components/OperatorMap", () => ({
  OperatorMap: ({ selectedAssetId }: { selectedAssetId: string | null }) => (
    <div data-testid="existing-3d-map">
      3D map asset: {selectedAssetId ?? "overview"}
    </div>
  ),
}));
beforeEach(() => {
  localStorage.clear();
  window.location.hash = "admin";
  vi.stubGlobal(
    "URL",
    Object.assign(URL, {
      createObjectURL: vi.fn(() => "blob:report"),
      revokeObjectURL: vi.fn(),
    }),
  );
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function role(name: "Administrator" | "Operator") {
  act(() => {
    fireEvent.change(screen.getByLabelText("Switch workspace role"), {
      target: { value: name },
    });
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
}
function nav(name: string) {
  fireEvent.click(
    within(screen.getByRole("navigation")).getByRole("button", {
      name: new RegExp(`^${name}( \\d+)?$`),
    }),
  );
}
const audit = () => readShared<AuditEvent[]>("events", []);

describe("connected municipal and administrator workspaces", () => {
  it("operator-created incidents persist, notify admin, and can be marked read without losing audit history", () => {
    window.location.hash = "operator";
    const app = render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    nav("Alerts");
    fireEvent.click(screen.getByRole("button", { name: "Create Incident" }));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Test mainline incident" },
    });
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Create incident",
      }),
    );
    expect(
      readShared<Incident[]>("incidents", []).some(
        (i) => i.title === "Test mainline incident",
      ),
    ).toBe(true);
    expect(audit()).toHaveLength(1);
    expect(audit()[0].actor).toBe("Operator");
    expect(audit()[0].read).toBe(false);
    role("Administrator");
    fireEvent.click(
      screen.getByRole("button", { name: "Admin notifications, 1 unread" }),
    );
    expect(
      screen.getAllByText("Test mainline incident created").length,
    ).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Mark all read" }));
    expect(audit()[0].read).toBe(true);
    expect(audit()).toHaveLength(1);
    app.unmount();
    render(<App />);
    nav("Alerts");
    expect(screen.getByText("Test mainline incident")).toBeTruthy();
  });

  it("acknowledgement and maintenance assignments are shared and audited", () => {
    window.location.hash = "operator";
    render(<App />);
    nav("Alerts");
    fireEvent.click(screen.getByRole("button", { name: "Acknowledge" }));
    expect(readShared<Incident[]>("incidents", [])[0].status).toBe(
      "Acknowledged",
    );
    nav("Work Orders");
    fireEvent.change(screen.getByLabelText("Assign work order team"), {
      target: { value: "Team C" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Start work" }));
    role("Administrator");
    nav("Work Orders");
    expect(
      (screen.getByLabelText("Team WO-001") as HTMLSelectElement).value,
    ).toBe("Team C");
    expect(
      (screen.getByLabelText("Status WO-001") as HTMLSelectElement).value,
    ).toBe("In Progress");
    expect(audit().filter((e) => e.actor === "Operator")).toHaveLength(3);
  });

  it("simulated actuator changes reach admin and remain after remount", () => {
    window.location.hash = "operator";
    const app = render(<App />);
    nav("Operations");
    expect(
      (
        screen.getByRole("button", {
          name: "Close / Stop",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    fireEvent.click(
      screen.getByRole("button", { name: "Enable demo control" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Close / Stop" }));
    expect(
      readShared<Record<string, number>>("positions", {})["demo-valve-1"],
    ).toBe(0);
    expect(audit()[0].module).toBe("Operations");
    role("Administrator");
    nav("Assets");
    expect(screen.getAllByText("0% (demo command)").length).toBeGreaterThan(0);
    app.unmount();
    render(<App />);
    expect(
      readShared<Record<string, number>>("positions", {})["demo-valve-1"],
    ).toBe(0);
  });

  it("admin adds users, rejects duplicate emails, and updates operator module access", () => {
    render(<App />);
    nav("Users");
    fireEvent.click(screen.getByRole("button", { name: "Add User" }));
    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "Test Operator" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "juan.delacruz@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save User" }));
    expect(screen.getByRole("alert").textContent).toContain(
      "already registered",
    );
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save User" }));
    expect(
      readShared<DemoUser[]>("users", []).some(
        (u) => u.name === "Test Operator",
      ),
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Edit Permissions" }));
    fireEvent.click(screen.getByLabelText("Operator Operations access"));
    fireEvent.click(screen.getByRole("button", { name: "Save", exact: true }));
    role("Operator");
    expect(
      within(screen.getByRole("navigation")).queryByRole("button", {
        name: "Operations",
      }),
    ).toBeNull();
  });

  it("suspending the connected operator blocks the operator workspace", () => {
    render(<App />);
    nav("Users");
    const row = screen.getByText("Juan Dela Cruz").closest("tr")!;
    fireEvent.click(within(row).getByRole("button", { name: "Suspend" }));
    role("Operator");
    expect(
      screen.getByRole("heading", { name: "Operator access suspended" }),
    ).toBeTruthy();
    role("Administrator");
    expect(
      screen.getByRole("heading", { name: "System Overview Dashboard" }),
    ).toBeTruthy();
  });

  it("registers a node on an existing map asset and changes its lifecycle state", () => {
    render(<App />);
    nav("IoT Nodes");
    fireEvent.click(screen.getByRole("button", { name: "Register Node" }));
    fireEvent.change(screen.getByLabelText("Node ID"), {
      target: { value: "TEST-001" },
    });
    fireEvent.change(screen.getByLabelText("Device name"), {
      target: { value: "Test reservoir sensor" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Device" }));
    expect(readShared<DemoNode[]>("nodes", [])).toHaveLength(
      seedNodes.length + 1,
    );
    expect(screen.getByTestId("existing-3d-map").textContent).toContain(
      "demo-reservoir-a",
    );
    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));
    expect(
      readShared<DemoNode[]>("nodes", []).find((n) => n.id === "TEST-001")
        ?.status,
    ).toBe("Offline");
    fireEvent.click(screen.getByRole("button", { name: "Activate" }));
    expect(
      readShared<DemoNode[]>("nodes", []).find((n) => n.id === "TEST-001")
        ?.status,
    ).toBe("Online");
  });

  it("saved rules create shared alerts and work orders only when the threshold is exceeded", () => {
    render(<App />);
    nav("System Settings");
    fireEvent.click(screen.getByLabelText("Create work order automatically"));
    fireEvent.click(screen.getByRole("button", { name: "Save Rule" }));
    fireEvent.click(screen.getByRole("button", { name: "Run simulation" }));
    expect(readShared<Incident[]>("incidents", [])).toHaveLength(
      seedIncidents.length + 1,
    );
    expect(readShared<WorkOrder[]>("orders", [])).toHaveLength(
      seedOrders.length + 1,
    );
    fireEvent.change(screen.getByLabelText("Simulation reading"), {
      target: { value: "80" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Run simulation" }));
    expect(readShared<Incident[]>("incidents", [])).toHaveLength(
      seedIncidents.length + 1,
    );
    role("Operator");
    nav("Alerts");
    expect(screen.getByText("High Reservoir Level")).toBeTruthy();
    expect(ruleTriggered({ ...seedRules[0], enabled: false }, 100)).toBe(false);
    expect(
      ruleTriggered(
        { ...seedRules[0], comparison: "outside", value: 20, upper: 80 },
        50,
      ),
    ).toBe(false);
    expect(
      ruleTriggered(
        { ...seedRules[0], comparison: "outside", value: 20, upper: 80 },
        81,
      ),
    ).toBe(true);
  });

  it("generates saved report snapshots and downloads CSV", () => {
    render(<App />);
    nav("Analytics");
    fireEvent.click(
      screen.getByRole("button", { name: "Generate Water Supply Report" }),
    );
    const reports = readShared<SavedReport[]>("reports", []);
    expect(reports).toHaveLength(1);
    expect(reports[0].rows.length).toBeGreaterThan(1);
    fireEvent.click(screen.getByRole("button", { name: "Download CSV" }));
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(audit()[0].action).toBe("Export");
  });

  it("operator exports are saved in the administrator report registry", () => {
    window.location.hash = "operator";
    render(<App />);
    nav("Reports");
    fireEvent.click(screen.getAllByRole("button", { name: "Download CSV" })[0]);
    expect(readShared<SavedReport[]>("reports", [])[0].generatedBy).toBe(
      "Operator",
    );
    role("Administrator");
    nav("Reports");
    expect(screen.getAllByText("Network performance").length).toBeGreaterThan(0);
    expect(
      audit().some((e) => e.actor === "Operator" && e.action === "Export"),
    ).toBe(true);
  });

  it("administrator work-order edits are reflected back in the operator workspace", () => {
    render(<App />);
    nav("Work Orders");
    fireEvent.change(screen.getByLabelText("Status WO-001"), {
      target: { value: "Completed" },
    });
    role("Operator");
    nav("Work Orders");
    expect(
      screen
        .getAllByRole("button", { name: "Completed", exact: true })
        .some((button) => (button as HTMLButtonElement).disabled),
    ).toBe(true);
    expect(
      readShared<WorkOrder[]>("orders", []).find((o) => o.id === "WO-001")
        ?.status,
    ).toBe("Completed");
  });

  it("renders every administrator module and preserves map asset selection", () => {
    render(<App />);
    for (const page of [
      "Map",
      "Assets",
      "Alerts",
      "Analytics",
      "Reports",
      "Users",
      "IoT Nodes",
      "System Settings",
      "Audit Logs",
      "Work Orders",
      "Dashboard",
    ]) {
      nav(page);
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    }
    nav("Assets");
    fireEvent.click(
      screen.getByRole("button", { name: /Reservoir A demo-reservoir-a/ }),
    );
    expect(screen.getByTestId("existing-3d-map").textContent).toContain(
      "demo-reservoir-a",
    );
  });
});

it("admin reports use operator-style cards and save administrator downloads", () => {
  render(<App />);
  nav("Reports");
  expect(screen.getByRole("heading", { name: "Admin Reports" })).toBeTruthy();
  expect(
    screen.queryByRole("heading", { name: "Water Supply Trend" }),
  ).toBeNull();
  for (const name of ["Network performance", "Water quality", "Maintenance"]) {
    fireEvent.click(
      screen.getByRole("button", { name: `Download admin ${name} CSV` }),
    );
  }
  const reports = readShared<SavedReport[]>("reports", []);
  expect(reports).toHaveLength(3);
  expect(
    reports.every(
      (report) =>
        report.generatedBy === "Administrator" && report.rows.length > 1,
    ),
  ).toBe(true);
  expect(reports.map((report) => report.type)).toEqual([
    "Maintenance",
    "Water Quality",
    "Asset Performance",
  ]);
  expect(URL.createObjectURL).toHaveBeenCalledTimes(3);
});

describe("administrator notifications for utility operators", () => {
  it("notifies operator about admin edits, opens the related screen, and preserves read state", () => {
    const app = render(<App />);
    nav("Work Orders");
    fireEvent.change(screen.getByLabelText("Status WO-001"), {
      target: { value: "Completed" },
    });
    role("Operator");
    fireEvent.click(
      screen.getByRole("button", { name: "Operator notifications, 1 unread" }),
    );
    const feed = screen.getByRole("region", {
      name: "Administrator notifications",
    });
    fireEvent.click(
      within(feed).getByRole("button", { name: /Work Orders.*Update/ }),
    );
    expect(
      screen.getByRole("heading", {
        name: "Work Order & Maintenance Management",
      }),
    ).toBeTruthy();
    expect(audit()[0].operatorRead).toBe(true);
    expect(
      screen.getByRole("button", { name: "Operator notifications, 0 unread" }),
    ).toBeTruthy();
    app.unmount();
    render(<App />);
    expect(
      screen.getByRole("button", { name: "Operator notifications, 0 unread" }),
    ).toBeTruthy();
    expect(audit()).toHaveLength(1);
  });

  it("receives live external-tab admin events and keeps each recipient's read state independent", () => {
    window.location.hash = "operator";
    render(<App />);
    const external: AuditEvent = {
      id: "external-admin",
      actor: "Administrator",
      at: new Date().toISOString(),
      module: "IoT Nodes",
      action: "Update",
      description: "Reservoir sensor activated",
      read: true,
    };
    act(() => {
      localStorage.setItem(
        STORAGE_PREFIX + "events",
        JSON.stringify([external]),
      );
      window.dispatchEvent(
        new StorageEvent("storage", { key: STORAGE_PREFIX + "events" }),
      );
    });
    expect(screen.getByRole("status").textContent).toContain(
      "Administrator update: Reservoir sensor activated",
    );
    act(() => recordEvent("Operator", "Operations", "Command", "Pump started"));
    role("Administrator");
    fireEvent.click(
      screen.getByRole("button", { name: "Admin notifications, 1 unread" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Mark all read" }));
    expect(
      audit().find((e) => e.id === external.id)?.operatorRead,
    ).toBeUndefined();
    role("Operator");
    fireEvent.click(
      screen.getByRole("button", { name: "Operator notifications, 1 unread" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Mark all read" }));
    expect(audit().find((e) => e.id === external.id)?.operatorRead).toBe(true);
    expect(audit()).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "Operator notifications, 0 unread" }),
    ).toBeTruthy();
  });

  it("still exposes the administrator's suspension notification when operator access is blocked", () => {
    render(<App />);
    nav("Users");
    const row = screen.getByText("Juan Dela Cruz").closest("tr")!;
    fireEvent.click(within(row).getByRole("button", { name: "Suspend" }));
    role("Operator");
    fireEvent.click(
      screen.getByRole("button", { name: "Operator notifications, 1 unread" }),
    );
    expect(
      screen.getByRole("region", { name: "Administrator notifications" })
        .textContent,
    ).toContain("Suspended");
  });
});

describe("shared storage transport", () => {
  const defaults = [{ id: "a", title: "Initial", status: "Open" }];
  function Client({ name }: { name: string }) {
    const [items, setItems] = useSharedState(
      "transport",
      defaults,
      "Operator",
      "Alerts",
    );
    return (
      <div>
        <output data-testid={name}>{JSON.stringify(items)}</output>
        <button
          onClick={() =>
            setItems((previous) => [
              ...previous,
              { id: name, title: name, status: "Open" },
            ])
          }
        >
          {name}
        </button>
      </div>
    );
  }
  it("synchronizes mounted clients, consumes external-tab events, and does not echo duplicate audits", () => {
    render(
      <StrictMode>
        <Client name="one" />
        <Client name="two" />
      </StrictMode>,
    );
    fireEvent.click(screen.getByRole("button", { name: "one" }));
    expect(screen.getByTestId("two").textContent).toContain('"id":"one"');
    expect(audit()).toHaveLength(1);
    const externallyUpdated = [
      ...readShared("transport", defaults),
      { id: "external", title: "External tab", status: "Open" },
    ];
    act(() => {
      localStorage.setItem(
        STORAGE_PREFIX + "transport",
        JSON.stringify(externallyUpdated),
      );
      window.dispatchEvent(
        new StorageEvent("storage", { key: STORAGE_PREFIX + "transport" }),
      );
    });
    expect(screen.getByTestId("one").textContent).toContain("External tab");
    expect(audit()).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "two" }));
    expect(readShared("transport", defaults)).toHaveLength(4);
    expect(audit()).toHaveLength(2);
  });
  it("recovers from invalid storage JSON", () => {
    localStorage.setItem(STORAGE_PREFIX + "transport", "not json");
    expect(readShared("transport", defaults)).toEqual(defaults);
  });
});
