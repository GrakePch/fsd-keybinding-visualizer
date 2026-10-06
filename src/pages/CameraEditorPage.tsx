import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { useSearchParams } from "react-router-dom";
import CameraControlPanel from "../components/CameraEditor/CameraControlPanel";
import CameraToolbar from "../components/CameraEditor/CameraToolbar";
import CameraGroupsPanel from "../components/CameraEditor/CameraGroupsPanel";
import CameraReferenceVehiclePanel from "../components/CameraEditor/CameraReferenceVehiclePanel";
import CameraViewport from "../components/CameraEditor/CameraViewport";
import { SavedCameraSlot, SavedViewsDocument } from "../types/savedViews";
import { DEFAULT_CAMERA_FRUSTUM_ASPECT_RATIO_ID, type CameraFrustumAspectRatioId } from "../utils/cameraFrustum";
import { canEnterCameraView, getCameraViewSlotIdFromSearchParams, setCameraViewSlotIdInSearchParams } from "../utils/cameraView";
import { getCameraPositionMarkers } from "../utils/cameraViewport";
import { getVisibleCameraGroups } from "../utils/cameraGroup";
import { getSeatVehicleUsage, getVehicleDisplayName, type SeatVehicleUsage } from "../utils/cameraAutoVehicleModel";
import { getReferenceVehicles, resolveGroupVehicleContext, setGroupVehicleBinding, type GroupVehicleBinding } from "../utils/cameraVehicleBinding";
import { cameraHistoryReducer, createCameraHistory, describeCameraSlotChange, getCameraHistorySnapshot, getChangedCameraGroupIds, type CameraEditorSnapshot, type CameraHistorySelection } from "../utils/cameraHistory";
import { addSavedViewGroup, copyCameraSlot, createDefaultCameraSlot, getSlotById, updateSavedCameraSlot } from "../utils/savedViews";
import { fillEmptySlotsWithSeatViewPreset, resetSlotsToSeatViewPreset, type SeatViewPresetContext } from "../utils/seatViewPreset";
import { useSpvVehicles } from "../utils/spvVehicleData";
import { getSeatVehicleIndex, useSeatsData } from "../utils/seatsData";
import { getThirdPersonCameraConfigForSeat } from "../utils/thirdPersonCameraData";
import { useSelectableVehicleModels } from "../utils/vehicleModelManifest";
import styles from "./CameraEditorPage.module.css";

const GROUPS_PANEL_WIDTH_STORAGE_KEY = "fsd-keybinding-visualizer.camera-groups-panel-width";
const LEGACY_GROUPS_PANEL_WIDTH_STORAGE_KEY = "fsd-keybinding-visualizer.camera-group-drawer-width";

