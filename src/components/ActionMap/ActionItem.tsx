import { useContext, useEffect } from "react";
import Icon from "@mdi/react";
import { mdiCheck, mdiClose, mdiLinkOff, mdiPencil, mdiRestore } from "@mdi/js";
import { CTXActionBindingDraft, CTXActionRebinding, CTXDefaultActionGroups, CTXKeysHovering, CTXUserActionmap, type ActionBindingValue, type AppLanguage } from "../../contexts";
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

const getBindingValue = (action: Action): ActionBindingValue => ({
  kbm: { ...action.kbm },
  multiTap: action.multiTap || "",
});

const areBindingValuesEqual = (a: ActionBindingValue, b: ActionBindingValue) => a.kbm.key === b.kbm.key && a.kbm.modifier === b.kbm.modifier && a.multiTap === b.multiTap;

const ActionItem = ({ action, language }: ActionItemProps) => {
  const [, setKeysHovering] = useContext(CTXKeysHovering);
  const defaultActionGroups = useContext(CTXDefaultActionGroups);
  const [actionRebinding, setActionRebinding] = useContext(CTXActionRebinding);
  const [actionBindingDraft, setActionBindingDraft] = useContext(CTXActionBindingDraft);
  const [userActionmap, setUserActionmap] = useContext(CTXUserActionmap);
  const isRebinding = actionRebinding[0] === action._group && actionRebinding[1] === action.name;
  const defaultAction = defaultActionGroups[action._group]?.actions[action.name];
  const defaultBinding = defaultAction ? getBindingValue(defaultAction) : getBindingValue(action);
  const displayedBinding = isRebinding && actionBindingDraft ? actionBindingDraft.current : getBindingValue(action);
  const hasDraftChanges = Boolean(isRebinding && actionBindingDraft && !areBindingValuesEqual(actionBindingDraft.initial, actionBindingDraft.current));
  const multiTapId = `multiTap_${action._group}_${action.name}`;

  useEffect(() => {
    return () => {
      setKeysHovering([]);
    };
  }, [setKeysHovering]);

  const updateDraftCurrent = (nextBinding: ActionBindingValue) => {
    setActionBindingDraft((draft) => (draft ? { ...draft, current: nextBinding } : draft));
  };

  const handleStartRebinding = () => {
    const currentBinding = getBindingValue(action);

    setActionBindingDraft({
      initial: currentBinding,
      current: currentBinding,
    });
    setActionRebinding([action._group, action.name]);
  };

  const handleConfirmRebinding = () => {
    if (!actionBindingDraft) return;

    if (areBindingValuesEqual(actionBindingDraft.current, defaultBinding)) {
      resetAction(action._group, action.name, userActionmap, setUserActionmap);
    } else {
      rebindAction(action._group, action.name, actionBindingDraft.current.kbm.key, actionBindingDraft.current.kbm.modifier, actionBindingDraft.current.multiTap, userActionmap, setUserActionmap);
    }
    setActionBindingDraft(null);
    setActionRebinding(["", ""]);
  };

  const handleCancelRebinding = () => {
    setActionBindingDraft(null);
    setActionRebinding(["", ""]);
  };

  return (
    <div className={styles.action} onMouseEnter={() => setKeysHovering([displayedBinding.kbm.modifier, displayedBinding.kbm.key])} onMouseLeave={() => setKeysHovering([])}>
      <Icon className={styles.icon} path={actionIcon(action._group, action.name) || ""} size="1.5rem" />
      <p className={styles.name}>{i18nUI(action.UILabel, language) || action.name}</p>
      {isRebinding ? (
        <>
          <div className={styles.buttons}>
            <button
              className={cx(styles.actionButton, styles.clearButton)}
              onClick={() => {
                updateDraftCurrent({ kbm: { key: "", modifier: "" }, multiTap: "" });
              }}
            >
              <Icon path={mdiLinkOff} size="1rem" />
              解绑
            </button>
            <button
              className={cx(styles.actionButton, styles.resetButton)}
              onClick={() => {
                updateDraftCurrent(defaultBinding);
              }}
            >
              <Icon path={mdiRestore} size="1rem" />
              默认
            </button>
            <button className={cx(styles.actionButton, styles.cancelButton)} onClick={handleCancelRebinding}>
              <Icon path={mdiClose} size="1rem" />
              取消
            </button>
            {hasDraftChanges && (
              <button className={styles.actionButton} onClick={handleConfirmRebinding}>
                <Icon path={mdiCheck} size="1rem" />
                确认
              </button>
            )}
          </div>
          <input
            className={styles.multiTapCheckbox}
            type="checkbox"
            id={multiTapId}
            checked={displayedBinding.multiTap === "2"}
            onChange={(e) => updateDraftCurrent({ ...displayedBinding, multiTap: e.target.checked ? "2" : "" })}
          />
          <label className={styles.multiTapLabel} htmlFor={multiTapId}>
            双击
          </label>
          <p className={styles.kbms}>
            <select className={styles.modifierSelect} onChange={(e) => updateDraftCurrent({ ...displayedBinding, kbm: { ...displayedBinding.kbm, modifier: e.target.value } })} value={displayedBinding.kbm.modifier}>
              <option value="">无组合键</option>
              {modifiers.map((m) => (
                <option value={m} key={m}>
                  {m}
                </option>
              ))}
            </select>
            <span className={getKbmSpanClassName(displayedBinding.kbm.key)} title={displayedBinding.kbm.key}>
              {formatKeyLabel(displayedBinding.kbm.key) || " "}
            </span>
          </p>
        </>
      ) : (
        <>
          <div className={styles.buttons}>
            <button
              className={styles.actionButton}
              onClick={handleStartRebinding}
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
