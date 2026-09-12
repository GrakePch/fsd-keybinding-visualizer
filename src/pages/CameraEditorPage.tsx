import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import CameraControlPanel from "../components/CameraEditor/CameraControlPanel";
import CameraFileConsole from "../components/CameraEditor/CameraFileConsole";
import CameraGroupDrawer from "../components/CameraEditor/CameraGroupDrawer";
import CameraReferenceVehiclePanel from "../components/CameraEditor/CameraReferenceVehiclePanel";
import CameraViewport from "../components/CameraEditor/CameraViewport";
import { SavedCameraSlot, SavedViewsDocument } from "../types/savedViews";
import { DEFAULT_CAMERA_FRUSTUM_ASPECT_RATIO_ID, type CameraFrustumAspectRatioId } from "../utils/cameraFrustum";
import { canEnterCameraView, getCameraViewSlotIdFromSearchParams, setCameraViewSlotIdInSearchParams } from "../utils/cameraView";
import { getCameraPositionMarkers } from "../utils/cameraViewport";
import { getVisibleCameraGroups } from "../utils/cameraGroup";
import { getSeatVehicleUsage, getVehicleDisplayName, type SeatVehicleUsage } from "../utils/cameraAutoVehicleModel";
import { getReferenceVehicles, resolveGroupVehicleContext, setGroupVehicleBinding, type GroupVehicleBinding, type GroupVehicleBindings } from "../utils/cameraVehicleBinding";
import { addSavedViewGroup, copyCameraSlot, createDefaultCameraSlot, getSlotById, updateSavedCameraSlot } from "../utils/savedViews";
import { fillEmptySlotsWithSeatViewPreset, resetSlotsToSeatViewPreset } from "../utils/seatViewPreset";
import { useSpvVehicles } from "../utils/spvVehicleData";
import { getSeatVehicleIndex, useSeatsData } from "../utils/seatsData";
import { getThirdPersonCameraConfigForSeat } from "../utils/thirdPersonCameraData";
import { useSelectableVehicleModels } from "../utils/vehicleModelManifest";
import styles from "./CameraEditorPage.module.css";

