import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { OperatorMap } from "../src/components/OperatorMap";

vi.mock("../src/components/HydromeshMap", () => ({
  HydromeshMap: ({ onSelectAsset }: { onSelectAsset: (id: string) => void }) => <button onClick={() => onSelectAsset("demo-reservoir-a")}>Select reservoir on map</button>,
}));
vi.mock("../src/services/barangayData", () => ({
  loadBarangayBoundaries: async () => ({ boundaries: [] }),
  createMonitoringNodes: () => [],
}));
afterEach(cleanup);

it("keeps the layer controls separate from the selected asset card", async () => {
  const onSelect = vi.fn();
  render(<OperatorMap selectedAssetId="demo-reservoir-a" onSelectAsset={onSelect}/>);
  expect(await screen.findByRole("button", { name: "Close asset details" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Toggle map layers" }));
  expect(screen.queryByRole("button", { name: "Close asset details" })).toBeNull();
  const layer = screen.getByRole("checkbox", { name: "Reservoirs" }) as HTMLInputElement;
  fireEvent.click(layer); expect(layer.checked).toBe(false);
  expect(onSelect).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Close map layers" }));
  expect(screen.getByRole("button", { name: "Close asset details" })).toBeTruthy();
});

it("dismisses details even when the rules form retains the selected asset", async () => {
  render(<OperatorMap selectedAssetId="demo-reservoir-a" onSelectAsset={() => {}}/>);
  fireEvent.click(await screen.findByRole("button", { name: "Close asset details" }));
  expect(screen.queryByRole("button", { name: "Close asset details" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Toggle map layers" }));
  fireEvent.click(screen.getByRole("button", { name: "Select reservoir on map" }));
  expect(screen.queryByRole("group", { name: "Map layer controls" })).toBeNull();
  expect(screen.getByRole("button", { name: "Close asset details" })).toBeTruthy();
});
