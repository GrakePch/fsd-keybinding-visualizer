export interface SavedViewsDocument {
  groups: SavedViewGroup[];
  originalXmlString: string;
}

export interface SavedViewGroup {
  id: string;
  slots: SavedCameraSlot[];
  rawAttributes: SavedViewAttributes;
}

export interface SavedCameraSlot {
  id: number;
  type: string;
  cameraRotationAngle: Vec3;
  distance: number;
  targetOffset: Vec3;
  lensSize: number;
  fStop: number;
  rawAttributes: SavedViewAttributes;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type SavedViewAttributes = Record<string, string>;
