# HydroMesh GIS â€” Phase 1 command-center prototype

HydroMesh GIS is a React, TypeScript, and Vite prototype with a Mapbox GL JS map centered on Naga City, Camarines Sur. It includes connected utility-operator and system-administrator workspaces, a light water-network dashboard, and simulated infrastructure data.

## Run locally

Requirements: Node.js 22.12+ (or Node.js 24+) and npm.

```sh
npm install
npm run dev
```

Add your Mapbox public access token as `VITE_MAPBOX_ACCESS_TOKEN` in `.env.local`, then restart Vite. Vite exposes browser variables to visitors, so use a public token restricted to your local and deployed hostnames. Without a token, the map shows setup instructions.

Create a production bundle with:

```sh
npm run build
```

No database, device, backend service, or authentication setup is needed. Mapbox requires an access token and internet access.

## Current prototype

- Light command-center dashboard with supply, simulated-node, pressure, and quality summary cards, plus static illustrative status widgets.
- Isometric-style oblique camera, smooth camera focus, mouse orbit/pan/tilt, and on-screen zoom, rotate, tilt, and reset controls.
- Procedurally assembled low-rise city blocks, vegetation, illustrative topographic contours, green spaces, waterway, and road details.
- Clickable reservoirs, elevated storage, pump and treatment facilities, control valves, simulated sensor nodes, and pipeline segments.
- Glowing pipeline routes with animated directional flow particles, junction lights, selected-route highlighting, and normal/warning/critical demo states.
- Search, asset register, map selection, and the existing asset inspector remain connected to the same simulated asset definitions.
- Mapbox view with Standard 3D, Satellite, and Night 3D styles; Mapbox Terrain DEM; and a Three.js custom layer with selectable reservoir, elevated tank, pump station, treatment plant, control valve, and sensor meshes anchored at the demo coordinates.
- Mapbox's native 3D objects are explicitly enabled in Standard with daytime lighting. A separate `Illustrative blocks` mode uses clearly labeled synthetic building footprints and heights; those values are not surveyed or geographically accurate.
- Glowing network routes use simulated status colors, animated flow particles, selectable route highlighting, junction indicators, and a pulsing critical-route anomaly marker.

## Demo data and limitations

All asset names, coordinates, conditions, routes, waterway geometry, buildings, contours, and sample measurements are fictional demonstration data. They are not verified Naga City utility assets or actual water-quality readings. Sensor icons and data are simulated only; there is no IoT connectivity, telemetry service, device control, anomaly engine, backend or server authentication. Demo edits persist in local browser storage. The displayed pilot geography and topography are illustrative, not official GIS boundaries or terrain elevations.

Mapbox uses Mapbox Standard styles, Mapbox Terrain DEM, and Mapbox-hosted data and needs an access token. Mapbox building coverage for Naga City still needs confirmation with a configured token; native mode only displays Mapbox-supplied geometry, while illustrative mode is synthetic.

The future backend destination is `C:\Users\danie\OneDrive\Desktop\HydroMesh Backend`; no backend files are created by this phase.


## Connected administrator and utility workspaces

The app opens the **System Administrator** workspace by default. Use the profile selector in the top right to switch roles, or open both URLs in separate tabs of the same browser:

- Administrator: `http://localhost:5173/#admin`
- Utility operator: `http://localhost:5173/#operator`

Use the same hostname and port in both tabs. `localhost` and `127.0.0.1` have separate browser storage.

Operator incident creation/updates, work-order assignments and status changes, actuator commands, and report exports create admin notifications and audit records. Notifications now flow in both directions: administrator changes also appear in the utility operator notification bell and trigger a live update message when that workspace is open. Each role has its own persisted unread state; marking messages read in one workspace does not clear the other role's inbox. Notifications can be marked read without deleting the audit history. Administrator changes to incidents, work orders, user permissions, node configuration, and saved rules are shared back to the operator workspace. Edits survive page refreshes using versioned `hydromesh.v2.*` localStorage entries; no backend is required.

Administrator screens include:

- Dashboard, Mapbox GIS, searchable asset registry, shared incidents, and maintenance orders.
- User creation/editing, suspension/reactivation, pending-user approval, search, pagination, and role module permissions. Juan Dela Cruz is the connected demo operator account. The current administrator is protected against suspension and role removal.
- IoT node registration linked to the project's existing assets, configuration, activation/deactivation, maintenance status, and demo calibration.
- Threshold rules with validated limits/ranges, severity, enabled status, notification preferences, and a manual sample-reading simulator. A triggered saved rule creates a shared incident and, when enabled, a maintenance work order.
- Zone-filtered report generation, saved snapshots and CSV download, and searchable/filterable/exportable audit logs.

Email/SMS settings, server health metrics, sensor readings, and actuator commands are illustrative. No external messages are sent, no physical devices are controlled, and the role selector is not real authentication. Synchronization is limited to the same browser profile and origin, not other computers or users. Simultaneous writes from multiple tabs are a demo convenience, not a transactional database or tamper-proof audit service.

### Verification

`npm test` runs the existing geography suite and the connected-workspace interaction tests. The interaction tests mock the WebGL map while verifying shared asset IDs, role workflows, notifications, persistence, permission restrictions, node registration, threshold simulation, and report exports. `npm run build` checks TypeScript and generates the Vite production bundle.
