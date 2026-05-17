import { Html } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { CameraPositionMarker } from "../../../utils/cameraViewport";
import { CameraFrustum } from "./CameraFrustum";
import styles from "./CameraModelViewer.module.css";

function CameraMarkerLabel({ isActive, marker, onSelectSlot }: { isActive: boolean; marker: CameraPositionMarker; onSelectSlot: (slotId: number) => void }) {
  const selectSlot = () => onSelectSlot(marker.slotId);

  return (
    <Html center position={marker.cameraPosition} transform={false} zIndexRange={[20, 0]}>
      <button
        className={`${styles.cameraPositionMarker} ${isActive ? styles.cameraPositionMarkerActive : ""}`}
        type="button"
        aria-label={`Select camera slot ${marker.label}`}
        onClick={selectSlot}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <span aria-hidden="true">{marker.label}</span>
      </button>
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

export function CameraMarkers({ activeSlotId, frustumAspectRatio, hideMarkerGuides = false, markers, onSelectSlot }: { activeSlotId?: number; frustumAspectRatio: number; hideMarkerGuides?: boolean; markers: CameraPositionMarker[]; onSelectSlot: (slotId: number) => void }) {
  return (
    <>
      {markers.map((marker) => {
        const isActive = activeSlotId === marker.slotId;

        return (
          <group key={marker.slotId}>
            {!hideMarkerGuides && <CameraMarkerLabel isActive={isActive} marker={marker} onSelectSlot={onSelectSlot} />}
            {isActive && (
              <>
                {!hideMarkerGuides && (
                  <>
                    <TargetOffsetDot marker={marker} />
                    <ActiveMarkerLine marker={marker} />
                  </>
                )}
                <CameraFrustum aspectRatio={frustumAspectRatio} marker={marker} />
              </>
            )}
          </group>
        );
      })}
    </>
  );
}
