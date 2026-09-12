import type { Vec3 } from "./savedViews";

export type ThirdPersonCameraDistanceConfig = {
  initialDistance: number;
  minDistance: number;
  maxDistance: number;
};

export type ThirdPersonCameraTargetOffsetConfig = {
  targetPositionOffset: Vec3;
  userTargetOffsetMin: Vec3;
  userTargetOffsetMax: Vec3;
};

export type ThirdPersonCameraBaseConfig = {
  distanceConfig: ThirdPersonCameraDistanceConfig;
  targetOffsetConfig: ThirdPersonCameraTargetOffsetConfig;
};

export type ThirdPersonCameraEntry = {
  cameraId: string;
  baseConfig: ThirdPersonCameraBaseConfig;
};
