import { useEffect, useMemo, useState } from "react";
import type { SelectableVehicleModel, VehicleModelEntry, VehicleModelManifest, VehicleModelManifestState } from "../types/vehicleModel";

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
  const baseUrl = trimTrailingSlash(modelBaseUrl.charAt(0) === "/" ? modelBaseUrl : manifest?.baseUrl || modelBaseUrl);
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

export function getSelectableVehicleModels(manifest: VehicleModelManifest | null): SelectableVehicleModel[] {
  return Object.entries(manifest?.models || {})
    .map(([slug, model]) => getSelectableVehicleModelFromEntry(manifest, slug, model))
    .filter((model): model is SelectableVehicleModel => Boolean(model))
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
}

export function getSelectableVehicleModelByClassName(manifest: VehicleModelManifest | null, className: string) {
  const normalizedClassName = className.trim();
  if (!normalizedClassName) return null;

  const slug = manifest?.byClassName?.[normalizedClassName];
  const entry = slug ? manifest?.models?.[slug] : null;
  if (!slug || !entry) return null;

  return getSelectableVehicleModelFromEntry(manifest, slug, entry);
}

function getSelectableVehicleModelFromEntry(manifest: VehicleModelManifest | null, slug: string, model: VehicleModelEntry) {
  if (!model.glb?.trim()) return null;

  const src = getVehicleModelSrc(manifest, { glb: model.glb });
  if (!src) return null;

  const displayName = model.spvName || model.rsiName || model.className || slug;

  return {
    ...model,
    slug,
    displayName,
    glb: model.glb,
    src,
  };
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function trimLeadingSlash(value: string) {
  return value.replace(/^\/+/, "");
}
