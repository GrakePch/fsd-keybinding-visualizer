import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { CameraScene } from "./CameraScene";
import styles from "./CameraModelViewer.module.css";
import type { CameraModelViewerProps, LoadState } from "./types";

function CameraViewMask({ aspectRatio }: { aspectRatio: number }) {
  const safeAspectRatio = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 16 / 9;
  const maskPadding = 1000;
  const outerRight = safeAspectRatio + maskPadding;
  const outerBottom = 1 + maskPadding;
  const maskPath = `M ${-maskPadding} ${-maskPadding} H ${outerRight} V ${outerBottom} H ${-maskPadding} Z M 0 0 H ${safeAspectRatio} V 1 H 0 Z`;

  return (
    <svg className={styles.cameraViewMask} viewBox={`0 0 ${safeAspectRatio} 1`} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
      <path d={maskPath} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

function CameraModelViewer({ activeSlotId, cameraViewMarker, frustumAspectRatio, maxCameraMarkerDistance, markers, model, targetOffsetBounds, onSelectSlot }: CameraModelViewerProps) {
  const [loadState, setLoadState] = useState<LoadState>(model?.src ? "loading" : "ready");
  const [loadProgress, setLoadProgress] = useState<number | null>(null);

  useEffect(() => {
    if (model?.src) return;
    setLoadState("ready");
    setLoadProgress(null);
  }, [model?.src]);

  return (
    <div className={styles.viewer}>
      <Canvas className={styles.canvas} gl={{ alpha: true, antialias: true }} dpr={[1, 2]}>
        <CameraScene activeSlotId={activeSlotId} cameraViewMarker={cameraViewMarker} frustumAspectRatio={frustumAspectRatio} maxCameraMarkerDistance={maxCameraMarkerDistance} markers={markers} model={model} targetOffsetBounds={targetOffsetBounds} onSelectSlot={onSelectSlot} onLoadProgress={setLoadProgress} onLoadStateChange={setLoadState} />
      </Canvas>
      {cameraViewMarker && <CameraViewMask aspectRatio={frustumAspectRatio} />}
      {loadState !== "ready" && (
        <div className={styles.statusOverlay}>
          <div className={styles.statusCard}>
            <span>{loadState === "loading" ? "Loading 3D model…" : "3D model failed to load"}</span>
            {loadState === "loading" && (
              <div className={styles.progressTrack} role="progressbar" aria-label="3D model loading progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={loadProgress ?? undefined}>
                <div className={styles.progressFill} style={{ width: `${loadProgress ?? 12}%` }} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CameraModelViewer;
