export type CameraFrustumVector3 = [number, number, number];

export type CameraFrustumLineSegment = {
  from: CameraFrustumVector3;
  to: CameraFrustumVector3;
};

export type CameraFrustumInput = {
  cameraPosition: CameraFrustumVector3;
  targetPosition: CameraFrustumVector3;
  fStop: number;
};

export type CameraFrustumAspectRatioId = "4:3" | "16:10" | "16:9" | "21:9" | "32:9";

export type CameraFrustumAspectRatioOption = {
  id: CameraFrustumAspectRatioId;
  label: string;
  value: number;
};

export const CAMERA_FRUSTUM_ASPECT_RATIOS: CameraFrustumAspectRatioOption[] = [
  { id: "4:3", label: "4:3", value: 4 / 3 },
  { id: "16:10", label: "16:10", value: 16 / 10 },
  { id: "16:9", label: "16:9", value: 16 / 9 },
  { id: "21:9", label: "21:9", value: 21 / 9 },
  { id: "32:9", label: "32:9", value: 32 / 9 },
];

export const DEFAULT_CAMERA_FRUSTUM_ASPECT_RATIO_ID: CameraFrustumAspectRatioId = "16:9";

const CAMERA_FRUSTUM_VERTICAL_FOV_DEGREES = 85;
const VECTOR_EPSILON = 1e-9;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function getCameraFrustumAspectRatio(aspectRatioId: string): number {
  return CAMERA_FRUSTUM_ASPECT_RATIOS.find((option) => option.id === aspectRatioId)?.value ?? getCameraFrustumAspectRatio(DEFAULT_CAMERA_FRUSTUM_ASPECT_RATIO_ID);
}

export function getCameraFrustumLineSegments(marker: CameraFrustumInput, aspectRatio: number): CameraFrustumLineSegment[] {
  const cameraPosition = marker.cameraPosition;
  const targetPosition = marker.targetPosition;
  const forward = normalizeVector(subtractVectors(targetPosition, cameraPosition));
  if (!forward) return [];

  const frustumDepth = Math.max(0, marker.fStop);
  if (frustumDepth <= VECTOR_EPSILON) return [];
  const frustumCenter = addVectors(cameraPosition, scaleVector(forward, frustumDepth));

  const upReference: CameraFrustumVector3 = [0, 0, 1];
  const fallbackUpReference: CameraFrustumVector3 = [1, 0, 0];
  const right = normalizeVector(crossVectors(forward, upReference)) ?? normalizeVector(crossVectors(forward, fallbackUpReference));
  if (!right) return [];

  const up = normalizeVector(crossVectors(right, forward));
  if (!up) return [];

  // Star Citizen stores FOV as vertical FOV. Preserve the vertical angle and
  // widen/narrow only the horizontal extent as the monitor aspect ratio changes.
  const halfHeight = Math.tan(toRadians(CAMERA_FRUSTUM_VERTICAL_FOV_DEGREES / 2)) * frustumDepth;
  const safeAspectRatio = isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : getCameraFrustumAspectRatio(DEFAULT_CAMERA_FRUSTUM_ASPECT_RATIO_ID);
  const halfWidth = halfHeight * safeAspectRatio;

  const topLeft = addVectors(frustumCenter, subtractVectors(scaleVector(up, halfHeight), scaleVector(right, halfWidth)));
  const topRight = addVectors(frustumCenter, addVectors(scaleVector(up, halfHeight), scaleVector(right, halfWidth)));
  const bottomRight = addVectors(frustumCenter, subtractVectors(scaleVector(right, halfWidth), scaleVector(up, halfHeight)));
  const bottomLeft = addVectors(frustumCenter, addVectors(scaleVector(right, -halfWidth), scaleVector(up, -halfHeight)));

  return [
    { from: cameraPosition, to: topLeft },
    { from: cameraPosition, to: topRight },
    { from: cameraPosition, to: bottomRight },
    { from: cameraPosition, to: bottomLeft },
    { from: topLeft, to: topRight },
    { from: topRight, to: bottomRight },
    { from: bottomRight, to: bottomLeft },
    { from: bottomLeft, to: topLeft },
  ];
}

function addVectors(left: CameraFrustumVector3, right: CameraFrustumVector3): CameraFrustumVector3 {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function subtractVectors(left: CameraFrustumVector3, right: CameraFrustumVector3): CameraFrustumVector3 {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function scaleVector(vector: CameraFrustumVector3, scale: number): CameraFrustumVector3 {
  return [vector[0] * scale, vector[1] * scale, vector[2] * scale];
}

function crossVectors(left: CameraFrustumVector3, right: CameraFrustumVector3): CameraFrustumVector3 {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}

function vectorLength(vector: CameraFrustumVector3) {
  return Math.sqrt(vector[0] * vector[0] + vector[1] * vector[1] + vector[2] * vector[2]);
}

function normalizeVector(vector: CameraFrustumVector3) {
  const length = vectorLength(vector);
  if (!isFinite(length) || length <= VECTOR_EPSILON) return null;

  return scaleVector(vector, 1 / length);
}
