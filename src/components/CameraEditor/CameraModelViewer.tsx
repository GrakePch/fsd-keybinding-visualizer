import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { SelectableVehicleModel } from "../../types/vehicleModel";
import { getCameraFitFromBounds } from "../../utils/cameraViewport";
import styles from "./CameraModelViewer.module.css";

interface CameraModelViewerProps {
  model: SelectableVehicleModel;
}

type LoadState = "loading" | "ready" | "error";

function CameraModelViewer({ model }: CameraModelViewerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !model.src) {
      setLoadState("error");
      return;
    }

    let disposed = false;
    let animationFrame = 0;
    const scene = new THREE.Scene();
    const cameraFit = getCameraFitFromBounds(model.bounds);
    const camera = new THREE.PerspectiveCamera(45, 1, cameraFit.near, cameraFit.far);
    camera.position.set(...cameraFit.cameraPosition);
    camera.lookAt(...cameraFit.target);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.className = styles.canvas;
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(...cameraFit.target);
    controls.update();

    const ambientLight = new THREE.HemisphereLight(0xffffff, 0x202030, 2.2);
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(1, 2, 3);
    const fillLight = new THREE.DirectionalLight(0x8fb7ff, 1.2);
    fillLight.position.set(-2, 1, -1);
    scene.add(ambientLight, keyLight, fillLight);

    const resize = () => {
      const { clientWidth, clientHeight } = host;
      if (!clientWidth || !clientHeight) return;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight, false);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    setLoadState("loading");
    loader.load(
      model.src,
      (gltf) => {
        if (disposed) return;
        scene.add(gltf.scene);
        setLoadState("ready");
      },
      undefined,
      (error) => {
        if (disposed) return;
        console.warn("Vehicle model failed to load", error);
        setLoadState("error");
      },
    );

    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [model]);

  return (
    <div className={styles.viewer} ref={hostRef}>
      {loadState !== "ready" && (
        <div className={styles.statusOverlay}>
          <span>{loadState === "loading" ? "Loading 3D model…" : "3D model failed to load"}</span>
        </div>
      )}
    </div>
  );
}

export default CameraModelViewer;
