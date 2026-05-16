import { GizmoHelper, GizmoViewport } from "@react-three/drei";
import { CAMERA_GIZMO_AXIS_COLORS, CAMERA_GIZMO_LABEL_COLOR, CAMERA_GIZMO_LAYOUT } from "../../../utils/cameraGizmo";

export function CameraGizmo() {
  return (
    <GizmoHelper alignment={CAMERA_GIZMO_LAYOUT.alignment} margin={CAMERA_GIZMO_LAYOUT.margin}>
      <GizmoViewport axisColors={CAMERA_GIZMO_AXIS_COLORS} labelColor={CAMERA_GIZMO_LABEL_COLOR} />
    </GizmoHelper>
  );
}
