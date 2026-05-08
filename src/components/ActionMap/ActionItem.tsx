import { useContext, useEffect } from "react";
import Icon from "@mdi/react";
import { mdiContentSave, mdiPencil, mdiRestore, mdiTrashCanOutline } from "@mdi/js";
import { CTXActionRebinding, CTXKeysHovering, CTXUserActionmap, type AppLanguage } from "../../contexts";
import type { Action } from "../../interfaces";
import actionIcon from "../../icons/actionIcon";
import { formatKeyLabel } from "../../utils/keyCodes";
import { i18nUI, modifiers, rebindAction, resetAction } from "../../utils/utils";
import styles from "./ActionItem.module.css";

type ActionItemProps = {
  action: Action;
  language: AppLanguage;
};

const cx = (...classNames: Array<string | false | null | undefined>) => classNames.filter(Boolean).join(" ");

const modifierClassByKey: Record<string, string> = {
  lalt: styles.lalt,
  ralt: styles.ralt,
  lctrl: styles.lctrl,
  rctrl: styles.rctrl,
  lshift: styles.lshift,
  rshift: styles.rshift,
};

const getKbmSpanClassName = (key: string) => cx(styles.kbm, modifiers.includes(key) && modifierClassByKey[key]);

const ActionItem = ({ action, language }: ActionItemProps) => {
  const [, setKeysHovering] = useContext(CTXKeysHovering);
  const [actionRebinding, setActionRebinding] = useContext(CTXActionRebinding);
  const [userActionmap, setUserActionmap] = useContext(CTXUserActionmap);
  const isRebinding = actionRebinding[0] === action._group && actionRebinding[1] === action.name;
  const multiTapId = `multiTap_${action._group}_${action.name}`;

  useEffect(() => {
    return () => {
      setKeysHovering([]);
    };
  }, [setKeysHovering]);

  return (
    <div className={styles.action} onMouseEnter={() => setKeysHovering([action.kbm.modifier, action.kbm.key])} onMouseLeave={() => setKeysHovering([])}>
      <Icon className={styles.icon} path={actionIcon(action._group, action.name) || ""} size="1.5rem" />
      <p className={styles.name}>{i18nUI(action.UILabel, language) || action.name}</p>
      {isRebinding ? (
        <>
          <div className={styles.buttons}>
            <button
              className={styles.actionButton}
              onClick={() => {
                setActionRebinding(["", ""]);
              }}
            >
              <Icon path={mdiContentSave} size="1rem" />
            </button>
          </div>
          <input
            className={styles.multiTapCheckbox}
            type="checkbox"
            id={multiTapId}
            checked={action.multiTap === "2"}
            onChange={(e) => rebindAction(action._group, action.name, action.kbm.key, action.kbm.modifier, e.target.checked ? "2" : "", userActionmap, setUserActionmap)}
          />
          <label className={styles.multiTapLabel} htmlFor={multiTapId}>
            双击
          </label>
          <p className={styles.kbms}>
            <select className={styles.modifierSelect} onChange={(e) => rebindAction(action._group, action.name, action.kbm.key, e.target.value, null, userActionmap, setUserActionmap)} value={action.kbm.modifier}>
              <option value="">无组合键</option>
              {modifiers.map((m) => (
                <option value={m} key={m}>
                  {m}
                </option>
              ))}
            </select>
            <span className={getKbmSpanClassName(action.kbm.key)} title={action.kbm.key}>
              {formatKeyLabel(action.kbm.key) || " "}
            </span>
          </p>
        </>
      ) : (
        <>
          <div className={styles.buttons}>
            <button
              className={cx(styles.actionButton, styles.clearButton)}
              onClick={() => {
                rebindAction(action._group, action.name, "", "", "", userActionmap, setUserActionmap);
              }}
            >
              <Icon path={mdiTrashCanOutline} size="1rem" />
            </button>
            <button
              className={cx(styles.actionButton, styles.resetButton)}
              onClick={() => {
                resetAction(action._group, action.name, userActionmap, setUserActionmap);
              }}
            >
              <Icon path={mdiRestore} size="1rem" />
              默认
            </button>
            <button
              className={styles.actionButton}
              onClick={() => {
                setActionRebinding([action._group, action.name]);
              }}
            >
              <Icon path={mdiPencil} size="1rem" />
            </button>
          </div>
          <p className={styles.kbms}>
            {action.kbm.key && action.multiTap === "2" && "双击"}
            {action.kbm.modifier && (
              <span className={getKbmSpanClassName(action.kbm.modifier)} title={action.kbm.modifier}>
                {formatKeyLabel(action.kbm.modifier)}
              </span>
            )}
            {action.kbm.key && (
              <span className={getKbmSpanClassName(action.kbm.key)} title={action.kbm.key}>
                {formatKeyLabel(action.kbm.key)}
              </span>
            )}
          </p>
        </>
      )}
    </div>
  );
};

export default ActionItem;
