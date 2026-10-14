import {
  BoxGraphics,
  CallbackPositionProperty,
  Cartesian2,
  Cartesian3,
  Color,
  ColorMaterialProperty,
  ConstantProperty,
  Credit,
  CylinderGraphics,
  DistanceDisplayCondition,
  EllipsoidGraphics,
  EllipsoidTerrainProvider,
  Entity,
  EntityCollection,
  HeadingPitchRoll,
  HorizontalOrigin,
  LabelGraphics,
  LabelStyle,
  OpenStreetMapImageryProvider,
  PointGraphics,
  PolylineGlowMaterialProperty,
  PolylineGraphics,
  PropertyBag,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Transforms,
  VerticalOrigin,
  Viewer,
} from "cesium";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import {
  assetStatusLabels,
  assetTypeLabels,
  demoAssets,
  type AssetStatus,
  type DemoAsset,
} from "../data/assets";

export interface HydromeshMapHandle {
  focusAsset: (assetId: string) => void;
  overview: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  rotate: (direction: "left" | "right") => void;
  tilt: (direction: "up" | "down") => void;
}

interface HydromeshMapProps {
  selectedAssetId: string | null;
  onSelectAsset: (assetId: string) => void;
  layerVisibility: { boundaries: boolean; nodes: boolean; reservoirs: boolean; pumps: boolean; treatment: boolean; pipelines: boolean; buildings: boolean };
}

const CITY_CENTER = { longitude: 123.1948, latitude: 13.6218 };
const OSM_CREDIT = new Credit("© OpenStreetMap contributors", true);
const DISPLAY_COLOR = {
  normal: "#25d1ef",
  warning: "#ffb34f",
  critical: "#ff5d6d",
};

type GraphicType = "box" | "cylinder" | "ellipsoid" | "point" | "polyline";
type Graphic = BoxGraphics | CylinderGraphics | EllipsoidGraphics | PointGraphics | PolylineGraphics;
interface AssetVisual {
  setSelected: (selected: boolean) => void;
}

const color = (hex: string) => Color.fromCssColorString(hex);

function localPosition(
  longitude: number,
  latitude: number,
  height: number,
  east = 0,
  north = 0,
) {
  const longitudeOffset = east / (111320 * Math.cos((latitude * Math.PI) / 180));
  const latitudeOffset = north / 111320;
  return Cartesian3.fromDegrees(
    longitude + longitudeOffset,
    latitude + latitudeOffset,
    height,
  );
}

function orientation(position: Cartesian3, heading = 0) {
  return Transforms.headingPitchRollQuaternion(
    position,
    new HeadingPitchRoll(heading, 0, 0),
  );
}

function statusColor(status: AssetStatus) {
  return color(DISPLAY_COLOR[status]);
}

