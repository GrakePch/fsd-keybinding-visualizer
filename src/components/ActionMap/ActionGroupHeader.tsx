import Icon from "@mdi/react";
import { mdiChevronRight } from "@mdi/js";
import type { AppLanguage } from "../../contexts";
import type { ActionGroup } from "../../interfaces";
import { i18nUI } from "../../utils/utils";
import styles from "./ActionGroupHeader.module.css";

type ActionGroupHeaderProps = {
  group: ActionGroup;
  isExpanded: boolean;
  language: AppLanguage;
  onToggle: () => void;
};

const ActionGroupHeader = ({ group, isExpanded, language, onToggle }: ActionGroupHeaderProps) => {
  return (
    <div className={styles.group}>
      <p className={styles.name} onClick={onToggle}>
        <Icon className={styles.icon} path={mdiChevronRight} rotate={isExpanded ? 90 : 0} size="1.5rem" />
        <span className={styles.label}>{i18nUI(group.UILabel, language) || group.name}</span>
      </p>
    </div>
  );
};

export default ActionGroupHeader;
