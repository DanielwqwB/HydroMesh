import fs from 'node:fs';
import path from 'node:path';

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) throw new Error('Usage: node scripts/buildOsmBarangayGeojson.mjs <overpass-response.json> <output.geojson>');
const expected = new Map([
  [21081289, ['0501724001', 'Abella']],
  [21292294, ['0501724013', 'Dinaga']],
  [21405964, ['0501724029', 'Santa Cruz']],
]);
const source = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
if (!Array.isArray(source.elements)) throw new Error('Input is not an Overpass JSON response.');
const eq = (a, b) => a[0] === b[0] && a[1] === b[1];
function stitch(members, relationId, role) {
  const remaining = members.filter(m => m.type === 'way' && m.role === role).map(m =>
    (m.geometry ?? []).map(point => [point.lon, point.lat]));
  if (!remaining.length) return [];
  if (remaining.some(line => line.length < 2)) throw new Error(`Relation ${relationId}: incomplete ${role} member geometry.`);
  const rings = [];
  while (remaining.length) {
    const ring = remaining.shift();
    let guard = 0;
    while (!eq(ring[0], ring.at(-1))) {
      if (++guard > members.length + 1) throw new Error(`Relation ${relationId}: ring assembly did not converge.`);
      const end = ring.at(-1);
      const index = remaining.findIndex(line => eq(end, line[0]) || eq(end, line.at(-1)));
      if (index < 0) throw new Error(`Relation ${relationId}: open ${role} boundary; missing connecting segment.`);
      let line = remaining.splice(index, 1)[0];
      if (eq(end, line.at(-1))) line = line.reverse();
      ring.push(...line.slice(1));
    }
    if (ring.length < 4) throw new Error(`Relation ${relationId}: degenerate ${role} ring.`);
    rings.push(ring);
  }
  return rings;
}
const features = [];
const seen = new Set();
for (const relation of source.elements) {
  const expectedRow = expected.get(relation.id);
  if (!expectedRow) continue;
  const [code, name] = expectedRow;
  if (seen.has(relation.id) || relation.tags?.name !== name || relation.tags?.ref !== code || relation.tags?.boundary !== 'administrative' || relation.tags?.admin_level !== '10') {
    throw new Error(`Relation ${relation.id} no longer matches the verified Naga PSGC registry mapping.`);
  }
  const outer = stitch(relation.members ?? [], relation.id, 'outer');
  const inner = stitch(relation.members ?? [], relation.id, 'inner');
  if (!outer.length || inner.length) throw new Error(`Relation ${relation.id}: empty outer polygon or unsupported inner ring.`);
  const geometry = outer.length === 1
    ? { type: 'Polygon', coordinates: [outer[0]] }
    : { type: 'MultiPolygon', coordinates: outer.map(ring => [ring]) };
  features.push({
    type: 'Feature',
    id: code,
    properties: {
      psgc_10d: code,
      brgy_name: name,
      city_name: 'Naga City',
      prov_name: 'Camarines Sur',
      osm_relation_id: relation.id,
      osm_ref: relation.tags.ref,
      source: 'OpenStreetMap contributors; relation source tag: City of Naga',
    },
    geometry,
  });
  seen.add(relation.id);
}
if (features.length !== expected.size) throw new Error(`Expected ${expected.size} relation geometries; assembled ${features.length}.`);
const collection = { type: 'FeatureCollection', name: 'Naga City OSM administrative boundaries (validated subset)', features };
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(collection)}\n`, 'utf8');
console.log(`Wrote ${features.length} relation polygons to ${outputPath}`);