function addSelectablePart(
  entities: EntityCollection,
  asset: DemoAsset,
  partName: string,
  graphicType: GraphicType,
  graphic: Graphic,
  position?: Cartesian3 | CallbackPositionProperty,
  textLabel?: string,
): AssetVisual {
  const graphicOptions: Entity.ConstructorOptions = {};
  if (graphicType === "box") graphicOptions.box = graphic as BoxGraphics;
  if (graphicType === "cylinder") graphicOptions.cylinder = graphic as CylinderGraphics;
  if (graphicType === "ellipsoid") graphicOptions.ellipsoid = graphic as EllipsoidGraphics;
  if (graphicType === "point") graphicOptions.point = graphic as PointGraphics;
  if (graphicType === "polyline") graphicOptions.polyline = graphic as PolylineGraphics;

  const label = textLabel
    ? new LabelGraphics({
        text: textLabel.toUpperCase(),
        font: "700 10px Inter, Segoe UI, sans-serif",
        style: LabelStyle.FILL_AND_OUTLINE,
        fillColor: Color.WHITE,
        outlineColor: color("#071924"),
        outlineWidth: 4,
        showBackground: true,
        backgroundColor: color("#102b39").withAlpha(0.91),
        backgroundPadding: new Cartesian2(9, 6),
        pixelOffset: new Cartesian2(0, -34),
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.BOTTOM,
        disableDepthTestDistance: 35000,
        distanceDisplayCondition: new DistanceDisplayCondition(0, 2800),
      })
    : undefined;

  entities.add({
    id: `${asset.id}-${partName}`,
    name: asset.name,
    ...(position ? { position } : {}),
    ...(position && !(position instanceof CallbackPositionProperty)
      ? { orientation: orientation(position) }
      : {}),
        properties: new PropertyBag({ assetId: asset.id, assetType: asset.type }),
    ...graphicOptions,
    ...(label ? { label } : {}),
  });

  return {
    setSelected(selected) {
      const baseColor = asset.type === "pipeline" ? statusColor(asset.status) : color(asset.color);
      const materialColor = selected ? color("#b7f7ff") : baseColor;
      if (graphicType === "polyline") {
        const line = graphic as PolylineGraphics;
        line.material = new PolylineGlowMaterialProperty({
          color: materialColor,
          glowPower: selected ? 0.58 : asset.type === "pipeline" ? 0.34 : 0.12,
          taperPower: 0.46,
        });
        line.width = new ConstantProperty(selected ? 12 : asset.type === "pipeline" ? 8 : 2.5);
      } else if (graphicType === "point") {
        const point = graphic as PointGraphics;
        point.color = new ConstantProperty(materialColor);
        point.outlineColor = new ConstantProperty(selected ? Color.WHITE : color("#d6fbff"));
        point.pixelSize = new ConstantProperty(selected ? 15 : 8);
      } else {
        const shape = graphic as BoxGraphics | CylinderGraphics | EllipsoidGraphics;
        shape.material = new ColorMaterialProperty(
          selected ? materialColor.withAlpha(0.98) : baseColor.withAlpha(0.92),
        );
      }
      if (label) {
        label.scale = new ConstantProperty(selected ? 1.12 : 1);
        label.fillColor = new ConstantProperty(selected ? color("#aaf7ff") : Color.WHITE);
      }
    },
  };
}

function addPoint(
  entities: EntityCollection,
  asset: DemoAsset,
  part: string,
  position: Cartesian3 | CallbackPositionProperty,
  baseColor: Color,
  pixelSize = 8,
) {
  const graphic = new PointGraphics({
    pixelSize,
    color: new ConstantProperty(baseColor),
    outlineColor: new ConstantProperty(color("#eaffff")),
    outlineWidth: 1.5,
    disableDepthTestDistance: 22000,
    scaleByDistance: undefined,
  });
  return addSelectablePart(entities, asset, part, "point", graphic, position);
}

function addPolyline(
  entities: EntityCollection,
  asset: DemoAsset,
  part: string,
  positions: Cartesian3[],
  baseColor: Color,
  width: number,
  glowPower: number,
  selectable = false,
) {
  const graphic = new PolylineGraphics({
    positions,
    width,
    material: new PolylineGlowMaterialProperty({
      color: baseColor,
      glowPower,
      taperPower: 0.55,
    }),
    clampToGround: false,
  });
  if (selectable) return addSelectablePart(entities, asset, part, "polyline", graphic);
  entities.add({ id: part, name: part, polyline: graphic });
  return undefined;
}

function flowPosition(points: Cartesian3[], offset: number) {
  return new CallbackPositionProperty((_time, result) => {
    const progress = ((Date.now() / 3900 + offset) % 1 + 1) % 1;
    const scaled = progress * (points.length - 1);
    const segment = Math.min(Math.floor(scaled), points.length - 2);
    const segmentProgress = scaled - segment;
    return Cartesian3.lerp(
      points[segment],
      points[segment + 1],
      segmentProgress,
      result ?? new Cartesian3(),
    );
  }, false);
}

function addWaterway(entities: EntityCollection, name: string, coordinates: Array<[number, number]>) {
  const points = coordinates.map(([longitude, latitude]) =>
    Cartesian3.fromDegrees(longitude, latitude, 5),
  );
  entities.add({
    id: `${name}-glow`,
    name,
    polyline: new PolylineGraphics({
      positions: points,
      width: 24,
      material: new PolylineGlowMaterialProperty({
        color: color("#2da8cb").withAlpha(0.4),
        glowPower: 0.12,
        taperPower: 0.65,
      }),
      clampToGround: false,
    }),
  });
  entities.add({
    id: `${name}-surface`,
    name,
    polyline: new PolylineGraphics({
      positions: points,
      width: 15,
      material: new ColorMaterialProperty(color("#64c7d4").withAlpha(0.76)),
      clampToGround: false,
    }),
  });
  entities.add({
    id: `${name}-edge`,
    name,
    polyline: new PolylineGraphics({
      positions: points,
      width: 2,
      material: new ColorMaterialProperty(color("#c9f4e9").withAlpha(0.5)),
      clampToGround: false,
    }),
  });
}

