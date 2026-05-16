import { OrbitControls, OrthographicCamera } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three/examples/jsm/controls/OrbitControls.js";
import type { CameraFit } from "../../../utils/cameraViewport";

export function ViewCamera({ cameraFit }: { cameraFit: CameraFit }) {
  const initialCameraFitRef = useRef(cameraFit);
  const hasInitializedCameraRef = useRef(false);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { size } = useThree();

  useLayoutEffect(() => {
    const camera = cameraRef.current;
    if (!camera || !size.height) return;

    const initialCameraFit = initialCameraFitRef.current;
    const aspect = size.width / size.height;
    camera.left = (-initialCameraFit.viewHeight * aspect) / 2;
    camera.right = (initialCameraFit.viewHeight * aspect) / 2;
    camera.top = initialCameraFit.viewHeight / 2;
    camera.bottom = -initialCameraFit.viewHeight / 2;
    camera.near = initialCameraFit.near;
    camera.far = initialCameraFit.far;
    camera.up.set(0, 0, 1);

    if (!hasInitializedCameraRef.current) {
      camera.position.set(...initialCameraFit.cameraPosition);
      camera.lookAt(...initialCameraFit.target);
      hasInitializedCameraRef.current = true;

      const controls = controlsRef.current;
      if (controls) {
        controls.target.set(...initialCameraFit.target);
        controls.update();
      }
    }

    camera.updateProjectionMatrix();
  }, [size.height, size.width]);

  const initialCameraFit = initialCameraFitRef.current;

  return (
    <>
      <OrthographicCamera ref={cameraRef} makeDefault near={initialCameraFit.near} far={initialCameraFit.far} position={initialCameraFit.cameraPosition} up={[0, 0, 1]} />
      <OrbitControls ref={controlsRef} enableDamping makeDefault />
    </>
  );
}
