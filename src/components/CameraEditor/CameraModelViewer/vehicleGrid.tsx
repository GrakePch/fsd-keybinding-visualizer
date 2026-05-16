import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { VehicleGrid } from "../../../utils/cameraViewport";

const VEHICLE_GRID_LINE_COLOR = 0xc7ccd3;
const VEHICLE_GRID_LINE_OPACITY = 0.42;
const VEHICLE_GRID_SPACING_METERS = 5;

function createVehicleGridLineSegments(grid: VehicleGrid) {
  const halfSpan = grid.span / 2;
  const startX = grid.center[0] - halfSpan;
  const endX = grid.center[0] + halfSpan;
  const startY = grid.center[1] - halfSpan;
  const endY = grid.center[1] + halfSpan;
  const positions: number[] = [];

  for (let offset = 0; offset <= grid.span; offset += VEHICLE_GRID_SPACING_METERS) {
    const x = startX + offset;
    const y = startY + offset;
    positions.push(x, startY, grid.center[2], x, endY, grid.center[2]);
    positions.push(startX, y, grid.center[2], endX, y, grid.center[2]);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color: VEHICLE_GRID_LINE_COLOR,
    transparent: true,
    opacity: VEHICLE_GRID_LINE_OPACITY,
  });

  return new THREE.LineSegments(geometry, material);
}

export function VehicleGridLines({ grid }: { grid: VehicleGrid | null }) {
  const gridLines = useMemo(() => (grid ? createVehicleGridLineSegments(grid) : null), [grid]);

  useEffect(() => {
    return () => {
      if (!gridLines) return;
      gridLines.geometry.dispose();
      const materials = Array.isArray(gridLines.material) ? gridLines.material : [gridLines.material];
      materials.forEach((material) => material.dispose());
    };
  }, [gridLines]);

  if (!gridLines) return null;

  return <primitive object={gridLines} />;
}