function addTopography(entities: EntityCollection) {
  const center = CITY_CENTER;
  const rings = [
    { east: -3400, north: 1900, radius: 1850, height: 65, alpha: 0.25 },
    { east: -3400, north: 1900, radius: 2380, height: 68, alpha: 0.17 },
    { east: 2800, north: 3000, radius: 1350, height: 48, alpha: 0.2 },
    { east: 2800, north: 3000, radius: 1850, height: 52, alpha: 0.13 },
  ];
  for (const [index, ring] of rings.entries()) {
    const points: Cartesian3[] = [];
    const latitude = center.latitude + ring.north / 111320;
    const longitude = center.longitude + ring.east / (111320 * Math.cos((latitude * Math.PI) / 180));
    for (let i = 0; i <= 56; i += 1) {
      const angle = (i / 56) * Math.PI * 2;
      const irregular = 1 + 0.12 * Math.sin(angle * 3 + index) + 0.06 * Math.cos(angle * 5);
      const east = Math.cos(angle) * ring.radius * irregular;
      const north = Math.sin(angle) * ring.radius * irregular;
      points.push(localPosition(longitude, latitude, ring.height, east, north));
    }
    entities.add({
      id: `topographic-contour-${index}`,
      name: "Illustrative topographic contour",
      polyline: new PolylineGraphics({
        positions: points,
        width: 2,
        material: new ColorMaterialProperty(
          color(index < 2 ? "#7ca284" : "#8ba58a").withAlpha(ring.alpha),
        ),
      }),
    });
  }
}

function addParks(entities: EntityCollection) {
  const parks = [
    { longitude: 123.1875, latitude: 13.6199, east: 0, north: 0, a: 480, b: 310 },
    { longitude: 123.205, latitude: 13.6284, east: 0, north: 0, a: 520, b: 290 },
    { longitude: 123.191, latitude: 13.635, east: 0, north: 0, a: 620, b: 380 },
  ];
  parks.forEach((park, index) => {
    entities.add({
      id: `city-green-${index}`,
      name: "Illustrative green space",
      position: localPosition(park.longitude, park.latitude, 8, park.east, park.north),
      ellipse: {
        semiMajorAxis: park.a,
        semiMinorAxis: park.b,
        material: color("#3d956b").withAlpha(0.24),
        outline: true,
        outlineColor: color("#b9e3bb").withAlpha(0.25),
      },
    });
  });
}

