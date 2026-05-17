import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { TargetOffsetBoundingBox } from "../../../utils/cameraViewport";
import { getTargetOffsetBoundingBoxEdgePoints } from "../../../utils/cameraViewport";

export function TargetOffsetBoundingBoxEdges({ bounds }: { bounds: TargetOffsetBoundingBox | null }) {
  const geometry = useMemo(() => {
    if (!bounds) return null;
    return new THREE.BufferGeometry().setFromPoints(getTargetOffsetBoundingBoxEdgePoints(bounds).map((point) => new THREE.Vector3(...point)));
  }, [bounds]);

  useEffect(() => {
    return () => geometry?.dispose();
  }, [geometry]);

  if (!geometry) return null;

  return (
    <lineSegments geometry={geometry} renderOrder={8}>
      <lineBasicMaterial attach="material" color={0xff7a7a} depthTest={false} depthWrite={false} transparent opacity={0.5} />
    </lineSegments>
  );
}
