import { OrbitControls, OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three/examples/jsm/controls/OrbitControls.js";
import { getCameraLensVerticalFov, getContainedCameraViewVerticalFov } from "../../../utils/cameraFrustum";
import { getCameraRotationUpVector, type CameraFit, type CameraPositionMarker } from "../../../utils/cameraViewport";

function OrbitViewCamera({ cameraFit }: { cameraFit: CameraFit }) {
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
      <OrbitControls ref={controlsRef} enableDamping enablePan={false} makeDefault />
    </>
  );
}

function SavedCameraView({ cameraFit, marker, screenAspectRatio }: { cameraFit: CameraFit; marker: CameraPositionMarker; screenAspectRatio: number }) {
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const { size } = useThree();

  useLayoutEffect(() => {
    const camera = cameraRef.current;
    if (!camera || !size.height) return;

    const viewportAspectRatio = size.width / size.height;
    const containedVerticalFov = getContainedCameraViewVerticalFov(getCameraLensVerticalFov(marker.lensSize), screenAspectRatio, viewportAspectRatio);

    camera.position.set(...marker.cameraPosition);
    camera.up.set(...getCameraRotationUpVector(marker.cameraRotationAngle));
    camera.aspect = viewportAspectRatio;
    camera.fov = containedVerticalFov;
    camera.near = cameraFit.near;
    camera.far = cameraFit.far;
    camera.lookAt(...marker.targetPosition);
    camera.updateProjectionMatrix();
  }, [cameraFit.far, cameraFit.near, marker, screenAspectRatio, size.height, size.width]);

  const viewportAspectRatio = size.height ? size.width / size.height : screenAspectRatio;
  const containedVerticalFov = getContainedCameraViewVerticalFov(getCameraLensVerticalFov(marker.lensSize), screenAspectRatio, viewportAspectRatio);

  return <PerspectiveCamera ref={cameraRef} makeDefault aspect={viewportAspectRatio} fov={containedVerticalFov} near={cameraFit.near} far={cameraFit.far} position={marker.cameraPosition} up={getCameraRotationUpVector(marker.cameraRotationAngle)} />;
}

export function ViewCamera({ cameraFit, cameraViewMarker, screenAspectRatio }: { cameraFit: CameraFit; cameraViewMarker: CameraPositionMarker | null; screenAspectRatio: number }) {
  if (cameraViewMarker) {
    return <SavedCameraView cameraFit={cameraFit} marker={cameraViewMarker} screenAspectRatio={screenAspectRatio} />;
  }

  return <OrbitViewCamera cameraFit={cameraFit} />;
}
