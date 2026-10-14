# HydroMesh GIS — geographic source verification (Phase 2.3)

## Decision

No GeoRiskPH polygon query or extraction was performed. The ArcGIS layer metadata identifies its usage restriction as **“Restricted to NDRRMC IM-TWG Member agencies.”** Public query capability does not grant this project permission to download, store, redistribute, or display the data. No evidence of qualifying agency status or written authorization was provided. Therefore no GeoRiskPH boundary file, runtime layer, or derivative node coordinates are added.

## Source review

- Candidate: [GeoRiskPH PSA Barangay MapServer layer 4](https://portal.georisk.gov.ph/arcgis/rest/services/PSA/Barangay/MapServer/4).
- Dataset vintage: indicative PSA-derived boundaries as of June 2016, described by the service metadata as prepared in relation to the 2015 population census. These are historical indicative boundaries, not certified current legal boundaries.
- Geometry: Polygon layer; source spatial reference WKID 4326 (WGS 84); service extent is also represented in Web Mercator.
- Attributes include barangay, city, province, and PSGC identifiers. ArcGIS metadata advertises JSON/GeoJSON query formats and pagination, but this is technical capability only and was not used to extract features.
- Required attribution: acknowledge PSA, according to the service metadata.
- Permission outcome: restricted access/use language is explicit. Neither an open redistribution license nor written project-specific permission is established. Do not use for local storage, redistribution, derivative coordinates, or live display until the data steward authorizes the intended uses.
- Alternative reviewed: [Naga City maps page](https://www2.naga.gov.ph/maps/) references a city base map and barangay map PDFs. No reuse license was identified, and the linked map is not machine-readable polygon data; it does not establish permission or provide validated GIS geometry.
- Registry reference: [PSA Naga City PSGC listing](https://psa.gov.ph/classification/psgc/barangays/0501724000), 27 barangays as of 31 July 2025. PSA registry names/codes are not a license for GeoRiskPH geometries.

## Validation outcome

- Registry: 27 official names/codes, unique, Naga City code `0501724000` (existing application registry).
- Authorized polygons acquired: 0.
- Geographic polygon validation: not performed because no geometry was obtained under established permission.
- Geographically verified nodes: 0 / 27.
- Unmapped nodes: 27; each remains coordinate-free and is not considered offline.
- Geographic spread / neighboring-municipality check: not applicable without permitted polygons.

To proceed, obtain written permission from the GeoRiskPH/PSA data steward that expressly covers query/extraction, local storage, redistribution, derivative point placement, and public runtime visualization, or supply an alternative polygon source with a clear license covering those uses. For GeoRiskPH, confirm whether the project/operator qualifies under the stated NDRRMC IM-TWG restriction.

## Alternative source review: OCHA/HDX COD-AB v03

Reviewed 14 October 2026. The `NagaRescue/naga-shared` README describes `naga-barangays.json` as 27 polygons sourced from OCHA/HDX Common Operational Dataset, Philippines layer `phl_admin4` v03, valid 2025-02-12, filtered by `adm3_pcode = PH0501724`, stored WGS84 and rounded to six decimal places. It says a PSA centroid/bounding-box CSV was cross-checked, while the polygons themselves are attributed to the OCHA/HDX source. This is a secondary repository's provenance statement, not an independent verification of the source archive or geometry. Its GitHub listing exposes no separate data license for the bundled polygon file; the code/package license cannot be taken as a license for that data.

The original publisher's HDX record is [COD-AB Philippines](https://data.humdata.org/dataset/cod-ab-phl). HDX's license guidance explains that a specific dataset license must be read from that dataset's metadata or included terms. The HDX record returned HTTP 403 in this review, and its API metadata endpoint was not available through the research interface. Secondary material is inconsistent: some citations describe the COD-AB archive as CC BY 4.0, while a catalog describes this Philippines COD-AB as CC BY-IGO. HDX's general license page confirms both are possible license families, but does not identify which license applies to this exact version. Therefore permission to extract, store, modify, and redistribute this particular v03 boundary source is **not established to the requested standard**.

At that stage, no polygon archive, GitHub polygon copy, or derivatives had been imported. No Naga filter or geometry validation was run for that source. See the later OSM source assessment below for current geographic status.

Proceed when the exact HDX record's `license_id` / `license_other` metadata and applicable terms are available for the relevant version (or the publisher confirms the terms). If confirmed CC BY-IGO 3.0, that license permits copying, redistribution and adaptations subject to attribution, link to license, modification notice, keeping license/notices with redistributed data, and not imposing downstream restrictions on the licensed work. The project should preserve those notices in dataset metadata and app attribution. Do not treat the separate NagaRescue GitHub code/package license as data rights.

### References

- [NagaRescue/naga-shared source and processing notes](https://github.com/NagaRescue/naga-shared)
- [HDX COD-AB Philippines dataset record](https://data.humdata.org/dataset/cod-ab-phl)
- [HDX data license guidance](https://centre.humdata.org/ufaqs/data-licenses/)
- [CC BY 3.0 IGO legal code](https://creativecommons.org/licenses/by/3.0/igo/legalcode.en)
- [Example publication describing COD-AB as CC BY 4.0](https://journals.plos.org/globalpublichealth/article/file?id=10.1371%2Fjournal.pgph.0004008&type=printable)
- [Catalog describing the Philippines ADM4 COD-AB as CC BY-IGO](https://www.icon-map.com/products/catalog/explore/rest-of-world/administrative/philippines-subnational-administrative-boundaries-adm4/)

## Current alternative: OpenStreetMap

Reviewed and queried 14 October 2026. Naga City was identified as OSM relation [3084673](https://www.openstreetmap.org/relation/3084673), tagged `admin_level=6`, `name=Naga City`, `is_in:state=Camarines Sur`, and linked to Wikidata Q2207. A bounded Overpass inventory of administrative features in this city area found three named admin-level-10 barangay relations carrying exact 10-digit PSA PSGC `ref` values and `source=City of Naga`:

| Barangay | PSGC `ref` | OSM relation |
|---|---|---:|
| Abella | `0501724001` | 21081289 |
| Dinaga | `0501724013` | 21292294 |
| Santa Cruz | `0501724029` | 21405964 |

Each relation had a closed outer polygon assembled from its OSM outer member ways. No inner rings were reported for these relations. Coordinates are WGS84. Other returned admin-level way fragments were unnamed and were not used as barangays; admin-level-11 Zone polygons were not treated as barangays. Thus only exact relation name + PSGC `ref` matches were selected. Geometry was converted by stitching shared way endpoints into polygon rings without simplification. The app's geometry checks validate ring closure, coordinate ranges and ring topology, then compute and point-in-polygon-check one interior point per accepted polygon.

### ODbL use obligations

OpenStreetMap data is available under the Open Database License 1.0. The license permits copying, extracting, adapting and redistributing the database, subject to attribution and share-alike requirements. HydroMesh provides the OSM-derived polygon GeoJSON as a separate data artifact under ODbL, includes a map attribution link, identifies the source relation IDs/snapshot and records the conversion and runtime point-derivation steps. Any redistributed OSM-derived database or adaptation must remain available under ODbL with notices intact; a public produced work must attribute OSM and, on request, make available the OSM data and derivative database or the means to create it. The ODbL obligations apply to the OSM-derived data and its derivative database, not automatically to independent app code or unrelated illustrative asset data. See the [OSM Foundation legal FAQ](https://osmfoundation.org/wiki/Licence/Licence_and_Legal_FAQ), [OSM copyright and attribution](https://www.openstreetmap.org/copyright), and [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/).

### Validated coverage

- OSM polygons added: 3 / 27.
- Interior simulated node positions: 3 / 27, all finite WGS84 coordinates and confirmed inside their assigned polygons.
- Remaining unmapped: Bagumbayan Norte, Bagumbayan Sur, Balatas, Calauag, Cararayan, Carolina, Concepcion Grande, Concepcion Pequeña, Dayangdang, Del Rosario, Igualdad Interior, Lerma, Liboton, Mabolo, Pacol, Panicuason, Peñafrancia, Sabang, San Felipe, San Francisco, San Isidro, Tabuco, Tinago, Triangulo.
- No OSM boundaries or node positions are inferred for other barangays. Existing pipeline routes remain illustrative and are not connected to these monitoring nodes.
- Overpass snapshot timestamp: `2026-10-14T06:07:26Z`.

Data files: `public/data/naga-city-barangays.geojson` and `public/data/naga-city-boundaries-attribution.json`. The reproducible way-member-to-ring converter is `scripts/buildOsmBarangayGeojson.mjs`; it accepts a saved Overpass response as input and does not make network requests itself.

## Phase 2.4: regional extract assessment (14 October 2026)

### Source availability and licensing

- **Geofabrik Philippines:** the official Philippines page offers a whole-country PBF (578 MB on the reviewed page) and GIS exports. It is OpenStreetMap data, so ODbL attribution and share-alike obligations apply. The page described the PBF data as current through `2026-09-16T20:21:21Z`; the file page was updated later, so the data timestamp—not the page/file modification time—is the relevant vintage. This is much broader and older than the already available city-scoped relation inventory, so it was not downloaded.
- **BBBike:** its extract service can generate scoped extracts in formats including PBF and GeoJSON; its help page says extracts use the daily updated planet and are free for general end-user use subject to fair use and no warranty. It also says ordinary extracts omit version/author/timestamp metadata. BBBike is an extract provider, not a separate license for the underlying OSM data: ODbL obligations continue to apply. No custom extract was generated because a fresh Naga-area relation inventory from the same OSM database had already been queried on 14 October and produced no additional qualifying barangay relations. Avoiding an unnecessary duplicate request also respects public-service load.
- The existing OSM-derived subset and app retain contributor attribution, a link to OSM copyright/licensing, snapshot provenance, and ODbL share-alike notice. Any future extract or merged derivative must preserve equivalent provenance/attribution and make the adapted OSM database available under ODbL when redistributed. This does not change licensing of independent application code.

References: [Geofabrik Philippines extract page](https://download.geofabrik.de/asia/philippines.html), [BBBike extract formats and service](https://extract.bbbike.org/extract-dialog/en/about.html), [BBBike extract help and terms](https://extract.bbbike.org/extract.html), [OSMF ODbL legal FAQ](https://osmfoundation.org/wiki/Licence/Licence_and_Legal_FAQ), [OSM copyright/attribution](https://www.openstreetmap.org/copyright).

### Extraction and validation outcome

The previous city-bounded OSM relation inventory was limited to Naga City, Camarines Sur (OSM city relation `3084673`) and returned three suitable `boundary=administrative`, `admin_level=10` relations with names and `ref` values that match the PSA registry. These remain the only accepted polygons:

| Accepted barangay | PSA PSGC / OSM `ref` | OSM relation | Result |
|---|---|---:|---|
| Abella | `0501724001` | 21081289 | Valid closed polygon; interior point validated |
| Dinaga | `0501724013` | 21292294 | Valid closed polygon; interior point validated |
| Santa Cruz | `0501724029` | 21405964 | Valid closed polygon; interior point validated |

The returned unnamed administrative way fragments and `admin_level=11` Zone relations were not treated as barangays. They lack a verified PSA identity at the required barangay administrative level and were rejected for this purpose. No further named admin-level-10 relation with a matching PSA code was present in the city-bounded inventory. Consequently no new polygon was accepted and no node was added in Phase 2.4. This is an OSM coverage limitation, not a reason to infer geography from unverified fragments or download a much larger, older country extract.

The accepted set remains **3 / 27**. The unmapped barangays remain Bagumbayan Norte, Bagumbayan Sur, Balatas, Calauag, Cararayan, Carolina, Concepcion Grande, Concepcion Pequeña, Dayangdang, Del Rosario, Igualdad Interior, Lerma, Liboton, Mabolo, Pacol, Panicuason, Peñafrancia, Sabang, San Felipe, San Francisco, San Isidro, Tabuco, Tinago, and Triangulo. Existing polygons were not modified. Node positions continue to be calculated from the accepted polygons at runtime and checked for containment. No monitoring nodes are connected with asserted physical pipeline routes.

No local Geofabrik/BBBike extract was retained, so there is no extract file or independent extract timestamp to report. The currently integrated geometry's source and snapshot remain the Overpass response timestamp `2026-10-14T06:07:26Z`, as recorded in the dataset metadata. A later, appropriately scoped extract can be considered if an inventory identifies additional candidate relations; each candidate must still pass identity, geometry, city location, duplicate/overlap, and interior-point checks before integration.
