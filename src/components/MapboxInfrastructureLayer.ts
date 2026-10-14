import * as THREE from "three";
import mapboxgl, { type Map as MapboxMap, type CustomLayerInterface, type PointLike } from "mapbox-gl";
import { demoAssets, type DemoAsset } from "../data/assets";
import type { MonitoringNode } from "../types/barangay";

const PALETTE: Record<DemoAsset["type"], string> = {
  reservoir: "#25aec5",
  elevated_tank: "#45b9cb",
  pump_station: "#38ad8e",
  treatment_plant: "#7585d7",
  control_valve: "#e1a343",
  sensor: "#8b72d3",
  pipeline: "#12b9d8",
};

function material(color: string, metalness = 0.12) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.45,
    metalness,
    emissive: color,
    emissiveIntensity: 0.055,
  });
}

function addMesh(group: THREE.Group, geometry: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.assetId = group.userData.assetId;
  group.add(mesh);
  return mesh;
}

function addBox(group: THREE.Group, dimensions: [number, number, number], position: [number, number, number], color: string, mat?: THREE.Material) {
  return addMesh(group, new THREE.BoxGeometry(...dimensions), mat ?? material(color), ...position);
}

function addCylinder(group: THREE.Group, top: number, bottom: number, height: number, position: [number, number, number], color: string, segments = 20) {
  return addMesh(group, new THREE.CylinderGeometry(top, bottom, height, segments), material(color, 0.2), ...position);
}

