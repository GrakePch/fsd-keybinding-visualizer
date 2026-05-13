import { useMemo, useState } from "react";
import CameraControlPanel from "../components/CameraEditor/CameraControlPanel";
import CameraFileConsole from "../components/CameraEditor/CameraFileConsole";
import CameraGroupDrawer from "../components/CameraEditor/CameraGroupDrawer";
import CameraModelSelectorPanel from "../components/CameraEditor/CameraModelSelectorPanel";
import CameraViewport from "../components/CameraEditor/CameraViewport";
import { SavedCameraSlot, SavedViewsDocument } from "../types/savedViews";
import type { SelectableVehicleModel } from "../types/vehicleModel";
import { copyCameraSlot, createDefaultCameraSlot, getSlotById, updateSavedCameraSlot } from "../utils/savedViews";
import styles from "./CameraEditorPage.module.css";

function CameraEditorPage() {
  const [savedViews, setSavedViews] = useState<SavedViewsDocument | null>(null);
  const [baselineSavedViewsJson, setBaselineSavedViewsJson] = useState("null");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState(0);
  const [loadedModel, setLoadedModel] = useState<SelectableVehicleModel | null>(null);
  const [previewModel, setPreviewModel] = useState<SelectableVehicleModel | null>(null);
  const [isSelectingModel, setIsSelectingModel] = useState(false);

  const selectedGroup = useMemo(() => savedViews?.groups.find((group) => group.id === selectedGroupId), [savedViews, selectedGroupId]);
  const selectedSlot = selectedGroup ? getSlotById(selectedGroup, selectedSlotId) : undefined;
  const currentSavedViewsJson = JSON.stringify(savedViews);
  const hasSavedViewsChanges = currentSavedViewsJson !== baselineSavedViewsJson;
  const viewportModel = isSelectingModel ? previewModel || loadedModel : loadedModel;

  const loadSavedViews = (document: SavedViewsDocument) => {
    setSavedViews(document);
    setBaselineSavedViewsJson(JSON.stringify(document));
    setSelectedGroupId(document.groups[0]?.id || "");
    setSelectedSlotId(0);
  };

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

  const openModelSelector = () => {
    setPreviewModel(loadedModel);
    setIsSelectingModel(true);
  };

  const confirmPreviewModel = () => {
    if (previewModel) setLoadedModel(previewModel);
    setIsSelectingModel(false);
  };

  const cancelModelSelector = () => {
    setPreviewModel(null);
    setIsSelectingModel(false);
  };

  return (
    <main className={styles.page}>
      <CameraGroupDrawer
        fileConsole={<CameraFileConsole savedViews={savedViews} hasChanges={hasSavedViewsChanges} onLoad={(document) => loadSavedViews(document)} onSaved={() => setBaselineSavedViewsJson(JSON.stringify(savedViews))} />}
        groups={savedViews?.groups || []}
        selectedGroupId={selectedGroupId}
        onSelectGroup={setSelectedGroupId}
      />
      <CameraViewport selectedGroup={selectedGroup} selectedSlot={selectedSlot} model={viewportModel} isPreviewingModel={isSelectingModel} />
      {isSelectingModel ? (
        <CameraModelSelectorPanel
          selectedModel={loadedModel}
          previewModel={previewModel}
          onPreviewModel={setPreviewModel}
          onConfirm={confirmPreviewModel}
          onCancel={cancelModelSelector}
        />
      ) : (
        <CameraControlPanel
          loadedModel={loadedModel}
          selectedGroup={selectedGroup}
          selectedSlot={selectedSlot}
          selectedSlotId={selectedSlotId}
          onSelectSlot={setSelectedSlotId}
          onSelectModel={openModelSelector}
          onUpdateSlot={updateSlot}
          onCreateSlot={createSelectedSlot}
          onCopySlot={copyIntoSelectedSlot}
        />
      )}
    </main>
  );
}

export default CameraEditorPage;