function CameraEditorPage() {
  const [savedViews, setSavedViews] = useState<SavedViewsDocument | null>(null);
  const [baselineSavedViewsJson, setBaselineSavedViewsJson] = useState("null");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState(0);
  const [groupBindings, setGroupBindings] = useState<GroupVehicleBindings>({});
  const [previewBinding, setPreviewBinding] = useState<GroupVehicleBinding | null>(null);
  const [isSelectingReferenceVehicle, setIsSelectingReferenceVehicle] = useState(false);
  const [frustumAspectRatioId, setFrustumAspectRatioId] = useState<CameraFrustumAspectRatioId>(DEFAULT_CAMERA_FRUSTUM_ASPECT_RATIO_ID);
  const [searchParams, setSearchParams] = useSearchParams();
  const { manifest, loaded: modelsLoaded, error: modelError } = useSelectableVehicleModels();
  const { vehicles: spvVehicles, loaded: spvLoaded, error: spvError } = useSpvVehicles();
  const { seats } = useSeatsData();
  const referenceVehicles = useMemo(() => getReferenceVehicles(manifest, spvVehicles), [manifest, spvVehicles]);
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
  const selectedSeat = selectedGroup ? seatVehicleIndex[selectedGroup.id] : null;
  const selectedSlot = selectedGroup ? getSlotById(selectedGroup, activeSlotId) : undefined;
  const currentSavedViewsJson = JSON.stringify(savedViews);
  const hasSavedViewsChanges = currentSavedViewsJson !== baselineSavedViewsJson;
  const binding = selectedGroupId ? groupBindings[selectedGroupId] || null : null;
  const selectedSeatUsage = selectedGroupId && selectedGroup ? getSeatVehicleUsage(selectedGroup.id, Object.values(seatVehicleIndex), manifest, spvVehicles) : null;
  const autoVehicleId = selectedSeatUsage?.vehicleId || selectedSeat?.vehicleIds[0];
  const seatCameraConfig = getThirdPersonCameraConfigForSeat(selectedSeat, autoVehicleId);
  const contextInput = {
    autoModel: selectedSeatUsage?.model || null,
    autoVehicleId,
    seatCameraConfig,
    vehicles: referenceVehicles,
  };
  const appliedContext = resolveGroupVehicleContext({ ...contextInput, binding });
  const previewContext = resolveGroupVehicleContext({ ...contextInput, binding: previewBinding });
  const viewportContext = isSelectingReferenceVehicle && previewBinding ? previewContext : appliedContext;
  const loadedModel = appliedContext.model;
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
    setGroupBindings({});
    setPreviewBinding(null);
    setIsSelectingReferenceVehicle(false);
    setCameraViewSlotId(null, { replace: true });
  };

  const selectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    setPreviewBinding(null);
    setIsSelectingReferenceVehicle(false);
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
    setPreviewBinding(null);
    setIsSelectingReferenceVehicle(false);
    setCameraViewSlotId(null);
  };

  const deleteGroup = (groupId: string) => {
    if (!savedViews || !savedViews.groups.some((group) => group.id === groupId)) return;

    const remainingGroups = savedViews.groups.filter((group) => group.id !== groupId);
    setSavedViews({ ...savedViews, groups: remainingGroups });
    setGroupBindings((bindings) => setGroupVehicleBinding(bindings, groupId, null));

    if (selectedGroupId !== groupId) return;

    setSelectedGroupId(getVisibleCameraGroups(remainingGroups, "")[0]?.id || "");
    setSelectedSlotId(0);
    setPreviewBinding(null);
    setIsSelectingReferenceVehicle(false);
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

  const toggleCameraView = () => {
    if (isCameraViewActive) {
      setSelectedSlotId(activeSlotId);
      setCameraViewSlotId(null);
      return;
    }

    setCameraViewSlotId(activeSlotId);
  };

  const openReferenceVehicleSelector = () => {
    setSelectedSlotId(activeSlotId);
    setPreviewBinding(binding?.mode === "vehicle-context" ? binding : autoVehicleId ? { mode: "vehicle-context", vehicleId: autoVehicleId } : null);
    setIsSelectingReferenceVehicle(true);
  };

  const confirmPreviewModel = () => {
    if (!previewBinding || previewContext.needsSelection) return;
    if (selectedGroupId) {
      setGroupBindings((bindings) => setGroupVehicleBinding(bindings, selectedGroupId, previewBinding));
    }
    setPreviewBinding(null);
    setIsSelectingReferenceVehicle(false);
  };

  const restoreAutomaticBinding = () => setGroupBindings((bindings) => setGroupVehicleBinding(bindings, selectedGroupId, null));

  const cancelModelSelector = () => {
    setPreviewBinding(null);
    setIsSelectingReferenceVehicle(false);
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
      <CameraViewport selectedGroup={selectedGroup} selectedSlot={selectedSlot} model={viewportContext.model} cameraConfig={viewportContext.cameraConfig} isPreviewingModel={isSelectingReferenceVehicle} isCameraViewActive={isCameraViewActive} frustumAspectRatioId={frustumAspectRatioId} onSelectSlot={selectSlot} />
      {isSelectingReferenceVehicle ? (
        <CameraReferenceVehiclePanel
          vehicles={referenceVehicles}
          selection={previewBinding?.mode === "vehicle-context" ? previewBinding : null}
          loading={!modelsLoaded || !spvLoaded}
          errors={[modelError ? `Models unavailable: ${modelError}` : "", spvError ? `Vehicle sizes unavailable: ${spvError}` : ""].filter(Boolean)}
          onChange={setPreviewBinding}
          onConfirm={confirmPreviewModel}
          onCancel={cancelModelSelector}
        />
      ) : (
        <CameraControlPanel
          loadedModel={loadedModel}
          cameraConfig={appliedContext.cameraConfig}
          referenceContext={selectedGroup && appliedContext.vehicleId ? appliedContext : null}
          hasManualBinding={Boolean(binding)}
          onSelectReferenceVehicle={openReferenceVehicleSelector}
          onRestoreAutomaticBinding={restoreAutomaticBinding}
          selectedGroup={selectedGroup}
          selectedSlot={selectedSlot}
          selectedSlotId={activeSlotId}
          frustumAspectRatioId={frustumAspectRatioId}
          canEnterCameraView={canEnterSelectedCameraView}
          isCameraViewActive={isCameraViewActive}
          onToggleCameraView={toggleCameraView}
          onSelectSlot={selectSlot}
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

export default CameraEditorPage;
