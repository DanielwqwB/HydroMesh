# HydroMesh GIS â€” Phase 1 command-center prototype

HydroMesh GIS is a React, TypeScript, and Vite prototype with CesiumJS and optional Mapbox GL JS map views centered on Naga City, Camarines Sur. It uses a light water-network command dashboard and simulated infrastructure data.

## Run locally

Requirements: Node.js 20.19+ and npm.

```sh
npm install
npm run dev
```

Cesium works without a key. To enable the Mapbox comparison map, copy `.env.example` to `.env.local`, add your Mapbox public access token, and restart Vite. Vite exposes browser variables to visitors, so use a public token restricted to your local and deployed hostnames. With no token configured, the Mapbox option shows setup instructions and Cesium remains available.

Create a production bundle with:

```sh
npm run build
```

No database, API key, Cesium ion account, device, backend service, or authentication setup is needed. The map requests public OpenStreetMap tiles when the browser has internet access. Without network access, the interactive globe and procedural scene remain available over the ellipsoid.

## Current prototype

- Light command-center dashboard with supply, simulated-node, pressure, and quality summary cards, plus static illustrative status widgets.
- Isometric-style oblique camera, smooth camera focus, mouse orbit/pan/tilt, and on-screen zoom, rotate, tilt, and reset controls.
- Procedurally assembled low-rise city blocks, vegetation, illustrative topographic contours, green spaces, waterway, and road details.
- Clickable reservoirs, elevated storage, pump and treatment facilities, control valves, simulated sensor nodes, and pipeline segments.
- Glowing pipeline routes with animated directional flow particles, junction lights, selected-route highlighting, and normal/warning/critical demo states.
- Search, asset register, map selection, and the existing asset inspector remain connected to the same simulated asset definitions.
- Optional Mapbox view with Standard 3D, Satellite, and Night 3D styles; Mapbox Terrain DEM; and a Three.js custom layer with selectable reservoir, elevated tank, pump station, treatment plant, control valve, and sensor meshes anchored at the demo coordinates. The Cesium view remains available through the provider switch.
- Mapbox's native 3D objects are explicitly enabled in Standard with daytime lighting. A separate `Illustrative blocks` mode uses clearly labeled synthetic building footprints and heights; those values are not surveyed or geographically accurate.
- Glowing network routes use simulated status colors, animated flow particles, selectable route highlighting, junction indicators, and a pulsing critical-route anomaly marker.

## Demo data and limitations

All asset names, coordinates, conditions, routes, waterway geometry, buildings, contours, and sample measurements are fictional demonstration data. They are not verified Naga City utility assets or actual water-quality readings. Sensor icons and data are simulated only; there is no IoT connectivity, telemetry service, device control, anomaly engine, backend, authentication, or persistence in this phase. The displayed pilot geography and topography are illustrative, not official GIS boundaries or terrain elevations.

Cesium imagery is © OpenStreetMap contributors under the ODbL, with attribution displayed on the map. Cesium runs on its ellipsoid terrain provider; the apparent relief comes from the clearly stylized overlay rather than a real terrain dataset. Mapbox uses Mapbox Standard styles, Mapbox Terrain DEM, and Mapbox-hosted data and needs an access token. Mapbox building coverage for Naga City still needs confirmation with a configured token; native mode only displays Mapbox-supplied geometry, while illustrative mode is synthetic.

The future backend destination is `C:\Users\danie\OneDrive\Desktop\HydroMesh Backend`; no backend files are created by this phase.
