import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Icon from "@mdi/react";
import { mdiCancel, mdiCheck, mdiCheckboxMarked, mdiDotsVertical, mdiPlus, mdiRestore } from "@mdi/js";
import ConfirmModal from "../ConfirmModal";
import { SavedViewGroup } from "../../types/savedViews";
import type { SeatVehicleEntry } from "../../types/vehicleModel";
import type { SeatVehicleUsage } from "../../utils/cameraAutoVehicleModel";
import { formatCameraGroupName, getVisibleCameraGroups, normalizeGroupSearchText } from "../../utils/cameraGroup";
import styles from "./CameraGroupDrawer.module.css";

interface CameraGroupDrawerProps {
  fileConsole?: ReactNode;
  groups: SavedViewGroup[];
  selectedGroupId: string;
  seats: SeatVehicleEntry[];
  canAddGroup: boolean;
  vehicleNameById?: Record<string, string>;
  seatVehicleUsageByGroupId?: Record<string, SeatVehicleUsage>;
  onAddGroups: (groupIds: string[]) => void;
  onSelectGroup: (groupId: string) => void;
  onSetAllEmptyToPreset: () => void;
  onResetAllGroupsToPreset: () => void;
}

function CameraGroupDrawer({ fileConsole, groups, selectedGroupId, seats, canAddGroup, vehicleNameById = {}, seatVehicleUsageByGroupId = {}, onAddGroups, onSelectGroup, onSetAllEmptyToPreset, onResetAllGroupsToPreset }: CameraGroupDrawerProps) {
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);
  const [isResetAllGroupsOpen, setIsResetAllGroupsOpen] = useState(false);
  const [groupSearch, setGroupSearch] = useState("");
  const moreActionsRef = useRef<HTMLDivElement>(null);
  const visibleGroups = useMemo(() => getVisibleCameraGroups(groups, groupSearch), [groupSearch, groups]);

  useEffect(() => {
    if (!isAddGroupOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsAddGroupOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAddGroupOpen]);

  useEffect(() => {
    if (!isMoreActionsOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!moreActionsRef.current?.contains(event.target as Node)) setIsMoreActionsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isMoreActionsOpen]);

  useEffect(() => {
    if (!isMoreActionsOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMoreActionsOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMoreActionsOpen]);

  return (
    <aside className={styles.drawer} aria-label="Camera group manager">
      {fileConsole}
      <section className={styles.groupsSection}>
        <div className={styles.headingRow}>
          <h2 className={styles.heading}>Groups</h2>
          <div className={styles.headingActions} ref={moreActionsRef}>
            <button
              className={styles.moreActionsButton}
              type="button"
              aria-label="More group actions"
              aria-haspopup="menu"
              aria-expanded={isMoreActionsOpen}
              title={groups.length > 0 ? "More group actions" : "More group actions unavailable"}
              disabled={groups.length === 0}
              onClick={() => setIsMoreActionsOpen((isOpen) => !isOpen)}
            >
              <Icon path={mdiDotsVertical} size="1rem" aria-hidden="true" />
            </button>
            <button
              className={styles.addGroupButton}
              type="button"
              aria-label="Add group"
              title={canAddGroup ? "Add group" : "Add group unavailable"}
              disabled={!canAddGroup}
              onClick={() => setIsAddGroupOpen(true)}
            >
              <Icon path={mdiPlus} size="1rem" aria-hidden="true" />
            </button>
            {isMoreActionsOpen && (
              <div className={styles.actionsMenu} role="menu" aria-label="More group actions">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onSetAllEmptyToPreset();
                    setIsMoreActionsOpen(false);
                  }}
                >
                  Set All Empty Slots to Preset
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsMoreActionsOpen(false);
                    setIsResetAllGroupsOpen(true);
                  }}
                >
                  <Icon path={mdiRestore} size="1rem" aria-hidden="true" />
                  Reset All Groups to Preset
                </button>
              </div>
            )}
          </div>
        </div>
        <label className={styles.groupSearchLabel}>
          <span>Search groups</span>
          <input
            className={styles.groupSearch}
            type="search"
            value={groupSearch}
            onChange={(event) => setGroupSearch(event.target.value)}
            placeholder="Search by group name"
            disabled={groups.length === 0}
          />
        </label>
        {groups.length === 0 ? (
          <p className={styles.emptyState}>Load savedviews.xml to show groups.</p>
        ) : visibleGroups.length === 0 ? (
          <p className={styles.emptyState}>No matching groups.</p>
        ) : (
          <div className={styles.groupList}>
            {visibleGroups.map((group) => (
              <button
                className={`${styles.groupButton} ${group.id === selectedGroupId ? `${styles.groupButtonActive} buttonHighlighted` : ""}`}
                key={group.id}
                type="button"
                onClick={() => onSelectGroup(group.id)}
                title={group.id}
              >
                <span className={styles.groupName}>{formatCameraGroupName(group.id)}</span>
                {seatVehicleUsageByGroupId[group.id] && <span className={styles.usedBy}>@ {seatVehicleUsageByGroupId[group.id].displayName}</span>}
                <span className={styles.slotCount}>{group.slots.length} slots</span>
              </button>
            ))}
          </div>
        )}
      </section>
      {isAddGroupOpen && <AddGroupModal groups={groups} seats={seats} vehicleNameById={vehicleNameById} onAddGroups={(groupIds) => { onAddGroups(groupIds); setIsAddGroupOpen(false); }} onClose={() => setIsAddGroupOpen(false)} />}
      {isResetAllGroupsOpen && (
        <ConfirmModal
          title="Reset all groups?"
          description="This will replace every slot in every group with the Seat View Preset. Existing camera values will be lost."
          confirmLabel="Reset all groups"
          confirmTone="accent"
          confirmIconPath={mdiRestore}
          onConfirm={() => {
            onResetAllGroupsToPreset();
            setIsResetAllGroupsOpen(false);
          }}
          onClose={() => setIsResetAllGroupsOpen(false)}
        />
      )}
    </aside>
  );
}