function buildModel(asset: DemoAsset) {
  const group = new THREE.Group();
  group.userData.assetId = asset.id;
  const color = PALETTE[asset.type];
  const pale = "#e8f3ef";
  const dark = "#47727a";

  if (asset.type === "reservoir") {
    addCylinder(group, 17, 18, 8, [0, 4, 0], color, 28);
    const rim = addMesh(group, new THREE.TorusGeometry(17.2, 0.8, 8, 32), material(pale, 0.35), 0, 8, 0);
    rim.rotation.x = Math.PI / 2;
    const water = addMesh(group, new THREE.CircleGeometry(15.7, 32), new THREE.MeshStandardMaterial({ color: "#42c4d6", roughness: 0.2, metalness: 0.4, transparent: true, opacity: 0.84, emissive: "#09768d", emissiveIntensity: 0.22 }), 0, 7.4, 0);
    water.rotation.x = -Math.PI / 2;
    for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      const pipe = addCylinder(group, 0.8, 0.8, 8, [Math.cos(angle) * 17, 4, Math.sin(angle) * 17], pale, 10);
      pipe.rotation.z = Math.PI / 2;
    }
  } else if (asset.type === "elevated_tank") {
    for (let index = 0; index < 6; index += 1) {
      const angle = (index / 6) * Math.PI * 2;
      addCylinder(group, 0.65, 0.9, 29, [Math.cos(angle) * 7.3, 14.5, Math.sin(angle) * 7.3], pale, 10);
      const brace = addBox(group, [0.55, 16, 0.55], [Math.cos(angle) * 5.8, 16, Math.sin(angle) * 5.8], dark);
      brace.rotation.z = (index % 2 ? -1 : 1) * 0.36;
    }
    addCylinder(group, 10.5, 11, 12, [0, 35, 0], color, 28);
    addCylinder(group, 0.85, 0.85, 9, [0, 45.2, 0], pale, 12);
    const cap = addMesh(group, new THREE.ConeGeometry(11, 3.5, 28), material("#d8e9e4", 0.28), 0, 43, 0);
    cap.rotation.x = Math.PI;
    const band = addMesh(group, new THREE.TorusGeometry(10.8, 0.45, 8, 28), material("#f2f7ef", 0.3), 0, 35, 0);
    band.rotation.x = Math.PI / 2;
  } else if (asset.type === "pump_station") {
    addBox(group, [36, 15, 25], [0, 7.5, 0], color);
    addBox(group, [39, 1.2, 28], [0, 15.2, 0], pale);
    addBox(group, [12, 8, 1], [0, 8, 12.8], "#9bd5d0");
    for (let index = -1; index <= 1; index += 1) {
      const pipe = addCylinder(group, 1.1, 1.1, 24, [index * 8, 3.5, -16], "#c9ebe6", 12);
      pipe.rotation.z = Math.PI / 2;
      addCylinder(group, 2.5, 2.5, 4, [index * 8, 3.5, -9], "#4c8991", 16);
    }
    addCylinder(group, 1.8, 1.8, 6, [-12, 19, -5], pale, 12);
  } else if (asset.type === "treatment_plant") {
    addBox(group, [29, 13, 22], [-15, 6.5, 0], color);
    addBox(group, [31, 1, 24], [-15, 13.3, 0], pale);
    for (const z of [-12, 2, 16]) {
      addBox(group, [17, 4.5, 10], [13, 2.25, z], z === 2 ? "#52bdc6" : "#43aebd");
      const water = addMesh(group, new THREE.BoxGeometry(15.8, 0.18, 8.8), material("#8adce0", 0.2), 13, 4.55, z);
      water.material.transparent = true;
      (water.material as THREE.MeshStandardMaterial).opacity = 0.8;
    }
    for (const z of [-8, 8]) addCylinder(group, 5, 5.5, 5, [-3, 15.8, z], "#65bec3", 24);
  } else if (asset.type === "control_valve") {
    const body = addCylinder(group, 4.8, 4.8, 8, [0, 5, 0], color, 16);
    body.rotation.z = Math.PI / 2;
    addCylinder(group, 1.4, 1.4, 8, [0, 11, 0], pale, 12);
    const wheel = addMesh(group, new THREE.TorusGeometry(5.5, 0.65, 8, 24), material("#f5ca79", 0.38), 0, 15, 0);
    wheel.rotation.x = Math.PI / 2;
    addCylinder(group, 0.8, 0.8, 4, [0, 15, 0], "#f5ca79", 12);
    for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      const spoke = addBox(group, [0.6, 10, 0.6], [Math.cos(angle) * 3, 15, Math.sin(angle) * 3], "#ffe4ab");
      spoke.rotation.y = -angle;
    }
  } else if (asset.type === "sensor") {
    addCylinder(group, 1.1, 1.4, 2, [0, 1, 0], dark, 12);
    addCylinder(group, 0.32, 0.42, 13, [0, 8.5, 0], pale, 10);
    addBox(group, [4.5, 4.5, 3.5], [0, 14, 0], color);
    const sensorTop = addMesh(group, new THREE.SphereGeometry(2.4, 16, 12), material("#d7c9ff", 0.2), 0, 18, 0);
    sensorTop.scale.set(1, 0.72, 1);
    addCylinder(group, 0.18, 0.18, 7, [0, 19, -3.5], "#d7c9ff", 8);
  }

  const selectionRing = addMesh(group, new THREE.TorusGeometry(asset.type === "reservoir" ? 24 : asset.type === "elevated_tank" ? 17 : 21, 0.72, 8, 40), new THREE.MeshBasicMaterial({ color: "#fff1a8", transparent: true, opacity: 0.92 }), 0, 0.8, 0);
  selectionRing.rotation.x = Math.PI / 2;
  selectionRing.visible = false;
  group.userData.selectionRing = selectionRing;
  group.userData.color = color;
  return group;
}

