import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { VehicleGrid } from "../../../utils/cameraViewport";
import { getVehicleGridLineValues } from "../../../utils/cameraViewport";

const VEHICLE_GRID_LINE_COLOR = 0x3f3f46;
const VEHICLE_GRID_LINE_OPACITY = 0.5;
const VEHICLE_GRID_SPACING_METERS = 10;

function createVehicleGridLineSegments(grid: VehicleGrid) {
  const [minX, minY, z] = grid.min;
  const [maxX, maxY] = grid.max;
  const xLines = getVehicleGridLineValues(minX, maxX, VEHICLE_GRID_SPACING_METERS);
  const yLines = getVehicleGridLineValues(minY, maxY, VEHICLE_GRID_SPACING_METERS);
  const positions: number[] = [];

  xLines.forEach((x) => {
    positions.push(x, minY, z, x, maxY, z);
  });
  yLines.forEach((y) => {
    positions.push(minX, y, z, maxX, y, z);
  });

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
