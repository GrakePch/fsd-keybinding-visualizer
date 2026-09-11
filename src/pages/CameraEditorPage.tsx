import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import CameraControlPanel from "../components/CameraEditor/CameraControlPanel";
import CameraFileConsole from "../components/CameraEditor/CameraFileConsole";
import CameraGroupDrawer from "../components/CameraEditor/CameraGroupDrawer";
import CameraModelSelectorPanel from "../components/CameraEditor/CameraModelSelectorPanel";
import CameraViewport from "../components/CameraEditor/CameraViewport";
import { SavedCameraSlot, SavedViewsDocument } from "../types/savedViews";
import type { SelectableVehicleModel, SpvVehicleEntry, VehicleViewportModel } from "../types/vehicleModel";
import { isVehicleFallbackBoxModel } from "../types/vehicleModel";
import { DEFAULT_CAMERA_FRUSTUM_ASPECT_RATIO_ID, type CameraFrustumAspectRatioId } from "../utils/cameraFrustum";
import { canEnterCameraView, getCameraViewSlotIdFromSearchParams, setCameraViewSlotIdInSearchParams } from "../utils/cameraView";
import { getCameraPositionMarkers } from "../utils/cameraViewport";
import { getVisibleCameraGroups } from "../utils/cameraGroup";
import { getSeatVehicleUsage, getSelectableVehicleModelWithSpvBounds, getVehicleDisplayName, type SeatVehicleUsage } from "../utils/cameraAutoVehicleModel";
import { getDraftModelForGroup, setDraftModelForGroup, type GroupModelDrafts } from "../utils/cameraGroupModelDrafts";
import { addSavedViewGroup, copyCameraSlot, createDefaultCameraSlot, getSlotById, updateSavedCameraSlot } from "../utils/savedViews";
import { fillEmptySlotsWithSeatViewPreset, resetSlotsToSeatViewPreset } from "../utils/seatViewPreset";
import { useSpvVehicleIndex, useSpvVehicles } from "../utils/spvVehicleData";
import { getSeatVehicleIndex, useSeatsData } from "../utils/seatsData";
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
  const { manifest } = useSelectableVehicleModels();
  const { vehicles: spvVehicles } = useSpvVehicles();
  const { seats } = useSeatsData();
  const spvVehicleIndex = useSpvVehicleIndex(spvVehicles);
  const seatVehicleIndex = useMemo(() => getSeatVehicleIndex(seats), [seats]);
  const vehicleNameById = useMemo(() => {
    const names: Record<string, string> = {};
    seats.forEach((seat) => seat.vehicleIds.forEach((vehicleId) => { names[vehicleId] = getVehicleDisplayName(vehicleId, manifest, spvVehicles); }));
    return names;
  }, [manifest, seats, spvVehicles]);

  const cameraViewSlotId = getCameraViewSlotIdFromSearchParams(searchParams);
  const isCameraViewActive = cameraViewSlotId !== null;
  const activeSlotId = cameraViewSlotId ?? selectedSlotId;

  const selectedGroup = useMemo(() => savedViews?.groups.find((group) => group.id === selectedGroupId), [savedViews, selectedGroupId]);
  const selectedSlot = selectedGroup ? getSlotById(selectedGroup, activeSlotId) : undefined;
  const currentSavedViewsJson = JSON.stringify(savedViews);
  const hasSavedViewsChanges = currentSavedViewsJson !== baselineSavedViewsJson;
  const manualGroupModel = selectedGroupId ? getDraftModelForGroup(groupModelDrafts, selectedGroupId) : null;
  const selectedSeatUsage = selectedGroupId && selectedGroup ? getSeatVehicleUsage(selectedGroup.id, Object.values(seatVehicleIndex), manifest, spvVehicles) : null;
  const autoGroupModel = selectedSeatUsage?.model || null;
  const loadedModel = selectedGroupId ? getModelWithStableSpvBounds(manualGroupModel, spvVehicleIndex) || autoGroupModel : getModelWithStableSpvBounds(standaloneLoadedModel, spvVehicleIndex);
  const viewportModel = isSelectingModel ? getModelWithStableSpvBounds(previewModel, spvVehicleIndex) || loadedModel : loadedModel;
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

  const addGroups = (groupIds: string[]) => {
    const document = savedViews || { groups: [], originalXmlString: "<SavedViews>\n</SavedViews>\n" };
    const groupIdsToAdd = groupIds.filter((groupId) => !document.groups.some((group) => group.id === groupId));
    if (groupIdsToAdd.length === 0) return;

    const nextDocument = groupIdsToAdd.reduce((currentDocument, groupId) => addSavedViewGroup(currentDocument, groupId), document);
    setSavedViews(nextDocument);
    setSelectedGroupId(groupIdsToAdd[0]);
    setSelectedSlotId(0);
    setPreviewModel(null);
    setIsSelectingModel(false);
    setCameraViewSlotId(null);
  };

  const deleteGroup = (groupId: string) => {
    if (!savedViews || !savedViews.groups.some((group) => group.id === groupId)) return;

    const remainingGroups = savedViews.groups.filter((group) => group.id !== groupId);
    setSavedViews({ ...savedViews, groups: remainingGroups });
    setGroupModelDrafts((drafts) => {
      if (!drafts[groupId]) return drafts;

      const nextDrafts = { ...drafts };
      delete nextDrafts[groupId];
      return nextDrafts;
    });

    if (selectedGroupId !== groupId) return;

    setSelectedGroupId(getVisibleCameraGroups(remainingGroups, "")[0]?.id || "");
    setSelectedSlotId(0);
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

  const setEmptySlotsToPreset = () => {
    if (!savedViews || !selectedGroup) return;

    setSavedViews({
      ...savedViews,
      groups: savedViews.groups.map((group) =>
        group.id === selectedGroup.id ? { ...group, slots: fillEmptySlotsWithSeatViewPreset(group.slots) } : group,
      ),
    });
  };

  const resetSelectedGroupToPreset = () => {
    if (!savedViews || !selectedGroup) return;

    setSavedViews({
      ...savedViews,
      groups: savedViews.groups.map((group) =>
        group.id === selectedGroup.id ? { ...group, slots: resetSlotsToSeatViewPreset() } : group,
      ),
    });
  };

  const setAllEmptySlotsToPreset = () => {
    setSavedViews((currentDocument) => {
      if (!currentDocument) return currentDocument;

      return {
        ...currentDocument,
        groups: currentDocument.groups.map((group) => ({ ...group, slots: fillEmptySlotsWithSeatViewPreset(group.slots) })),
      };
    });
  };

  const resetAllGroupsToPreset = () => {
    setSavedViews((currentDocument) => {
      if (!currentDocument) return currentDocument;

      return {
        ...currentDocument,
        groups: currentDocument.groups.map((group) => ({ ...group, slots: resetSlotsToSeatViewPreset() })),
      };
    });
  };

  const deleteSelectedSlot = () => {
    if (!savedViews || !selectedGroup || !selectedSlot) return;

    const remainingSlots = selectedGroup.slots.filter((slot) => slot.id !== activeSlotId).sort((left, right) => left.id - right.id);
    setSavedViews({
      ...savedViews,
      groups: savedViews.groups.map((group) =>
        group.id === selectedGroup.id ? { ...group, slots: remainingSlots } : group,
      ),
    });

    const nextSlot = remainingSlots.find((slot) => slot.id > activeSlotId) || remainingSlots.at(-1);
    setSelectedSlotId(nextSlot?.id ?? 0);
    if (isCameraViewActive) setCameraViewSlotId(null, { replace: true });
  };

  const openModelSelector = () => {
    setSelectedSlotId(activeSlotId);
    setPreviewModel(loadedModel && !isVehicleFallbackBoxModel(loadedModel) ? loadedModel : null);
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
        seats={seats}
        canAddGroup={true}
        vehicleNameById={vehicleNameById}
        seatVehicleUsageByGroupId={getSeatVehicleUsageByGroupId(savedViews?.groups || [], seatVehicleIndex, manifest, spvVehicles)}
        onAddGroups={addGroups}
        onDeleteGroup={deleteGroup}
        selectedGroupId={selectedGroupId}
        onSelectGroup={selectGroup}
        onSetAllEmptyToPreset={setAllEmptySlotsToPreset}
        onResetAllGroupsToPreset={resetAllGroupsToPreset}
      />
      <CameraViewport selectedGroup={selectedGroup} selectedSlot={selectedSlot} model={viewportModel} isPreviewingModel={isSelectingModel} isCameraViewActive={isCameraViewActive} frustumAspectRatioId={frustumAspectRatioId} onSelectSlot={selectSlot} />
      {isSelectingModel ? (
        <CameraModelSelectorPanel
          selectedModel={loadedModel && !isVehicleFallbackBoxModel(loadedModel) ? loadedModel : null}
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
          onSetEmptyToPreset={setEmptySlotsToPreset}
          onResetAllToPreset={resetSelectedGroupToPreset}
          onDeleteSelectedSlot={deleteSelectedSlot}
        />
      )}
    </main>
  );
}

function getSeatVehicleUsageByGroupId(groups: SavedViewsDocument["groups"], seatVehicleIndex: ReturnType<typeof getSeatVehicleIndex>, manifest: Parameters<typeof getSeatVehicleUsage>[2], vehicles: Parameters<typeof getSeatVehicleUsage>[3]): Record<string, SeatVehicleUsage> {
  return groups.reduce<Record<string, SeatVehicleUsage>>((result, group) => {
    const usage = getSeatVehicleUsage(group.id, Object.values(seatVehicleIndex), manifest, vehicles);
    if (usage) result[group.id] = usage;
    return result;
  }, {});
}

function getModelWithStableSpvBounds(model: SelectableVehicleModel | null, spvVehicleIndex: Record<string, SpvVehicleEntry>): VehicleViewportModel | null {
  if (!model) return null;

  const className = model.className?.trim();
  const spvVehicle = className ? spvVehicleIndex[className] : null;

  return getSelectableVehicleModelWithSpvBounds(model, spvVehicle);
}

export default CameraEditorPage;