export function createMapboxInfrastructureLayer(map: MapboxMap) {
  const camera = new THREE.Camera();
  const rayCamera = new THREE.PerspectiveCamera();
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 1.55));
  const key = new THREE.DirectionalLight(0xffffff, 2.35);
  key.position.set(-450, 650, 900);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xb9efff, 1.25);
  fill.position.set(500, -250, 550);
  scene.add(fill);
  const groups = new Map<string, THREE.Group>();
  const nodeGroups = new Map<string, THREE.Group>();
  let renderer: THREE.WebGLRenderer | null = null;
  let projection = new THREE.Matrix4();
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  const layer: CustomLayerInterface & { pick: (point: PointLike) => string | null; pickMonitoringNode: (point: PointLike) => string | null; setSelected: (id: string | null) => void; setMonitoringNodes: (nodes: MonitoringNode[]) => void; setSelectedMonitoringNode: (id: string | null) => void; setAssetVisibility: (visible: Partial<Record<DemoAsset["type"], boolean>>) => void; setNodesVisible: (visible: boolean) => void } = {
    id: "hydromesh-three-infrastructure",
    type: "custom",
    renderingMode: "3d",
    onAdd(_map, gl) {
      renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl as WebGL2RenderingContext, antialias: true, alpha: true });
      renderer.autoClear = false;
      renderer.setPixelRatio(window.devicePixelRatio || 1);
      for (const asset of demoAssets.filter((item) => item.type !== "pipeline")) {
        const ground = map.queryTerrainElevation([asset.longitude, asset.latitude]) ?? 0;
        const coordinate = mapboxgl.MercatorCoordinate.fromLngLat([asset.longitude, asset.latitude], ground + 0.25);
        const scale = coordinate.meterInMercatorCoordinateUnits();
        const group = buildModel(asset);
        const rotation = new THREE.Matrix4().makeRotationX(Math.PI / 2);
        group.matrixAutoUpdate = false;
        group.matrix.makeTranslation(coordinate.x, coordinate.y, coordinate.z)
          .scale(new THREE.Vector3(scale, -scale, scale))
          .multiply(rotation);
        group.matrixWorldNeedsUpdate = true;
        group.userData.name = asset.name;
        scene.add(group);
        groups.set(asset.id, group);
      }
    },
    render(_gl, matrix) {
      if (!renderer) return;
      projection = new THREE.Matrix4().fromArray(matrix as number[]);
      camera.projectionMatrix.copy(projection);
      camera.projectionMatrixInverse.copy(projection).invert();
      camera.matrixWorld.identity();
      camera.matrixWorldInverse.identity();
      renderer.resetState();
      renderer.render(scene, camera);
    },
    onRemove() {
      for (const group of groups.values()) {
        group.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((entry) => entry.dispose());
          }
        });
      }
      for (const group of nodeGroups.values()) {
        group.traverse((object) => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach((entry) => entry.dispose()); } });
      }
      groups.clear();
      nodeGroups.clear();
      renderer?.dispose();
      renderer = null;
    },
    pick(point) {
      const canvas = map.getCanvas();
      const [pointX, pointY] = Array.isArray(point) ? point : [point.x, point.y];
      mouse.set((pointX / canvas.clientWidth) * 2 - 1, -(pointY / canvas.clientHeight) * 2 + 1);
      rayCamera.projectionMatrix.copy(projection);
      rayCamera.projectionMatrixInverse.copy(projection).invert();
      rayCamera.matrixWorld.identity();
      rayCamera.matrixWorldInverse.identity();
      scene.updateMatrixWorld(true);
      raycaster.setFromCamera(mouse, rayCamera);
      raycaster.far = 0.4;
      const intersections = raycaster.intersectObjects([...groups.values()], true);
      const id = intersections[0]?.object.userData.assetId;
      return typeof id === "string" ? id : null;
    },
    pickMonitoringNode(point) {
      const canvas = map.getCanvas();
      const [pointX, pointY] = Array.isArray(point) ? point : [point.x, point.y];
      mouse.set((pointX / canvas.clientWidth) * 2 - 1, -(pointY / canvas.clientHeight) * 2 + 1);
      rayCamera.projectionMatrix.copy(projection); rayCamera.projectionMatrixInverse.copy(projection).invert();
      rayCamera.matrixWorld.identity(); rayCamera.matrixWorldInverse.identity(); scene.updateMatrixWorld(true);
      raycaster.setFromCamera(mouse, rayCamera); raycaster.far = 0.45;
      const hit = raycaster.intersectObjects([...nodeGroups.values()], true)[0]?.object.userData.monitoringNodeId;
      return typeof hit === "string" ? hit : null;
    },
    setMonitoringNodes(nodes) {
      for (const group of nodeGroups.values()) { scene.remove(group); group.traverse((object) => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach((entry) => entry.dispose()); } }); }
      nodeGroups.clear();
      const colors: Record<MonitoringNode["status"], string> = { normal: "#36b985", warning: "#f1a344", critical: "#e45059", offline: "#82939a", unmapped: "#82939a", pending_simulation: "#82939a" };
      for (const node of nodes) {
        if (!node.position) continue;
        const ground = map.queryTerrainElevation([node.position.longitude, node.position.latitude]) ?? 0;
        const coordinate = mapboxgl.MercatorCoordinate.fromLngLat([node.position.longitude, node.position.latitude], ground + 0.5);
        const scale = coordinate.meterInMercatorCoordinateUnits();
        const group = new THREE.Group();
        group.userData.monitoringNodeId = node.id;
        const color = colors[node.status];
        const add = (geometry: THREE.BufferGeometry, materialColor: string | THREE.Material, position: [number, number, number]) => {
          const nodeMaterial = typeof materialColor === "string" ? new THREE.MeshStandardMaterial({ color: materialColor, roughness: 0.35, metalness: 0.15, emissive: materialColor, emissiveIntensity: 0.12 }) : materialColor;
          const mesh = new THREE.Mesh(geometry, nodeMaterial);
          mesh.position.set(...position); mesh.userData.monitoringNodeId = node.id; mesh.castShadow = true; group.add(mesh); return mesh;
        };
        add(new THREE.CylinderGeometry(2.2, 2.8, 2, 12), "#315d67", [0, 1, 0]);
        add(new THREE.CylinderGeometry(0.45, 0.65, 9, 10), "#d7e7e4", [0, 6.5, 0]);
        add(new THREE.BoxGeometry(4, 3.5, 3), color, [0, 12.5, 0]);
        add(new THREE.SphereGeometry(2.2, 14, 10), color, [0, 16, 0]);
        const halo = add(new THREE.TorusGeometry(5.5, 0.55, 8, 28), new THREE.MeshBasicMaterial({ color: "#ffe186", transparent: true, opacity: 0.95 }), [0, 0.9, 0]);
        halo.rotation.x = Math.PI / 2; halo.visible = false; group.userData.selectionHalo = halo;
        const rotation = new THREE.Matrix4().makeRotationX(Math.PI / 2);
        group.matrixAutoUpdate = false;
        group.matrix.makeTranslation(coordinate.x, coordinate.y, coordinate.z).scale(new THREE.Vector3(scale, -scale, scale)).multiply(rotation);
        group.matrixWorldNeedsUpdate = true; scene.add(group); nodeGroups.set(node.id, group);
      }
      map.triggerRepaint();
    },
    setSelectedMonitoringNode(id) {
      for (const [nodeId, group] of nodeGroups) {
        const halo = group.userData.selectionHalo as THREE.Mesh;
        halo.visible = id === nodeId;
        group.traverse((object) => { if (!(object instanceof THREE.Mesh) || object === halo || !(object.material instanceof THREE.MeshStandardMaterial)) return; object.material.emissiveIntensity = id === nodeId ? 0.55 : 0.12; });
      }
      map.triggerRepaint();
    },
    setAssetVisibility(visible) {
      for (const [assetId, group] of groups) {
        const asset = demoAssets.find((item) => item.id === assetId);
        if (asset) group.visible = visible[asset.type] ?? true;
      }
      map.triggerRepaint();
    },
    setNodesVisible(visible) {
      for (const group of nodeGroups.values()) group.visible = visible;
      map.triggerRepaint();
    },
    setSelected(id) {
      for (const [assetId, group] of groups) {
        const isSelected = id === assetId;
        const selectionRing = group.userData.selectionRing as THREE.Mesh;
        selectionRing.visible = isSelected;
        group.traverse((object) => {
          if (!(object instanceof THREE.Mesh) || object === selectionRing) return;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const entry of materials) {
            if (!(entry instanceof THREE.MeshStandardMaterial)) continue;
            if (isSelected) {
              entry.emissive.set("#f5c95f");
              entry.emissiveIntensity = 0.42;
            } else {
              entry.emissive.set(entry.color);
              entry.emissiveIntensity = 0.055;
            }
          }
        });
      }
      map.triggerRepaint();
    },
  };
  return layer;
}
