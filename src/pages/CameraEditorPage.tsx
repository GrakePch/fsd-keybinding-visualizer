import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import CameraControlPanel from "../components/CameraEditor/CameraControlPanel";
import CameraFileConsole from "../components/CameraEditor/CameraFileConsole";
import CameraGroupDrawer from "../components/CameraEditor/CameraGroupDrawer";
import CameraModelSelectorPanel from "../components/CameraEditor/CameraModelSelectorPanel";
import CameraViewport from "../components/CameraEditor/CameraViewport";
import { SavedCameraSlot, SavedViewsDocument } from "../types/savedViews";
import type { SelectableVehicleModel } from "../types/vehicleModel";
import { DEFAULT_CAMERA_FRUSTUM_ASPECT_RATIO_ID, type CameraFrustumAspectRatioId } from "../utils/cameraFrustum";
import { canEnterCameraView, getCameraViewSlotIdFromSearchParams, setCameraViewSlotIdInSearchParams } from "../utils/cameraView";
import { getCameraPositionMarkers } from "../utils/cameraViewport";
import { getAutoSelectedVehicleModel } from "../utils/cameraAutoVehicleModel";
import { getDraftModelForGroup, setDraftModelForGroup, type GroupModelDrafts } from "../utils/cameraGroupModelDrafts";
import { copyCameraSlot, createDefaultCameraSlot, getSlotById, updateSavedCameraSlot } from "../utils/savedViews";
import { useSelectableVehicleModels } from "../utils/vehicleModelManifest";
import styles from "./CameraEditorPage.module.css";

function CameraEditorPage() {
  const [savedViews, setSavedViews] = useState<SavedViewsDocument | null>(null);
  const [baselineSavedViewsJson, setBaselineSavedViewsJson] = useState("null");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState(0);
  const [standaloneLoadedModel, setStandaloneLoadedModel] = useState<SelectableVehicleModel | null>(null);
  const [groupModelDrafts, setGroupModelDrafts] = useState<GroupModelDrafts>({});
  const [previewModel, setPreviewModel] = useState<SelectableVehicleModel | null>(null);
  const [isSelectingModel, setIsSelectingModel] = useState(false);
  const [frustumAspectRatioId, setFrustumAspectRatioId] = useState<CameraFrustumAspectRatioId>(DEFAULT_CAMERA_FRUSTUM_ASPECT_RATIO_ID);
  const [searchParams, setSearchParams] = useSearchParams();
  const { models } = useSelectableVehicleModels();

  const cameraViewSlotId = getCameraViewSlotIdFromSearchParams(searchParams);
  const isCameraViewActive = cameraViewSlotId !== null;
  const activeSlotId = cameraViewSlotId ?? selectedSlotId;

  const selectedGroup = useMemo(() => savedViews?.groups.find((group) => group.id === selectedGroupId), [savedViews, selectedGroupId]);
  const selectedSlot = selectedGroup ? getSlotById(selectedGroup, activeSlotId) : undefined;
  const currentSavedViewsJson = JSON.stringify(savedViews);
  const hasSavedViewsChanges = currentSavedViewsJson !== baselineSavedViewsJson;
  const manualGroupModel = selectedGroupId ? getDraftModelForGroup(groupModelDrafts, selectedGroupId) : null;
  const autoGroupModel = selectedGroupId && selectedGroup ? getAutoSelectedVehicleModel(selectedGroup.id, models) : null;
  const loadedModel = selectedGroupId ? manualGroupModel || autoGroupModel : standaloneLoadedModel;
  const viewportModel = isSelectingModel ? previewModel || loadedModel : loadedModel;
  const selectedSlotMarkers = useMemo(() => getCameraPositionMarkers(selectedSlot ? [selectedSlot] : []), [selectedSlot]);
  const canEnterSelectedCameraView = canEnterCameraView(selectedSlotMarkers, activeSlotId);

  const setCameraViewSlotId = useCallback(
    (slotId: number | null, options?: { replace?: boolean }) => {
      setSearchParams(setCameraViewSlotIdInSearchParams(searchParams, slotId), options);
    },
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    if (isCameraViewActive && selectedGroup && !canEnterSelectedCameraView) {
      setCameraViewSlotId(null, { replace: true });
    }
  }, [canEnterSelectedCameraView, isCameraViewActive, selectedGroup, setCameraViewSlotId]);

  const loadSavedViews = (document: SavedViewsDocument) => {
    setSavedViews(document);
    setBaselineSavedViewsJson(JSON.stringify(document));
    setSelectedGroupId(document.groups[0]?.id || "");
    setSelectedSlotId(0);
    setGroupModelDrafts({});
    setPreviewModel(null);
    setIsSelectingModel(false);
    setCameraViewSlotId(null, { replace: true });
  };

  const selectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    setPreviewModel(null);
    setIsSelectingModel(false);
    setCameraViewSlotId(null);
  };

  const selectSlot = (slotId: number) => {
    setSelectedSlotId(slotId);
    if (isCameraViewActive) {
      setCameraViewSlotId(slotId);
    }
  };

  const updateSlot = (slot: SavedCameraSlot) => {
    if (!savedViews || !selectedGroup) return;
    setSavedViews(updateSavedCameraSlot(savedViews, selectedGroup.id, slot));
  };

  const createSelectedSlot = () => {
    updateSlot(createDefaultCameraSlot(activeSlotId));
  };

  const copyIntoSelectedSlot = (sourceSlotId: number) => {
    if (!selectedGroup) return;
    const sourceSlot = getSlotById(selectedGroup, sourceSlotId);
    if (!sourceSlot) return;
    updateSlot(copyCameraSlot(sourceSlot, activeSlotId));
  };

  const openModelSelector = () => {
    setSelectedSlotId(activeSlotId);
    setPreviewModel(loadedModel);
    setIsSelectingModel(true);
  };

  const toggleCameraView = () => {
    if (isCameraViewActive) {
      setSelectedSlotId(activeSlotId);
      setCameraViewSlotId(null);
      return;
    }

    setCameraViewSlotId(activeSlotId);
  };

  const confirmPreviewModel = () => {
    if (previewModel && selectedGroupId) {
      setGroupModelDrafts((drafts) => setDraftModelForGroup(drafts, selectedGroupId, previewModel));
    } else if (previewModel) {
      setStandaloneLoadedModel(previewModel);
    }
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
        onSelectGroup={selectGroup}
      />
      <CameraViewport selectedGroup={selectedGroup} selectedSlot={selectedSlot} model={viewportModel} isPreviewingModel={isSelectingModel} isCameraViewActive={isCameraViewActive} frustumAspectRatioId={frustumAspectRatioId} onSelectSlot={selectSlot} />
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
          selectedSlotId={activeSlotId}
          frustumAspectRatioId={frustumAspectRatioId}
          canEnterCameraView={canEnterSelectedCameraView}
          isCameraViewActive={isCameraViewActive}
          onToggleCameraView={toggleCameraView}
          onSelectSlot={selectSlot}
          onSelectModel={openModelSelector}
          onSelectFrustumAspectRatio={setFrustumAspectRatioId}
          onUpdateSlot={updateSlot}
          onCreateSlot={createSelectedSlot}
          onCopySlot={copyIntoSelectedSlot}
        />
      )}
    </main>
  );
}

export default CameraEditorPage;
