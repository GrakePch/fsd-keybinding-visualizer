import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { SelectableVehicleModel } from "../../types/vehicleModel";
import { getModelLoadProgressPercent } from "../../utils/cameraModelOverlay";
import { getCameraFitFromBounds, getVehicleGridFromBounds, type CameraPositionMarker, type VehicleGrid, VEHICLE_MODEL_METERS_PER_SOURCE_UNIT } from "../../utils/cameraViewport";
import styles from "./CameraModelViewer.module.css";

interface CameraModelViewerProps {
  activeSlotId?: number;
  markers: CameraPositionMarker[];
  model: SelectableVehicleModel;
}

type LoadState = "loading" | "ready" | "error";

const VEHICLE_GRID_LINE_COLOR = 0xc7ccd3;
const VEHICLE_GRID_LINE_OPACITY = 0.42;
const VEHICLE_GRID_SPACING_METERS = 5;

function createVehicleGridLineSegments(grid: VehicleGrid) {
  const halfSpan = grid.span / 2;
  const startX = grid.center[0] - halfSpan;
  const endX = grid.center[0] + halfSpan;
  const startY = grid.center[1] - halfSpan;
  const endY = grid.center[1] + halfSpan;
  const positions: number[] = [];

  for (let offset = 0; offset <= grid.span; offset += VEHICLE_GRID_SPACING_METERS) {
    const x = startX + offset;
    const y = startY + offset;
    positions.push(x, startY, grid.center[2], x, endY, grid.center[2]);
    positions.push(startX, y, grid.center[2], endX, y, grid.center[2]);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color: VEHICLE_GRID_LINE_COLOR,
    transparent: true,
    opacity: VEHICLE_GRID_LINE_OPACITY,
  });

  return new THREE.LineSegments(geometry, material);
}

