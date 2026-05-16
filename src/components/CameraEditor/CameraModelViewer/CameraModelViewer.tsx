import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { CameraScene } from "./CameraScene";
import styles from "./CameraModelViewer.module.css";
import type { CameraModelViewerProps, LoadState } from "./types";

function CameraModelViewer({ activeSlotId, frustumAspectRatio, markers, model }: CameraModelViewerProps) {
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
        <CameraScene activeSlotId={activeSlotId} frustumAspectRatio={frustumAspectRatio} markers={markers} model={model} onLoadProgress={setLoadProgress} onLoadStateChange={setLoadState} />
      </Canvas>
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
