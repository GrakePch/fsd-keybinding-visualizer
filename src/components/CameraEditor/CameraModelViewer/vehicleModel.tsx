import { useEffect, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import type { SelectableVehicleModel } from "../../../types/vehicleModel";
import { getModelLoadProgressPercent } from "../../../utils/cameraModelOverlay";
import { VEHICLE_MODEL_METERS_PER_SOURCE_UNIT } from "../../../utils/cameraViewport";
import type { LoadState } from "./types";

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
  }, [model, onLoadProgress, onLoadStateChange]);

  if (!scene) return null;

  return <primitive object={scene} />;
}
