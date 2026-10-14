import test from 'node:test';
import assert from 'node:assert/strict';
import { BARANGAY_BY_CODE, NAGA_BARANGAYS, NAGA_CITY_CODE } from '../src/data/nagaBarangays.ts';
import { createMonitoringNodes, createSimulatedTelemetry, loadBarangayBoundaries, pointBelongsToBoundary, UNMAPPED_MONITORING_NODES } from '../src/services/barangayData.ts';

// These tiny squares are algorithm fixtures only. They are not Naga City boundary data.
function syntheticCollection() {
  return {
    type: 'FeatureCollection',
    features: NAGA_BARANGAYS.map((barangay, index) => {
      const x = (index % 7) * 0.01;
      const y = Math.floor(index / 7) * 0.01;
      return {
        type: 'Feature',
        properties: { psgc_10d: barangay.code, brgy_name: barangay.name, city_name: 'Naga City', prov_name: 'Camarines Sur' },
        geometry: { type: 'Polygon', coordinates: [[[x,y],[x+0.008,y],[x+0.008,y+0.008],[x,y+0.008],[x,y]]] },
      };
    }),
  };
}

test('PSA barangay registry contains 27 unique Naga City PSGC codes', () => {
  assert.equal(NAGA_CITY_CODE, '0501724000');
  assert.equal(NAGA_BARANGAYS.length, 27);
  assert.equal(new Set(NAGA_BARANGAYS.map(({ code }) => code)).size, 27);
  assert.equal(BARANGAY_BY_CODE.size, 27);
  assert.ok(NAGA_BARANGAYS.every(({ code }) => code.startsWith('0501724')));
});

test('unmapped nodes remain coordinate-free and are excluded from coverage and telemetry', () => {
  assert.equal(UNMAPPED_MONITORING_NODES.length, 27);
  assert.ok(UNMAPPED_MONITORING_NODES.every((node) => node.position === null && node.status === 'unmapped'));
  const nodes = createMonitoringNodes([]);
  assert.equal(nodes.filter((node) => node.position).length, 0);
  assert.equal(createSimulatedTelemetry(nodes).length, 0);
});

test('synthetic validated polygons produce unique interior points only (algorithm fixture)', async () => {
  const originalFetch = globalThis.fetch;
  const collection = syntheticCollection();
  globalThis.fetch = async (url) => String(url).includes('attribution')
    ? new Response(JSON.stringify({ source: 'Synthetic unit-test fixture', license: 'test-only', attribution: 'none', crs: 'EPSG:4326', rightsVerified: true, rightsReference: 'test fixture', rightsBasis: 'explicit-open-license' }), { status: 200 })
    : new Response(JSON.stringify(collection), { status: 200 });
  try {
    const result = await loadBarangayBoundaries('/synthetic-only.geojson');
    assert.equal(result.boundaries.length, 27);
    const nodes = createMonitoringNodes(result.boundaries);
    assert.equal(nodes.filter((node) => node.position).length, 27);
    assert.equal(new Set(nodes.map((node) => node.barangayCode)).size, 27);
    for (const node of nodes) {
      const polygon = result.boundaries.find((boundary) => boundary.code === node.barangayCode);
      assert.ok(polygon && node.position);
      assert.ok(Number.isFinite(node.position.longitude) && Number.isFinite(node.position.latitude));
      assert.ok(pointBelongsToBoundary([node.position.longitude, node.position.latitude], polygon));
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('invalid feature sets and missing files fail closed', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('', { status: 404 });
  try {
    const result = await loadBarangayBoundaries('/absent.geojson');
    assert.equal(result.boundaries.length, 0);
    assert.match(result.message, /not been installed/);
  } finally { globalThis.fetch = originalFetch; }

  globalThis.fetch = async (url) => String(url).includes('attribution')
    ? new Response(JSON.stringify({ source: 'GeoRiskPH', license: 'restricted', attribution: 'PSA', crs: 'EPSG:4326', rightsVerified: true, rightsReference: 'service metadata', rightsBasis: 'explicit-open-license' }), { status: 200 })
    : new Response(JSON.stringify(syntheticCollection()), { status: 200 });
  try {
    const result = await loadBarangayBoundaries('/restricted.geojson');
    assert.equal(result.boundaries.length, 0);
    assert.match(result.message, /explicit written permission/);
  } finally { globalThis.fetch = originalFetch; }
});

test('boundary request failures leave the application with an empty, non-crashing result', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('offline'); };
  try {
    const result = await loadBarangayBoundaries('/network-error.geojson');
    assert.deepEqual(result.boundaries, []);
    assert.match(result.message, /could not be reached/);
  } finally { globalThis.fetch = originalFetch; }
});

test('committed OSM subset has licensed metadata and only PSA-matched polygons with interior nodes', async () => {
  const fs = await import('node:fs');
  const collection = JSON.parse(fs.readFileSync(new URL('../public/data/naga-city-barangays.geojson', import.meta.url), 'utf8'));
  const metadata = JSON.parse(fs.readFileSync(new URL('../public/data/naga-city-boundaries-attribution.json', import.meta.url), 'utf8'));
  assert.equal(metadata.license, 'Open Database License 1.0 (ODbL)');
  assert.match(metadata.attribution, /OpenStreetMap contributors/);
  assert.equal(collection.features.length, 3);
  assert.equal(new Set(collection.features.map((feature) => feature.properties.psgc_10d)).size, 3);
  assert.deepEqual(collection.features.map((feature) => feature.properties.psgc_10d).sort(), ['0501724001', '0501724013', '0501724029']);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => String(url).includes('attribution')
    ? new Response(JSON.stringify(metadata), { status: 200 })
    : new Response(JSON.stringify(collection), { status: 200 });
  try {
    const result = await loadBarangayBoundaries('/data/naga-city-barangays.geojson');
    assert.equal(result.boundaries.length, 3);
    assert.match(result.message, /3 \/ 27/);
    const nodes = createMonitoringNodes(result.boundaries);
    const mapped = nodes.filter((node) => node.position);
    assert.equal(mapped.length, 3);
    assert.deepEqual(mapped.map((node) => node.barangayCode).sort(), ['0501724001', '0501724013', '0501724029']);
    for (const node of mapped) {
      const polygon = result.boundaries.find((boundary) => boundary.code === node.barangayCode);
      assert.ok(polygon && node.position);
      assert.ok(Number.isFinite(node.position.longitude) && Number.isFinite(node.position.latitude));
      assert.ok(pointBelongsToBoundary([node.position.longitude, node.position.latitude], polygon));
    }
    assert.equal(nodes.filter((node) => node.status === 'unmapped').length, 24);
    assert.equal(createSimulatedTelemetry(nodes).length, 3);
  } finally { globalThis.fetch = originalFetch; }
});