function CameraEditorPage() {
  const [history, dispatchHistory] = useReducer(cameraHistoryReducer, undefined, () => createCameraHistory());
  const { document: savedViews, bindings: groupBindings } = getCameraHistorySnapshot(history);
  const editGesture = useRef(0);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState(0);
  const [pendingBinding, setPendingBinding] = useState<GroupVehicleBinding | null>(null);
  const [isSelectingReferenceVehicle, setIsSelectingReferenceVehicle] = useState(false);
  const [frustumAspectRatioId, setFrustumAspectRatioId] = useState<CameraFrustumAspectRatioId>(DEFAULT_CAMERA_FRUSTUM_ASPECT_RATIO_ID);
  const [groupsPanelOpen, setGroupsPanelOpen] = useState(true);
  const [controlPanelOpen, setControlPanelOpen] = useState(true);
  const [groupsPanelWidth, setGroupsPanelWidth] = useState(() => {
    if (typeof window === "undefined") return 288;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    try {
      for (const key of [GROUPS_PANEL_WIDTH_STORAGE_KEY, LEGACY_GROUPS_PANEL_WIDTH_STORAGE_KEY]) {
        const storedWidth = Number(window.localStorage.getItem(key));
        if (Number.isFinite(storedWidth) && storedWidth > 0) {
          return Math.min(40 * rem, Math.max(15 * rem, storedWidth));
        }
      }
    } catch {
      // Keep resizing available when browser storage is disabled.
    }
    return (window.innerWidth <= 900 ? 15 : 18) * rem;
  });
  const [groupsPanelWidthBounds, setGroupsPanelWidthBounds] = useState({ min: 240, max: 640 });
  const effectiveGroupsPanelWidth = Math.min(groupsPanelWidthBounds.max, Math.max(groupsPanelWidthBounds.min, groupsPanelWidth));
  const [isGroupsPanelResizing, setIsGroupsPanelResizing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const controlPanelRef = useRef<HTMLDivElement | null>(null);
  const groupsResizeGesture = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { manifest, loaded: modelsLoaded, error: modelError } = useSelectableVehicleModels();
  const { vehicles: spvVehicles, loaded: spvLoaded, error: spvError } = useSpvVehicles();
  const { seats } = useSeatsData();

  useEffect(() => {
    try {
      window.localStorage.setItem(GROUPS_PANEL_WIDTH_STORAGE_KEY, String(groupsPanelWidth));
      window.localStorage.removeItem(LEGACY_GROUPS_PANEL_WIDTH_STORAGE_KEY);
    } catch {
      // Storage failures should not interrupt panel interaction.
    }
  }, [groupsPanelWidth]);

  const getGroupsPanelWidthBounds = useCallback(() => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const min = 15 * rem;
    const availableWidth = contentRef.current?.clientWidth ?? window.innerWidth;
    const controlWidth = controlPanelOpen ? controlPanelRef.current?.getBoundingClientRect().width ?? 0 : 0;
    const max = Math.max(min, Math.min(40 * rem, availableWidth - controlWidth - 16 * rem));
    return { min, max };
  }, [controlPanelOpen]);

  const clampGroupsPanelWidth = useCallback((width: number) => {
    const { min, max } = getGroupsPanelWidthBounds();
    return Math.min(max, Math.max(min, width));
  }, [getGroupsPanelWidthBounds]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const observer = new ResizeObserver(() => {
      const bounds = getGroupsPanelWidthBounds();
      setGroupsPanelWidthBounds(current => current.min === bounds.min && current.max === bounds.max ? current : bounds);
    });
    observer.observe(content);
    if (controlPanelRef.current) observer.observe(controlPanelRef.current);
    return () => observer.disconnect();
  }, [getGroupsPanelWidthBounds]);

  const endGroupsPanelResize = useCallback(() => {
    groupsResizeGesture.current = null;
    setIsGroupsPanelResizing(false);
  }, []);

  useEffect(() => {
    if (!isGroupsPanelResizing) return;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("blur", endGroupsPanelResize);
    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("blur", endGroupsPanelResize);
    };
  }, [endGroupsPanelResize, isGroupsPanelResizing]);

  const startGroupsPanelResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || groupsResizeGesture.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    groupsResizeGesture.current = { pointerId: event.pointerId, startX: event.clientX, startWidth: effectiveGroupsPanelWidth };
    setIsGroupsPanelResizing(true);
  };

  const moveGroupsPanelResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = groupsResizeGesture.current;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    setGroupsPanelWidth(clampGroupsPanelWidth(gesture.startWidth + event.clientX - gesture.startX));
  };

  const finishGroupsPanelResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== groupsResizeGesture.current?.pointerId) return;
    endGroupsPanelResize();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
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
  const dirtyGroupIds = useMemo(() => getChangedCameraGroupIds(savedViews, history.baseline), [savedViews, history.baseline]);
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
  const pendingContext = resolveGroupVehicleContext({ ...contextInput, binding: pendingBinding });
  const loadedModel = appliedContext.model;

  const getPresetContextForGroup = (groupId: string): SeatViewPresetContext => {
    const seat = seatVehicleIndex[groupId];
    const usage = getSeatVehicleUsage(groupId, Object.values(seatVehicleIndex), manifest, spvVehicles);
    const autoVehicleId = usage?.vehicleId || seat?.vehicleIds[0];
    const context = resolveGroupVehicleContext({
      autoModel: usage?.model || null,
      autoVehicleId,
      seatCameraConfig: getThirdPersonCameraConfigForSeat(seat, autoVehicleId),
      vehicles: referenceVehicles,
      binding: groupBindings[groupId] || null,
    });

    return { cameraConfig: context.cameraConfig, modelBounds: context.model?.bounds };
  };

  const selectedPresetContext = selectedGroup ? getPresetContextForGroup(selectedGroup.id) : {};
  const selectedSlotMarkers = useMemo(() => getCameraPositionMarkers(selectedSlot ? [selectedSlot] : []), [selectedSlot]);
  const canEnterSelectedCameraView = canEnterCameraView(selectedSlotMarkers, activeSlotId);

  const setCameraViewSlotId = useCallback(
    (slotId: number | null, options?: { replace?: boolean }) => {
      setSearchParams(setCameraViewSlotIdInSearchParams(searchParams, slotId), options);
    },
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    if (isCameraViewActive && (!selectedGroup || !canEnterSelectedCameraView)) {
      setCameraViewSlotId(null, { replace: true });
    }
  }, [canEnterSelectedCameraView, isCameraViewActive, selectedGroup, setCameraViewSlotId]);

  const loadSavedViews = (document: SavedViewsDocument) => {
    dispatchHistory({ type: "load", document });
    editGesture.current += 1;
    setSelectedGroupId(document.groups[0]?.id || "");
    setSelectedSlotId(0);
    setPendingBinding(null);
    setIsSelectingReferenceVehicle(false);
    setCameraViewSlotId(null, { replace: true });
  };

  const selectGroup = (groupId: string) => {
    editGesture.current += 1;
    setSelectedGroupId(groupId);
    setPendingBinding(null);
    setIsSelectingReferenceVehicle(false);
    setCameraViewSlotId(null);
  };

  const recordEdit = (label: string, after: CameraEditorSnapshot, afterSelection: CameraHistorySelection = { groupId: selectedGroupId, slotId: activeSlotId }, mergeKey?: string) => {
    const before = getCameraHistorySnapshot(history);
    const changedIds = getChangedCameraGroupIds(after.document, before.document);
    for (const groupId of new Set([...Object.keys(before.bindings), ...Object.keys(after.bindings)])) {
      if (JSON.stringify(before.bindings[groupId]) !== JSON.stringify(after.bindings[groupId])) changedIds.add(groupId);
    }
    dispatchHistory({ type: "edit", mergeKey, entry: {
      label, groupIds: [...changedIds], before, after,
      beforeSelection: { groupId: selectedGroupId, slotId: activeSlotId }, afterSelection,
    } });
  };

  const travelHistory = useCallback((cursor: number) => {
    if (cursor < 0 || cursor > history.entries.length || cursor === history.cursor) return;
    const selection = cursor < history.cursor ? history.entries[cursor].beforeSelection : history.entries[cursor - 1].afterSelection;
    dispatchHistory({ type: "travel", cursor });
    editGesture.current += 1;
    setSelectedGroupId(selection.groupId);
    setSelectedSlotId(selection.slotId);
    setPendingBinding(null);
    setIsSelectingReferenceVehicle(false);
    setCameraViewSlotId(null, { replace: true });
  }, [history.cursor, history.entries, setCameraViewSlotId]);

  const addGroups = (groupIds: string[]) => {
    const document = savedViews || { groups: [], originalXmlString: "<SavedViews>\n</SavedViews>\n" };
    const groupIdsToAdd = groupIds.filter((groupId) => !document.groups.some((group) => group.id === groupId));
    if (groupIdsToAdd.length === 0) return;

    const nextDocument = groupIdsToAdd.reduce((currentDocument, groupId) => addSavedViewGroup(currentDocument, groupId), document);
    recordEdit(`Add ${groupIdsToAdd.length} group${groupIdsToAdd.length === 1 ? "" : "s"}`, { document: nextDocument, bindings: groupBindings }, { groupId: groupIdsToAdd[0], slotId: 0 });
    setSelectedGroupId(groupIdsToAdd[0]);
    setSelectedSlotId(0);
    setPendingBinding(null);
    setIsSelectingReferenceVehicle(false);
    setCameraViewSlotId(null);
  };

  const deleteGroup = (groupId: string) => {
    if (!savedViews || !savedViews.groups.some((group) => group.id === groupId)) return;

    const remainingGroups = savedViews.groups.filter((group) => group.id !== groupId);
    const nextGroupId = selectedGroupId === groupId ? getVisibleCameraGroups(remainingGroups, "")[0]?.id || "" : selectedGroupId;
    recordEdit("Delete group", { document: { ...savedViews, groups: remainingGroups }, bindings: setGroupVehicleBinding(groupBindings, groupId, null) }, { groupId: nextGroupId, slotId: selectedGroupId === groupId ? 0 : activeSlotId });

    if (selectedGroupId !== groupId) return;

    setSelectedGroupId(nextGroupId);
    setSelectedSlotId(0);
    setPendingBinding(null);
    setIsSelectingReferenceVehicle(false);
    setCameraViewSlotId(null);
  };

  const selectSlot = (slotId: number) => {
    editGesture.current += 1;
    setSelectedSlotId(slotId);
    if (isCameraViewActive) {
      setCameraViewSlotId(slotId);
    }
  };

  const updateSlot = (slot: SavedCameraSlot, label?: string) => {
    if (!savedViews || !selectedGroup) return;
    const change = describeCameraSlotChange(getSlotById(selectedGroup, slot.id), slot);
    recordEdit(label || change.label, { document: updateSavedCameraSlot(savedViews, selectedGroup.id, slot), bindings: groupBindings }, undefined,
      label ? undefined : `${editGesture.current}:${selectedGroup.id}:${slot.id}:${change.fields}`);
  };

  const createSelectedSlot = () => {
    updateSlot(createDefaultCameraSlot(activeSlotId), `Create slot ${activeSlotId + 1}`);
  };

  const copyIntoSelectedSlot = (sourceSlotId: number) => {
    if (!selectedGroup) return;
    const sourceSlot = getSlotById(selectedGroup, sourceSlotId);
    if (!sourceSlot) return;
    updateSlot(copyCameraSlot(sourceSlot, activeSlotId), `Copy slot ${sourceSlotId + 1} to slot ${activeSlotId + 1}`);
  };

  const setEmptySlotsToPreset = () => {
    if (!savedViews || !selectedGroup) return;

    recordEdit("Fill empty slots with preset", { document: {
      ...savedViews,
      groups: savedViews.groups.map((group) =>
        group.id === selectedGroup.id ? { ...group, slots: fillEmptySlotsWithSeatViewPreset(group.slots, selectedPresetContext) } : group,
      ),
    }, bindings: groupBindings });
  };

  const resetSelectedGroupToPreset = () => {
    if (!savedViews || !selectedGroup) return;

    recordEdit("Reset group to preset", { document: {
      ...savedViews,
      groups: savedViews.groups.map((group) =>
        group.id === selectedGroup.id ? { ...group, slots: resetSlotsToSeatViewPreset(selectedPresetContext) } : group,
      ),
    }, bindings: groupBindings });
  };

  const setAllEmptySlotsToPreset = () => {
    if (!savedViews) return;
    recordEdit("Fill empty slots in all groups", { document: {
      ...savedViews,
      groups: savedViews.groups.map((group) => ({ ...group, slots: fillEmptySlotsWithSeatViewPreset(group.slots, getPresetContextForGroup(group.id)) })),
    }, bindings: groupBindings });
  };

  const resetAllGroupsToPreset = () => {
    if (!savedViews) return;
    recordEdit("Reset all groups to preset", { document: {
      ...savedViews,
      groups: savedViews.groups.map((group) => ({ ...group, slots: resetSlotsToSeatViewPreset(getPresetContextForGroup(group.id)) })),
    }, bindings: groupBindings });
  };

  const deleteSelectedSlot = () => {
    if (!savedViews || !selectedGroup || !selectedSlot) return;

    const remainingSlots = selectedGroup.slots.filter((slot) => slot.id !== activeSlotId).sort((left, right) => left.id - right.id);
    const nextSlot = remainingSlots.find((slot) => slot.id > activeSlotId) || remainingSlots.at(-1);
    recordEdit(`Delete slot ${activeSlotId + 1}`, { document: {
      ...savedViews,
      groups: savedViews.groups.map((group) =>
        group.id === selectedGroup.id ? { ...group, slots: remainingSlots } : group,
      ),
    }, bindings: groupBindings }, { groupId: selectedGroup.id, slotId: nextSlot?.id ?? 0 });
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
    setPendingBinding(binding);
    setIsSelectingReferenceVehicle(true);
  };

  const applyReferenceVehicle = () => {
    if (!selectedGroupId || pendingContext.needsSelection) return;
    recordEdit(pendingBinding ? "Change reference vehicle (preview only)" : "Restore automatic association (preview only)", { document: savedViews, bindings: setGroupVehicleBinding(groupBindings, selectedGroupId, pendingBinding) });
    setPendingBinding(null);
    setIsSelectingReferenceVehicle(false);
  };

  const restoreAutomaticBinding = () => {
    setPendingBinding(null);
  };

  const cancelModelSelector = () => {
    setPendingBinding(null);
    setIsSelectingReferenceVehicle(false);
  };

  return (
    <main className={styles.page}>
      <CameraToolbar
        savedViews={savedViews} history={history} dirtyGroupIds={dirtyGroupIds}
        onLoad={loadSavedViews}
        onSaved={(document) => dispatchHistory({ type: "saved", document, session: history.session })}
        onTravel={travelHistory}
        groupsPanelOpen={groupsPanelOpen} controlPanelOpen={controlPanelOpen}
        onToggleGroupsPanel={() => { endGroupsPanelResize(); setGroupsPanelOpen(open => !open); }}
        onToggleControlPanel={() => setControlPanelOpen(open => !open)}
        aspectRatioId={frustumAspectRatioId} onSelectAspectRatio={setFrustumAspectRatioId}
      />
      <div ref={contentRef} className={styles.content} data-groups-panel-open={groupsPanelOpen} data-control-panel-open={controlPanelOpen} data-groups-panel-resizing={isGroupsPanelResizing} style={{ "--group-width": `${effectiveGroupsPanelWidth}px` } as CSSProperties}>
      <div id="camera-groups-panel" className={styles.sidePanel} aria-hidden={!groupsPanelOpen} ref={panel => { if (panel) panel.inert = !groupsPanelOpen; }}>
      <CameraGroupsPanel
        groups={savedViews?.groups || []}
        dirtyGroupIds={dirtyGroupIds}
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
      <div
        className={styles.groupsResizeHandle}
        role="separator"
        aria-label="Resize groups panel"
        aria-orientation="vertical"
        aria-controls="camera-groups-panel"
        aria-valuemin={Math.round(groupsPanelWidthBounds.min)}
        aria-valuemax={Math.round(groupsPanelWidthBounds.max)}
        aria-valuenow={Math.round(effectiveGroupsPanelWidth)}
        aria-valuetext={`${Math.round(effectiveGroupsPanelWidth)} pixels`}
        tabIndex={groupsPanelOpen ? 0 : -1}
        onPointerDown={startGroupsPanelResize}
        onPointerMove={moveGroupsPanelResize}
        onPointerUp={finishGroupsPanelResize}
        onPointerCancel={finishGroupsPanelResize}
        onLostPointerCapture={finishGroupsPanelResize}
        onKeyDown={event => {
          const { min, max } = getGroupsPanelWidthBounds();
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const step = event.shiftKey ? 40 : 10;
          setGroupsPanelWidth(clampGroupsPanelWidth(event.key === "Home" ? min : event.key === "End" ? max : effectiveGroupsPanelWidth + (event.key === "ArrowLeft" ? -step : step)));
        }}
      />
      </div>
      <CameraViewport selectedGroup={selectedGroup} selectedSlot={selectedSlot} model={appliedContext.model} cameraConfig={appliedContext.cameraConfig} referenceModelName={selectedGroup && appliedContext.vehicleId ? appliedContext.displayName : null} onSelectReferenceVehicle={openReferenceVehicleSelector} isCameraViewActive={isCameraViewActive} frustumAspectRatioId={frustumAspectRatioId} onSelectSlot={selectSlot} />
      <div id="camera-control-panel" className={styles.sidePanel} aria-hidden={!controlPanelOpen} ref={panel => { controlPanelRef.current = panel; if (panel) panel.inert = !controlPanelOpen; }}>
        <CameraControlPanel
          key={`${selectedGroupId}:${activeSlotId}`}
          onEditBoundary={() => { editGesture.current += 1; }}
          loadedModel={loadedModel}
          cameraConfig={appliedContext.cameraConfig}
          selectedGroup={selectedGroup}
          selectedSlot={selectedSlot}
          selectedSlotId={activeSlotId}
          canEnterCameraView={canEnterSelectedCameraView}
          isCameraViewActive={isCameraViewActive}
          onToggleCameraView={toggleCameraView}
          onSelectSlot={selectSlot}
          onUpdateSlot={updateSlot}
          onCreateSlot={createSelectedSlot}
          onCopySlot={copyIntoSelectedSlot}
          onSetEmptyToPreset={setEmptySlotsToPreset}
          onResetAllToPreset={resetSelectedGroupToPreset}
          onDeleteSelectedSlot={deleteSelectedSlot}
        />
      </div>
      </div>
      {isSelectingReferenceVehicle && (
        <CameraReferenceVehiclePanel
          vehicles={referenceVehicles}
          hasManualBinding={Boolean(binding)}
          onRestoreAutomaticBinding={restoreAutomaticBinding}
          isAutomaticSelection={pendingBinding === null}
          automaticContext={resolveGroupVehicleContext({ ...contextInput, binding: null })}
          selection={pendingBinding || (autoVehicleId ? { mode: "vehicle-context", vehicleId: autoVehicleId } : null)}
          loading={!modelsLoaded || !spvLoaded}
          errors={[modelError ? `Models unavailable: ${modelError}` : "", spvError ? `Vehicle sizes unavailable: ${spvError}` : ""].filter(Boolean)}
          onChange={setPendingBinding}
          onConfirm={applyReferenceVehicle}
          onCancel={cancelModelSelector}
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
