import { Html } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { CameraPositionMarker } from "../../../utils/cameraViewport";
import { CameraFrustum } from "./CameraFrustum";
import styles from "./CameraModelViewer.module.css";

function CameraMarkerLabel({ isActive, marker }: { isActive: boolean; marker: CameraPositionMarker }) {
  return (
    <Html center className={`${styles.cameraPositionMarker} ${isActive ? styles.cameraPositionMarkerActive : ""}`} position={marker.cameraPosition} title={`Slot ${marker.label} camera position`} transform={false} zIndexRange={[20, 0]}>
      <span aria-label={`Camera slot ${marker.label} camera position`}>{marker.label}</span>
    </Html>
  );
}

function TargetOffsetDot({ marker }: { marker: CameraPositionMarker }) {
  return (
    <Html center className={styles.targetOffsetDot} position={marker.targetPosition} title={`Slot ${marker.label} target offset`} transform={false} zIndexRange={[20, 0]}>
      <span aria-label={`Camera slot ${marker.label} target offset`} />
    </Html>
  );
}

function ActiveMarkerLine({ marker }: { marker: CameraPositionMarker }) {
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...marker.targetPosition), new THREE.Vector3(...marker.cameraPosition)]), [marker.cameraPosition, marker.targetPosition]);

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  return (
    <line geometry={geometry} renderOrder={10}>
      <lineBasicMaterial attach="material" color={0xffffff} depthTest={false} depthWrite={false} transparent opacity={0.72} />
    </line>
  );
}

export function CameraMarkers({ activeSlotId, frustumAspectRatio, markers }: { activeSlotId?: number; frustumAspectRatio: number; markers: CameraPositionMarker[] }) {
  return (
    <>
      {markers.map((marker) => {
        const isActive = activeSlotId === marker.slotId;

        return (
          <group key={marker.slotId}>
            <CameraMarkerLabel isActive={isActive} marker={marker} />
            {isActive && (
              <>
                <TargetOffsetDot marker={marker} />
                <ActiveMarkerLine marker={marker} />
                <CameraFrustum aspectRatio={frustumAspectRatio} marker={marker} />
              </>
            )}
          </group>
        );
      })}
    </>
  );
}