function addStylizedCity(entities: EntityCollection) {
  // Deterministic low-rise blocks keep the model stable between renders.
  let seed = 328174;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const buildingColors = ["#d6e3dd", "#bccfca", "#e8ddc9", "#b9d5d5", "#cad6e0"];
  for (let index = 0; index < 150; index += 1) {
    const angle = random() * Math.PI * 2;
    const distance = 550 + Math.sqrt(random()) * 3700;
    const east = Math.cos(angle) * distance;
    const north = Math.sin(angle) * distance;
    const latitude = CITY_CENTER.latitude + north / 111320;
    const longitude = CITY_CENTER.longitude + east / (111320 * Math.cos((latitude * Math.PI) / 180));
    const width = 25 + random() * 66;
    const depth = 22 + random() * 52;
    const height = 9 + random() * 36;
    const buildingColor = color(buildingColors[Math.floor(random() * buildingColors.length)]);
    const position = localPosition(longitude, latitude, 5 + height / 2);
    entities.add({
      id: `city-block-${index}`,
      name: "Stylized city building",
      properties: new PropertyBag({ layerType: "buildings" }),
      position,
      orientation: orientation(position, random() * Math.PI),
      box: new BoxGraphics({
        dimensions: new Cartesian3(width, depth, height),
        material: new ColorMaterialProperty(buildingColor.withAlpha(0.92)),
        outline: true,
        outlineColor: new ConstantProperty(buildingColor.brighten(0.25, new Color())),
      }),
    });
  }

  const trees = [
    { east: -2600, north: -1100, count: 12 },
    { east: 3100, north: 600, count: 13 },
    { east: -1000, north: 3300, count: 10 },
  ];
  const foliage = ["#2d805f", "#3c936a", "#4aa16e", "#287556"];
  let treeIndex = 0;
  for (const grove of trees) {
    for (let index = 0; index < grove.count; index += 1) {
      const east = grove.east + (random() - 0.5) * 1100;
      const north = grove.north + (random() - 0.5) * 880;
      const latitude = CITY_CENTER.latitude + north / 111320;
      const longitude = CITY_CENTER.longitude + east / (111320 * Math.cos((latitude * Math.PI) / 180));
      const height = 10 + random() * 7;
      const trunkHeight = height * 0.42;
      const trunkPosition = localPosition(longitude, latitude, 5 + trunkHeight / 2);
      const canopyPosition = localPosition(longitude, latitude, 5 + trunkHeight + height * 0.26);
      const leafColor = color(foliage[Math.floor(random() * foliage.length)]);
      entities.add({
        id: `tree-trunk-${treeIndex}`,
        name: "Stylized tree trunk",
        properties: new PropertyBag({ layerType: "buildings" }),
        position: trunkPosition,
        orientation: orientation(trunkPosition),
        cylinder: new CylinderGraphics({
          length: trunkHeight,
          topRadius: 0.9,
          bottomRadius: 1.5,
          material: new ColorMaterialProperty(color("#745a3c")),
        }),
      });
      entities.add({
        id: `tree-crown-${treeIndex}`,
        name: "Stylized tree canopy",
        properties: new PropertyBag({ layerType: "buildings" }),
        position: canopyPosition,
        orientation: orientation(canopyPosition),
        cylinder: new CylinderGraphics({
          length: height * 0.72,
          topRadius: 0.6,
          bottomRadius: 5 + random() * 3,
          material: new ColorMaterialProperty(leafColor),
          outline: true,
          outlineColor: new ConstantProperty(leafColor.brighten(0.24, new Color())),
        }),
      });
      treeIndex += 1;
    }
  }
}

