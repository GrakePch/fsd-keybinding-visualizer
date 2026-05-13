export type VehicleModelBounds = {
  center: [number, number, number];
  size: [number, number, number];
  radius: number;
};

export type VehicleModelEntry = {
  className?: string;
  spvName?: string;
  rsiName?: string;
  rsiPageUrl?: string;
  ctmUrl?: string;
  glb?: string;
  bounds?: VehicleModelBounds | null;
};

export type VehicleModelManifest = {
  schemaVersion?: number;
  generatedAt?: string;
  baseUrl?: string;
  byClassName?: Record<string, string>;
  models?: Record<string, VehicleModelEntry>;
};

export type VehicleModelManifestState = {
  loaded: boolean;
  manifest: VehicleModelManifest | null;
  error: string | null;
};

export type SelectableVehicleModel = VehicleModelEntry & {
  slug: string;
  displayName: string;
  src: string | null;
};