function AddGroupModal({ groups, seats, vehicleNameById, onAddGroups, onClose }: { groups: SavedViewGroup[]; seats: SeatVehicleEntry[]; vehicleNameById: Record<string, string>; onAddGroups: (groupIds: string[]) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(() => new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);
  const addedGroupIds = useMemo(() => new Set(groups.map((group) => group.id)), [groups]);
  const filteredSeats = useMemo(() => {
    const normalizedQuery = normalizeGroupSearchText(query);
    if (!normalizedQuery) return seats;

    return seats.filter((seat) => {
      const vehicleIds = seat.vehicleIds.join(" ");
      const vehicleNames = seat.vehicleIds.map((vehicleId) => vehicleNameById[vehicleId] || "").join(" ");
      return normalizeGroupSearchText(`${seat.groupId} ${vehicleIds} ${vehicleNames}`).includes(normalizedQuery);
    });
  }, [query, seats, vehicleNameById]);

  const selectableFilteredGroupIds = useMemo(
    () => filteredSeats.filter((seat) => !addedGroupIds.has(seat.groupId)).map((seat) => seat.groupId),
    [addedGroupIds, filteredSeats],
  );
  const selectedFilteredCount = selectableFilteredGroupIds.filter((groupId) => selectedGroupIds.has(groupId)).length;
  const isAllFilteredSelected = selectableFilteredGroupIds.length > 0 && selectedFilteredCount === selectableFilteredGroupIds.length;
  const isPartiallyFilteredSelected = selectedFilteredCount > 0 && !isAllFilteredSelected;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = isPartiallyFilteredSelected;
  }, [isPartiallyFilteredSelected]);

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const toggleAllFiltered = () => {
    setSelectedGroupIds((current) => {
      const next = new Set(current);
      selectableFilteredGroupIds.forEach((groupId) => {
        if (isAllFilteredSelected) next.delete(groupId);
        else next.add(groupId);
      });
      return next;
    });
  };

  const confirmSelection = () => {
    if (selectedGroupIds.size === 0) return;
    onAddGroups([...selectedGroupIds]);
    onClose();
  };

  return (
    <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="add-group-title">
        <div className={styles.modalHeader}>
          <div>
            <h2 id="add-group-title">Add group</h2>
            <p>Select seat groups to add to savedviews.xml.</p>
          </div>
        </div>
        <label className={styles.searchLabel}>
          <span>Search seats</span>
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by group id or vehicle id" />
        </label>
        <div className={styles.seatList}>
          {filteredSeats.length === 0 && <p className={styles.emptyState}>No matching seats.</p>}
          {filteredSeats.map((seat) => {
            const isAdded = addedGroupIds.has(seat.groupId);
            return (
              <label className={`${styles.seatButton} ${isAdded ? styles.seatButtonAdded : ""}`} key={seat.groupId}>
                {isAdded ? (
                  <span className={styles.seatCheckboxIcon} aria-hidden="true"><Icon path={mdiCheckboxMarked} size="1rem" /></span>
                ) : (
                  <input
                    className={styles.seatCheckbox}
                    type="checkbox"
                    checked={selectedGroupIds.has(seat.groupId)}
                    onChange={() => toggleGroup(seat.groupId)}
                    aria-label={`Select ${formatCameraGroupName(seat.groupId)}`}
                  />
                )}
                <span className={styles.seatGroupId}>{formatCameraGroupName(seat.groupId)}</span>
                {seat.vehicleIds[0] && <span className={styles.seatVehicle}>@ {vehicleNameById[seat.vehicleIds[0]] || seat.vehicleIds[0]}</span>}
                {isAdded && <span className={styles.addedLabel}>已添加</span>}
              </label>
            );
          })}
        </div>
        <div className={styles.modalFooter}>
          <label className={styles.selectAllControl}>
            <input ref={selectAllRef} className={styles.selectAllCheckbox} type="checkbox" checked={isAllFilteredSelected} disabled={selectableFilteredGroupIds.length === 0} onChange={toggleAllFiltered} aria-label="Select all filtered seats" aria-checked={isPartiallyFilteredSelected ? "mixed" : isAllFilteredSelected} />
            <span>Select all filtered ({selectedFilteredCount}/{selectableFilteredGroupIds.length})</span>
          </label>
          <div className={styles.modalActions}>
            <button className={styles.modalActionButton} type="button" onClick={onClose}>
              <Icon path={mdiCancel} size="1rem" aria-hidden="true" />
              Cancel
            </button>
            <button className={styles.modalActionButton} type="button" disabled={selectedGroupIds.size === 0} onClick={confirmSelection}>
              <Icon path={mdiCheck} size="1rem" aria-hidden="true" />
              Confirm
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default CameraGroupDrawer;
