import { useMemo, useState } from "react";
import CameraControlPanel from "../components/CameraEditor/CameraControlPanel";
import CameraGroupDrawer from "../components/CameraEditor/CameraGroupDrawer";
import CameraViewport from "../components/CameraEditor/CameraViewport";
import { SavedCameraSlot, SavedViewsDocument } from "../types/savedViews";
import { copyCameraSlot, createDefaultCameraSlot, getSlotById, updateSavedCameraSlot } from "../utils/savedViews";
import styles from "./CameraEditorPage.module.css";

function CameraEditorPage() {
  const [savedViews, setSavedViews] = useState<SavedViewsDocument | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState(0);
  const loadedModel = null;

  const selectedGroup = useMemo(() => savedViews?.groups.find((group) => group.id === selectedGroupId), [savedViews, selectedGroupId]);
  const selectedSlot = selectedGroup ? getSlotById(selectedGroup, selectedSlotId) : undefined;

  const updateSlot = (slot: SavedCameraSlot) => {
    if (!savedViews || !selectedGroup) return;
    setSavedViews(updateSavedCameraSlot(savedViews, selectedGroup.id, slot));
  };

  const createSelectedSlot = () => {
    updateSlot(createDefaultCameraSlot(selectedSlotId));
  };

  const copyIntoSelectedSlot = (sourceSlotId: number) => {
    if (!selectedGroup) return;
    const sourceSlot = getSlotById(selectedGroup, sourceSlotId);
    if (!sourceSlot) return;
    updateSlot(copyCameraSlot(sourceSlot, selectedSlotId));
  };

  return (
    <main className={styles.page}>
      <CameraGroupDrawer groups={savedViews?.groups || []} selectedGroupId={selectedGroupId} onSelectGroup={setSelectedGroupId} />
      <CameraViewport selectedGroup={selectedGroup} selectedSlot={selectedSlot} />
      <CameraControlPanel
        loadedModel={loadedModel}
        selectedGroup={selectedGroup}
        selectedSlot={selectedSlot}
        selectedSlotId={selectedSlotId}
        onSelectSlot={setSelectedSlotId}
        onUpdateSlot={updateSlot}
        onCreateSlot={createSelectedSlot}
        onCopySlot={copyIntoSelectedSlot}
      />
    </main>
  );
}

export default CameraEditorPage;
