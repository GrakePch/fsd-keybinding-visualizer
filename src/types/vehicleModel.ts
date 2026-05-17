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
  glb: string;
  src: string;
};

export type SpvVehicleDimensions = {
  Length: number;
  Width: number;
  Height: number;
};

export type SpvVehicleEntry = {
  ClassName: string;
  Name?: string;
  Dimensions?: Partial<SpvVehicleDimensions>;
};

export type VehicleFallbackBoxModel = {
  visualKind: "box";
  slug: string;
  displayName: string;
  className: string;
  spvClassName: string;
  src: null;
  glb: null;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  bounds: VehicleModelBounds;
};

export type VehicleViewportModel = (SelectableVehicleModel & { visualKind?: "glb"; spvClassName?: string }) | VehicleFallbackBoxModel;

export function isVehicleFallbackBoxModel(model: VehicleViewportModel | null | undefined): model is VehicleFallbackBoxModel {
  return model?.visualKind === "box";
}

export function isVehicleViewportModelRenderable(model: VehicleViewportModel | null | undefined) {
  return Boolean(model?.src || isVehicleFallbackBoxModel(model));
}