function buildAssetModel(entities: EntityCollection, asset: DemoAsset) {
  const visuals: AssetVisual[] = [];
  const base = color(asset.color);
  const add = (
    part: string,
    type: GraphicType,
    shape: Graphic,
    position?: Cartesian3 | CallbackPositionProperty,
    label?: string,
  ) => visuals.push(addSelectablePart(entities, asset, part, type, shape, position, label));
  const cylinder = (part: string, east: number, north: number, height: number, length: number, top: number, bottom: number, tint = base, label?: string) => {
    add(part, "cylinder", new CylinderGraphics({
      length,
      topRadius: top,
      bottomRadius: bottom,
      material: new ColorMaterialProperty(tint),
      outline: true,
      outlineColor: new ConstantProperty(Color.WHITE.withAlpha(0.55)),
    }), localPosition(asset.longitude, asset.latitude, height, east, north), label);
  };
  const box = (part: string, east: number, north: number, height: number, x: number, y: number, z: number, tint = base, label?: string) => {
    add(part, "box", new BoxGraphics({
      dimensions: new Cartesian3(x, y, z),
      material: new ColorMaterialProperty(tint),
      outline: true,
      outlineColor: new ConstantProperty(Color.WHITE.withAlpha(0.45)),
    }), localPosition(asset.longitude, asset.latitude, height, east, north), label);
  };

  if (asset.type === "reservoir") {
    cylinder("basin", 0, 0, asset.elevation + 19, 34, 24, 25, base, asset.name);
    cylinder("water-surface", 0, 0, asset.elevation + 8, 2, 21, 21, color("#2fc3e5").withAlpha(0.9));
    cylinder("rim", 0, 0, asset.elevation + 37, 2, 27, 27, color("#8be9f1"));
    cylinder("outlet", 19, 0, asset.elevation + 5, 5, 3, 3, color("#b1f2f4"));
  } else if (asset.type === "elevated_tank") {
    for (const [index, east] of [-11, 11].entries()) {
      for (const north of [-11, 11]) {
        cylinder(`leg-${index}-${north}`, east, north, asset.elevation + 16, 30, 1.5, 2, color("#c5e5e3"));
      }
    }
    cylinder("tank-shell", 0, 0, asset.elevation + 36, 17, 16, 17, base, asset.name);
    cylinder("tank-water", 0, 0, asset.elevation + 28, 2, 14, 14, color("#39c9e6").withAlpha(0.9));
    cylinder("tank-cap", 0, 0, asset.elevation + 45, 2.4, 18, 18, color("#9cebf0"));
    for (const side of [-1, 1]) {
      const points = [
        localPosition(asset.longitude, asset.latitude, asset.elevation + 4, side * 11, -11),
        localPosition(asset.longitude, asset.latitude, asset.elevation + 24, side * 11, 11),
      ];
      const brace = new PolylineGraphics({
        positions: points,
        width: 4,
        material: new ColorMaterialProperty(color("#c4e4e2")),
      });
      add(`brace-${side}`, "polyline", brace);
    }
  } else if (asset.type === "pump_station") {
    box("pump-hall", 0, 0, asset.elevation + 15, 62, 45, 30, base, asset.name);
    box("roof", 0, 0, asset.elevation + 31, 67, 49, 5, color("#b1d7d6"));
    box("control-room", -22, 0, asset.elevation + 17, 17, 35, 25, color("#65c9b4"));
    cylinder("discharge-header", 37, 0, asset.elevation + 9, 5, 4, 4, color("#b9f1eb"));
    cylinder("vent-stack", -15, 0, asset.elevation + 38, 12, 2, 2, color("#d9ecea"));
  } else if (asset.type === "treatment_plant") {
    box("filter-hall", 0, 0, asset.elevation + 12, 74, 42, 24, base, asset.name);
    box("settling-basin-a", 54, -20, asset.elevation + 5, 35, 27, 9, color("#52bacc"));
    box("settling-basin-b", 54, 15, asset.elevation + 5, 35, 27, 9, color("#6ec9d1"));
    cylinder("clarifier-a", -42, -12, asset.elevation + 9, 14, 16, 16, color("#3daab7"));
    cylinder("clarifier-b", -42, 22, asset.elevation + 9, 14, 16, 16, color("#55bdc6"));
    box("control-tower", 14, 0, asset.elevation + 24, 12, 12, 24, color("#aebdff"));
  } else if (asset.type === "control_valve") {
    cylinder("valve-body", 0, 0, asset.elevation + 5, 11, 6, 6, base, asset.name);
    cylinder("valve-stem", 0, 0, asset.elevation + 13, 10, 1.8, 1.8, color("#ffd48b"));
    cylinder("valve-wheel-hub", 0, 0, asset.elevation + 19, 2, 3, 3, color("#ffe1a6"));
    const wheelPoints: Cartesian3[] = [];
    for (let i = 0; i <= 28; i += 1) {
      const angle = (i / 28) * Math.PI * 2;
      wheelPoints.push(localPosition(asset.longitude, asset.latitude, asset.elevation + 19, Math.cos(angle) * 11, Math.sin(angle) * 11));
    }
    const wheel = new PolylineGraphics({
      positions: wheelPoints,
      width: 3,
      material: new ColorMaterialProperty(color("#ffe1a6")),
    });
    add("valve-wheel", "polyline", wheel);
  } else if (asset.type === "sensor") {
    cylinder("sensor-foot", 0, 0, asset.elevation + 2, 3, 4.5, 4.5, color("#c6baff"));
    cylinder("sensor-mast", 0, 0, asset.elevation + 9, 13, 1, 1.3, color("#d9d2ff"), asset.name);
    const sensor = new EllipsoidGraphics({
      radii: new Cartesian3(3.6, 3.6, 3.6),
      material: new ColorMaterialProperty(base),
      outline: true,
      outlineColor: new ConstantProperty(Color.WHITE),
    });
    add("sensor-head", "ellipsoid", sensor, localPosition(asset.longitude, asset.latitude, asset.elevation + 17));
  } else if (asset.type === "pipeline" && asset.path) {
    const linePoints = asset.path.map(([longitude, latitude]) =>
      Cartesian3.fromDegrees(longitude, latitude, 14),
    );
    addPolyline(entities, asset, "glowing-route", linePoints, statusColor(asset.status), 8, 0.34, true);
    const highlight = new PolylineGraphics({
      positions: linePoints,
      width: 2,
      material: new ColorMaterialProperty(color("#d3faff").withAlpha(0.68)),
    });
    add("route-core", "polyline", highlight);
    // Two flowing beads per segment animate independently without recreating Cesium.
    for (let particle = 0; particle < 2; particle += 1) {
      const animatedPosition = flowPosition(linePoints, particle * 0.5);
      addPoint(entities, asset, `flow-particle-${particle}`, animatedPosition, statusColor(asset.status), 12);
    }
    for (const [index, point] of [linePoints[0], linePoints[linePoints.length - 1]].entries()) {
      addPoint(entities, asset, `junction-${index}`, point, color("#d6fbff"), 9);
    }
  }

  return visuals;
}

