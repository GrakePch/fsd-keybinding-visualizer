import type { CameraPositionMarker } from "./cameraViewport";

const CAMERA_VIEW_QUERY_KEY = "view";

export function getCameraViewSlotIdFromSearchParams(searchParams: URLSearchParams): number | null {
  const view = searchParams.get(CAMERA_VIEW_QUERY_KEY);
  if (!view) return null;

  if (!/^[1-9]$/.test(view)) return null;

  return Number(view) - 1;
}

export function setCameraViewSlotIdInSearchParams(searchParams: URLSearchParams, slotId: number | null): URLSearchParams {
  const nextSearchParams = new URLSearchParams(searchParams);

  if (slotId === null) {
    nextSearchParams.delete(CAMERA_VIEW_QUERY_KEY);
    return nextSearchParams;
  }

  nextSearchParams.set(CAMERA_VIEW_QUERY_KEY, String(slotId + 1));
  return nextSearchParams;
}

export function canEnterCameraView(markers: CameraPositionMarker[], selectedSlotId: number | undefined): boolean {
  if (selectedSlotId === undefined) return false;
  return markers.some((marker) => marker.slotId === selectedSlotId);
}

export function getCameraViewMarker({
  isCameraViewActive,
  markers,
  selectedSlotId,
}: {
  isCameraViewActive: boolean;
  markers: CameraPositionMarker[];
  selectedSlotId: number | undefined;
}): CameraPositionMarker | null {
  if (!isCameraViewActive || selectedSlotId === undefined) return null;
  for (const marker of markers) {
    if (marker.slotId === selectedSlotId) return marker;
  }
  return null;
}