function CameraModelViewer({ activeSlotId, markers, model }: CameraModelViewerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const markerObjectsRef = useRef<CSS2DObject[]>([]);
  const markerLineObjectsRef = useRef<THREE.Line[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadProgress, setLoadProgress] = useState<number | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !model.src) {
      setLoadState("error");
      return;
    }

    let disposed = false;
    let animationFrame = 0;
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const cameraFit = getCameraFitFromBounds(model.bounds);
    const camera = new THREE.OrthographicCamera(-cameraFit.viewHeight / 2, cameraFit.viewHeight / 2, cameraFit.viewHeight / 2, -cameraFit.viewHeight / 2, cameraFit.near, cameraFit.far);
    camera.up.set(0, 0, 1);
    camera.position.set(...cameraFit.cameraPosition);
    camera.lookAt(...cameraFit.target);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.className = styles.canvas;
    host.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.domElement.className = styles.labelLayer;
    host.appendChild(labelRenderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(...cameraFit.target);
    controls.update();

    const ambientLight = new THREE.HemisphereLight(0xffffff, 0x202030, 2.2);
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(1, 3, 2);
    const fillLight = new THREE.DirectionalLight(0x8fb7ff, 1.2);
    fillLight.position.set(-2, -1, 1);
    scene.add(ambientLight, keyLight, fillLight);

    const vehicleGrid = getVehicleGridFromBounds(model.bounds);
    if (vehicleGrid) {
      scene.add(createVehicleGridLineSegments(vehicleGrid));
    }

    const resize = () => {
      const { clientWidth, clientHeight } = host;
      if (!clientWidth || !clientHeight) return;
      const aspect = clientWidth / clientHeight;
      camera.left = (-cameraFit.viewHeight * aspect) / 2;
      camera.right = (cameraFit.viewHeight * aspect) / 2;
      camera.top = cameraFit.viewHeight / 2;
      camera.bottom = -cameraFit.viewHeight / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight, false);
      labelRenderer.setSize(clientWidth, clientHeight);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    setLoadState("loading");
    setLoadProgress(null);
    loader.load(
      model.src,
      (gltf) => {
        if (disposed) return;
        // Converted GLB assets are Y-up with the ship length on the GLB Z axis.
        // Rotate them into the camera editor's source/saved-view coordinate system:
        // X = lateral, Y = forward/back, Z = vertical/up.
        gltf.scene.rotation.x = Math.PI / 2;
        gltf.scene.scale.setScalar(VEHICLE_MODEL_METERS_PER_SOURCE_UNIT);
        scene.add(gltf.scene);
        setLoadProgress(100);
        setLoadState("ready");
      },
      (event) => {
        if (disposed) return;
        setLoadProgress(getModelLoadProgressPercent(event));
      },
      (error) => {
        if (disposed) return;
        console.warn("Vehicle model failed to load", error);
        setLoadState("error");
      },
    );

    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      markerObjectsRef.current.forEach((markerObject) => markerObject.removeFromParent());
      markerObjectsRef.current = [];
      markerLineObjectsRef.current.forEach((lineObject) => {
        lineObject.geometry.dispose();
        const materials = Array.isArray(lineObject.material) ? lineObject.material : [lineObject.material];
        materials.forEach((material) => material.dispose());
        lineObject.removeFromParent();
      });
      markerLineObjectsRef.current = [];
      if (sceneRef.current === scene) sceneRef.current = null;
      resizeObserver.disconnect();
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      labelRenderer.domElement.remove();
    };
  }, [model]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    markerObjectsRef.current.forEach((markerObject) => markerObject.removeFromParent());
    markerObjectsRef.current = [];
    markerLineObjectsRef.current.forEach((lineObject) => {
      lineObject.geometry.dispose();
      const materials = Array.isArray(lineObject.material) ? lineObject.material : [lineObject.material];
      materials.forEach((material) => material.dispose());
      lineObject.removeFromParent();
    });
    markerLineObjectsRef.current = [];

    markers.forEach((marker) => {
      const isActive = activeSlotId === marker.slotId;
      const cameraElement = document.createElement("div");
      cameraElement.className = `${styles.cameraPositionMarker} ${isActive ? styles.cameraPositionMarkerActive : ""}`;
      cameraElement.textContent = marker.label;
      cameraElement.title = `Slot ${marker.label} camera position`;
      cameraElement.setAttribute("aria-label", `Camera slot ${marker.label} camera position`);
      const cameraMarkerObject = new CSS2DObject(cameraElement);
      cameraMarkerObject.position.set(...marker.cameraPosition);
      scene.add(cameraMarkerObject);
      markerObjectsRef.current.push(cameraMarkerObject);

      if (!isActive) return;

      const targetElement = document.createElement("div");
      targetElement.className = styles.targetOffsetDot;
      targetElement.title = `Slot ${marker.label} target offset`;
      targetElement.setAttribute("aria-label", `Camera slot ${marker.label} target offset`);
      const targetMarkerObject = new CSS2DObject(targetElement);
      targetMarkerObject.position.set(...marker.targetPosition);
      scene.add(targetMarkerObject);
      markerObjectsRef.current.push(targetMarkerObject);

      const lineGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...marker.targetPosition), new THREE.Vector3(...marker.cameraPosition)]);
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, depthTest: false, depthWrite: false, transparent: true, opacity: isActive ? 0.72 : 0.48 });
      const lineObject = new THREE.Line(lineGeometry, lineMaterial);
      lineObject.renderOrder = 10;
      scene.add(lineObject);
      markerLineObjectsRef.current.push(lineObject);
    });

    return () => {
      markerObjectsRef.current.forEach((markerObject) => markerObject.removeFromParent());
      markerObjectsRef.current = [];
      markerLineObjectsRef.current.forEach((lineObject) => {
        lineObject.geometry.dispose();
        const materials = Array.isArray(lineObject.material) ? lineObject.material : [lineObject.material];
        materials.forEach((material) => material.dispose());
        lineObject.removeFromParent();
      });
      markerLineObjectsRef.current = [];
    };
  }, [activeSlotId, markers, model.src]);

  return (
    <div className={styles.viewer} ref={hostRef}>
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
