import { OrbitControls, OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three/examples/jsm/controls/OrbitControls.js";
import { getCameraLensVerticalFov, getContainedCameraViewVerticalFov } from "../../../utils/cameraFrustum";
import { getCameraRotationUpVector, type CameraFit, type CameraPositionMarker } from "../../../utils/cameraViewport";

function OrbitViewCamera({ cameraFit }: { cameraFit: CameraFit }) {
  const initialViewHeightRef = useRef(cameraFit.viewHeight);
  const appliedCameraFitRef = useRef<CameraFit | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { size } = useThree();

  useLayoutEffect(() => {
    const camera = cameraRef.current;
    if (!camera || !size.height) return;

    const aspect = size.width / size.height;
    camera.left = (-initialViewHeightRef.current * aspect) / 2;
    camera.right = (initialViewHeightRef.current * aspect) / 2;
    camera.top = initialViewHeightRef.current / 2;
    camera.bottom = -initialViewHeightRef.current / 2;
    camera.near = cameraFit.near;
    camera.far = cameraFit.far;
    camera.up.set(0, 0, 1);

    if (appliedCameraFitRef.current !== cameraFit) {
      const target = new THREE.Vector3(...cameraFit.target);
      const fittedOffset = new THREE.Vector3(...cameraFit.cameraPosition).sub(target);
      const previousFit = appliedCameraFitRef.current;
      const offset = previousFit
        ? camera.position.clone().sub(controlsRef.current?.target ?? new THREE.Vector3(...previousFit.target))
        : fittedOffset.clone();
      if (offset.lengthSq() === 0) offset.copy(fittedOffset);
      // Apply the latest back distance without resetting the user's orbit angle or zoom.
      camera.position.copy(target).add(offset.setLength(fittedOffset.length()));
      camera.lookAt(target);
      appliedCameraFitRef.current = cameraFit;

      const controls = controlsRef.current;
      if (controls) {
        controls.target.copy(target);
        controls.update();
      }
    }

    camera.updateProjectionMatrix();
  }, [cameraFit, size.height, size.width]);

  return (
    <>
      <OrthographicCamera ref={cameraRef} makeDefault near={cameraFit.near} far={cameraFit.far} up={[0, 0, 1]} />
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

  return <OrbitViewCamera key={cameraFit.target.join(",")} cameraFit={cameraFit} />;
}
