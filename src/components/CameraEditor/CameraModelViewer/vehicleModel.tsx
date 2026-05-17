import { useEffect, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import type { SelectableVehicleModel, VehicleFallbackBoxModel } from "../../../types/vehicleModel";
import { getModelLoadProgressPercent } from "../../../utils/cameraModelOverlay";
import { VEHICLE_MODEL_METERS_PER_SOURCE_UNIT } from "../../../utils/cameraViewport";
import type { LoadState } from "./types";

const FALLBACK_BOX_EDGE_COLOR = "#69d2ff";

function disposeObject3D(root: THREE.Object3D) {
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    }
  });
}

export function VehicleModel({ model, onLoadProgress, onLoadStateChange }: { model: SelectableVehicleModel | null; onLoadProgress: (progress: number | null) => void; onLoadStateChange: (state: LoadState) => void }) {
  const [scene, setScene] = useState<THREE.Group | null>(null);

  useEffect(() => {
    if (!model?.src) {
      setScene(null);
      onLoadProgress(null);
      onLoadStateChange("ready");
      return;
    }

    let disposed = false;
    let loadedScene: THREE.Group | null = null;
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    onLoadStateChange("loading");
    onLoadProgress(null);
    setScene(null);

    loader.load(
      model.src,
      (gltf) => {
        loadedScene = gltf.scene;
        // Converted GLB assets are Y-up with the ship length on the GLB Z axis.
        // Rotate them into the camera editor's source/saved-view coordinate system:
        // X = lateral, Y = forward/back, Z = vertical/up.
        gltf.scene.rotation.x = Math.PI / 2;
        gltf.scene.scale.setScalar(VEHICLE_MODEL_METERS_PER_SOURCE_UNIT);

        if (disposed) {
          disposeObject3D(gltf.scene);
          return;
        }

        setScene(gltf.scene);
        onLoadProgress(100);
        onLoadStateChange("ready");
      },
      (event) => {
        if (disposed) return;
        onLoadProgress(getModelLoadProgressPercent(event));
      },
      (error) => {
        if (disposed) return;
        console.warn("Vehicle model failed to load", error);
        onLoadStateChange("error");
      },
    );

    return () => {
      disposed = true;
      if (loadedScene) disposeObject3D(loadedScene);
    };
  }, [model?.src, onLoadProgress, onLoadStateChange]);

  if (!scene) return null;

  return <primitive object={scene} />;
}

export function VehicleFallbackBox({ model }: { model: VehicleFallbackBoxModel | null }) {
  if (!model) return null;

  const position = model.bounds.center.map((value) => value * VEHICLE_MODEL_METERS_PER_SOURCE_UNIT) as [number, number, number];
  const size = model.bounds.size.map((value) => value * VEHICLE_MODEL_METERS_PER_SOURCE_UNIT) as [number, number, number];
  const edgePositions = getBoxEdgeLinePositions(size);

  return (
    <lineSegments position={position}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[edgePositions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color={FALLBACK_BOX_EDGE_COLOR} transparent opacity={0.82} />
    </lineSegments>
  );
}

function getBoxEdgeLinePositions([sizeX, sizeY, sizeZ]: [number, number, number]) {
  const halfX = sizeX / 2;
  const halfY = sizeY / 2;
  const halfZ = sizeZ / 2;
  const corners: [number, number, number][] = [
    [-halfX, -halfY, -halfZ],
    [halfX, -halfY, -halfZ],
    [halfX, halfY, -halfZ],
    [-halfX, halfY, -halfZ],
    [-halfX, -halfY, halfZ],
    [halfX, -halfY, halfZ],
    [halfX, halfY, halfZ],
    [-halfX, halfY, halfZ],
  ];
  const edgeIndices = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ];

  return new Float32Array(edgeIndices.flatMap(([from, to]) => [...corners[from], ...corners[to]]));
}
