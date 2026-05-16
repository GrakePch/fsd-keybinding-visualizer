interface ViewportModelInfoInput {
  hasModel: boolean;
  hasRenderableModel: boolean;
}

interface ModelLoadProgressInput {
  loaded: number;
  total: number;
  lengthComputable?: boolean;
}

interface ViewportCanvasInput {
  hasRenderableModel: boolean;
  markerCount: number;
}

export function shouldShowViewportModelInfo({ hasModel, hasRenderableModel }: ViewportModelInfoInput) {
  return hasModel && !hasRenderableModel;
}

export function shouldRenderCameraModelViewer({ hasRenderableModel, markerCount }: ViewportCanvasInput) {
  return hasRenderableModel || markerCount > 0;
}

export function getModelLoadProgressPercent({ loaded, total, lengthComputable = true }: ModelLoadProgressInput) {
  if (!lengthComputable || !isFinite(loaded) || !isFinite(total) || total <= 0) {
    return null;
  }

  return Math.min(100, Math.max(0, Math.round((loaded / total) * 100)));
}
