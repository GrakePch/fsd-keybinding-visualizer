import { useEffect, useMemo, useState } from "react";
import type { SelectableVehicleModel, VehicleModelManifest, VehicleModelManifestState } from "../types/vehicleModel";

const REMOTE_MODEL_BASE_URL = "https://rsi-website-models.42kit.com/vehicles";
const DEV_MODEL_BASE_URL = "/vehicle-models";
const configuredModelBaseUrl =
  (import.meta.env.VITE_VEHICLE_MODELS_BASE_URL as string | undefined) ||
  (import.meta.env.DEV ? DEV_MODEL_BASE_URL : REMOTE_MODEL_BASE_URL);
const modelBaseUrl = trimTrailingSlash(configuredModelBaseUrl);

let manifestCache: VehicleModelManifestState | null = null;
let manifestPromise: Promise<VehicleModelManifest | null> | null = null;
let manifestError: string | null = null;

export function useVehicleModelManifest() {
  const [manifestState, setManifestState] = useState<VehicleModelManifestState>(
    manifestCache ?? { loaded: false, manifest: null, error: null },
  );

  useEffect(() => {
    let active = true;

    loadVehicleModelManifest().then((manifest) => {
      if (active) {
        setManifestState({ loaded: true, manifest, error: manifestError });
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return manifestState;
}

export function useSelectableVehicleModels() {
  const manifestState = useVehicleModelManifest();
  const models = useMemo(() => getSelectableVehicleModels(manifestState.manifest), [manifestState.manifest]);

  return { ...manifestState, models };
}

export function getVehicleModelSrc(manifest: VehicleModelManifest | null, model: Pick<SelectableVehicleModel, "glb"> | null) {
  if (!model?.glb) return null;
  const baseUrl = trimTrailingSlash(manifest?.baseUrl || modelBaseUrl);
  return `${baseUrl}/${trimLeadingSlash(model.glb)}`;
}

function loadVehicleModelManifest() {
  if (!manifestPromise) {
    manifestPromise = fetch(`${modelBaseUrl}/manifest.json`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Vehicle model manifest request failed: ${response.status}`);
        }

        return response.json() as Promise<VehicleModelManifest>;
      })
      .then((manifest) => {
        manifestError = null;
        manifestCache = { loaded: true, manifest, error: null };
        return manifest;
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Vehicle model manifest request failed.";
        console.warn(error);
        manifestError = message;
        manifestCache = { loaded: true, manifest: null, error: message };
        return null;
      });
  }

  return manifestPromise;
}

function getSelectableVehicleModels(manifest: VehicleModelManifest | null): SelectableVehicleModel[] {
  return Object.entries(manifest?.models || {})
    .map(([slug, model]) => {
      const displayName = model.spvName || model.rsiName || model.className || slug;

      return {
        ...model,
        slug,
        displayName,
        src: getVehicleModelSrc(manifest, model),
      };
    })
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function trimLeadingSlash(value: string) {
  return value.replace(/^\/+/, "");
}
