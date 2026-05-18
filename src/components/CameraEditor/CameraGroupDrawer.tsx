import { ReactNode } from "react";
import { SavedViewGroup } from "../../types/savedViews";
import styles from "./CameraGroupDrawer.module.css";

interface CameraGroupDrawerProps {
  fileConsole?: ReactNode;
  groups: SavedViewGroup[];
  selectedGroupId: string;
  onSelectGroup: (groupId: string) => void;
}

function formatCameraGroupName(groupId: string) {
  return groupId.replaceAll("_", " ");
}

function CameraGroupDrawer({ fileConsole, groups, selectedGroupId, onSelectGroup }: CameraGroupDrawerProps) {
  return (
    <aside className={styles.drawer} aria-label="Camera group manager">
      {fileConsole}
      <section className={styles.groupsSection}>
        <h2 className={styles.heading}>Groups</h2>
        {groups.length === 0 ? (
          <p className={styles.emptyState}>Load savedviews.xml to show groups.</p>
        ) : (
          <div className={styles.groupList}>
            {groups.map((group) => (
              <button
                className={`${styles.groupButton} ${group.id === selectedGroupId ? `${styles.groupButtonActive} buttonHighlighted` : ""}`}
                key={group.id}
                type="button"
                onClick={() => onSelectGroup(group.id)}
                title={group.id}
              >
                <span className={styles.groupName}>{formatCameraGroupName(group.id)}</span>
                <span className={styles.slotCount}>{group.slots.length} slots</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </aside>
  );
}

export default CameraGroupDrawer;
