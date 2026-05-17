import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { getCameraFrustumLineSegments } from "../../../utils/cameraFrustum";
import type { CameraPositionMarker } from "../../../utils/cameraViewport";

const getCameraFrustumLineColor = () => (typeof document === "undefined" ? "#f79723" : getComputedStyle(document.documentElement).getPropertyValue("--color-lalt").trim() || "#f79723");

interface CameraFrustumProps {
  aspectRatio: number;
  marker: CameraPositionMarker;
}

export function CameraFrustum({ aspectRatio, marker }: CameraFrustumProps) {
  const frustumLineColor = useMemo(() => getCameraFrustumLineColor(), []);
  const geometry = useMemo(() => {
    const points = getCameraFrustumLineSegments(marker, aspectRatio).flatMap((segment) => [new THREE.Vector3(...segment.from), new THREE.Vector3(...segment.to)]);
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [aspectRatio, marker]);

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  return (
    <lineSegments geometry={geometry} renderOrder={9}>
      <lineBasicMaterial attach="material" color={frustumLineColor} depthTest={false} depthWrite={false} transparent opacity={0.56} />
    </lineSegments>
  );
}