function focusCamera(viewer: Viewer, longitude: number, latitude: number, height: number, duration = 1.15) {
  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(longitude, latitude, height),
    orientation: {
      heading: (34 * Math.PI) / 180,
      pitch: (-49 * Math.PI) / 180,
      roll: 0,
    },
    duration,
  });
}

export const HydromeshMap = forwardRef<HydromeshMapHandle, HydromeshMapProps>(
  function HydromeshMap({ selectedAssetId, onSelectAsset, layerVisibility }, ref) {
    const hostRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<Viewer | null>(null);
    const visualMapRef = useRef<Map<string, AssetVisual[]>>(new Map());
    const onSelectRef = useRef(onSelectAsset);

    useEffect(() => {
      onSelectRef.current = onSelectAsset;
    }, [onSelectAsset]);

    useEffect(() => {
      const viewer = viewerRef.current;
      if (!viewer) return;
      for (const entity of viewer.entities.values) {
        const layerType = entity.properties?.layerType?.getValue();
        const assetType = entity.properties?.assetType?.getValue();
        if (layerType === "buildings") entity.show = layerVisibility.buildings;
        if (typeof assetType === "string") {
          const visible = assetType === "pipeline" ? layerVisibility.pipelines
            : assetType === "reservoir" || assetType === "elevated_tank" ? layerVisibility.reservoirs
            : assetType === "pump_station" ? layerVisibility.pumps
            : assetType === "treatment_plant" ? layerVisibility.treatment : true;
          entity.show = visible;
        }
      }
      viewer.scene.requestRender();
    }, [layerVisibility]);

    useEffect(() => {
      const host = hostRef.current;
      if (!host) return;

      const viewer = new Viewer(host, {
        baseLayer: false,
        terrainProvider: new EllipsoidTerrainProvider(),
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        navigationHelpButton: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        scene3DOnly: true,
        requestRenderMode: true,
        maximumRenderTimeChange: Infinity,
      });
      viewerRef.current = viewer;
      viewer.scene.globe.baseColor = color("#243d42");
      viewer.scene.globe.enableLighting = true;
      viewer.scene.globe.depthTestAgainstTerrain = false;
      viewer.scene.backgroundColor = color("#081b27");
      viewer.scene.fog.enabled = true;
      viewer.scene.fog.density = 0.00009;
      viewer.scene.screenSpaceCameraController.minimumZoomDistance = 230;
      viewer.scene.screenSpaceCameraController.maximumZoomDistance = 90000;

      const imagery = viewer.imageryLayers.addImageryProvider(
        new OpenStreetMapImageryProvider({
          url: "https://tile.openstreetmap.org/",
          credit: OSM_CREDIT,
        }),
      );
      imagery.brightness = 0.83;
      imagery.saturation = 0.58;
      imagery.contrast = 1.04;

      addTopography(viewer.entities);
      addParks(viewer.entities);
      addStylizedCity(viewer.entities);
      addWaterway(viewer.entities, "Illustrative waterway", [
        [123.1768, 13.6418],
        [123.1814, 13.6356],
        [123.1888, 13.6314],
        [123.1924, 13.6253],
        [123.1997, 13.6205],
        [123.2054, 13.6128],
      ]);

      const visuals = new Map<string, AssetVisual[]>();
      for (const asset of demoAssets) visuals.set(asset.id, buildAssetModel(viewer.entities, asset));
      visualMapRef.current = visuals;

      // Subtle peripheral route lines suggest the road grid without competing with the assets.
      const streets: Array<Array<[number, number]>> = [
        [[123.177, 13.623], [123.186, 13.625], [123.197, 13.626], [123.208, 13.628]],
        [[123.182, 13.613], [123.187, 13.621], [123.193, 13.628], [123.201, 13.638]],
        [[123.181, 13.635], [123.191, 13.632], [123.2, 13.63], [123.209, 13.628]],
        [[123.185, 13.642], [123.191, 13.634], [123.197, 13.625], [123.204, 13.616]],
      ];
      streets.forEach((street, index) => {
        viewer.entities.add({
          id: `city-street-${index}`,
          name: "Illustrative street",
          polyline: new PolylineGraphics({
            positions: street.map(([longitude, latitude]) => Cartesian3.fromDegrees(longitude, latitude, 4)),
            width: 3,
            material: new ColorMaterialProperty(color("#8cabb1").withAlpha(0.28)),
          }),
        });
      });

      viewer.camera.setView({
        destination: Cartesian3.fromDegrees(CITY_CENTER.longitude, CITY_CENTER.latitude, 10500),
        orientation: {
          heading: (34 * Math.PI) / 180,
          pitch: (-49 * Math.PI) / 180,
          roll: 0,
        },
      });
      viewer.scene.requestRender();

      const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
      handler.setInputAction((movement: { position: Cartesian2 }) => {
        const picked = viewer.scene.pick(movement.position);
        const entity = picked?.id;
        if (!(entity instanceof Entity)) return;
        const id = entity.properties?.assetId?.getValue(viewer.clock.currentTime);
        if (typeof id === "string") onSelectRef.current(id);
      }, ScreenSpaceEventType.LEFT_CLICK);

      const animationTimer = window.setInterval(() => viewer.scene.requestRender(), 55);
      const onResize = () => viewer.resize();
      window.addEventListener("resize", onResize);

      return () => {
        window.clearInterval(animationTimer);
        window.removeEventListener("resize", onResize);
        handler.destroy();
        if (!viewer.isDestroyed()) viewer.destroy();
        viewerRef.current = null;
        visualMapRef.current.clear();
      };
    }, []);

    useEffect(() => {
      const viewer = viewerRef.current;
      if (!viewer) return;
      for (const [assetId, visuals] of visualMapRef.current) {
        for (const visual of visuals) visual.setSelected(assetId === selectedAssetId);
      }
      if (selectedAssetId) {
        const asset = demoAssets.find((item) => item.id === selectedAssetId);
        if (asset) focusCamera(viewer, asset.longitude, asset.latitude, asset.type === "pipeline" ? 2100 : 1900);
      }
      viewer.scene.requestRender();
    }, [selectedAssetId]);

    useImperativeHandle(ref, () => ({
      focusAsset(assetId) {
        const asset = demoAssets.find((item) => item.id === assetId);
        if (asset && viewerRef.current) {
          focusCamera(viewerRef.current, asset.longitude, asset.latitude, asset.type === "pipeline" ? 2300 : 1950);
        }
      },
      overview() {
        const viewer = viewerRef.current;
        if (viewer) focusCamera(viewer, CITY_CENTER.longitude, CITY_CENTER.latitude, 10500);
      },
      zoomIn() {
        viewerRef.current?.camera.zoomIn(680);
      },
      zoomOut() {
        viewerRef.current?.camera.zoomOut(680);
      },
      rotate(direction) {
        const camera = viewerRef.current?.camera;
        if (!camera) return;
        if (direction === "left") camera.rotateLeft(Math.PI / 12);
        else camera.rotateRight(Math.PI / 12);
      },
      tilt(direction) {
        const camera = viewerRef.current?.camera;
        if (!camera) return;
        if (direction === "up") camera.lookUp(Math.PI / 48);
        else camera.lookDown(Math.PI / 48);
      },
    }), []);

    return <div aria-label="Interactive isometric 3D map of Naga City" className="map-canvas" ref={hostRef} />;
  },
);

export function getAssetSubtitle(asset: DemoAsset) {
  return `${assetTypeLabels[asset.type]} · ${asset.zone} · ${assetStatusLabels[asset.status]}`;
}
