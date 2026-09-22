import { useCallback, useContext, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import Icon from "@mdi/react";
import { CTXDefaultActionGroups, CTXKeysHovering, CTXUserActionmap, type AppLanguage } from "../../contexts";
import defaultProfile from "../../data/defaultProfile.json";
import actionIcon from "../../icons/actionIcon";
import type { Action, InputBinding } from "../../interfaces";
import { getActivationModeDefinitions, i18nUI, rebindAction, resetAction } from "../../utils/utils";
import ActionBindingControls from "./ActionBindingControls";
import ActionBindingDisplay from "./ActionBindingDisplay";
import {
  areBindingListsEqual,
  areBindingsEqual,
  createEmptyBinding,
  isEditableBinding,
} from "./actionBinding";
import styles from "./ActionItem.module.css";
import { useActionBindingRecording } from "./useActionBindingRecording";

type ActionItemProps = {
  action: Action;
  language: AppLanguage;
};

const cx = (...classNames: Array<string | false | null | undefined>) => classNames.filter(Boolean).join(" ");
const activationModeDefinitions = getActivationModeDefinitions(defaultProfile);

const ActionItem = ({ action, language }: ActionItemProps) => {
  const { t } = useTranslation("ui");
  const [, setKeysHovering] = useContext(CTXKeysHovering);
  const defaultActionGroups = useContext(CTXDefaultActionGroups);
  const [userActionmap, setUserActionmap] = useContext(CTXUserActionmap);
  const defaultAction = defaultActionGroups[action._group]?.actions[action.name];

  const targetIndex = useMemo(
    () => action.bindings.findIndex(isEditableBinding),
    [action.bindings]
  );
  const currentBinding = targetIndex >= 0 ? action.bindings[targetIndex] : createEmptyBinding("keyboard");
  const effectiveMode = currentBinding.activationMode || action.activationMode || "";
  const hasBinding = targetIndex >= 0 && Boolean(currentBinding.inputName);
  const hasUserOverride = Boolean(userActionmap[action._group]?.[action.name]);

  const saveBindings = useCallback(
    (nextBinding: InputBinding, index: number) => {
      const existingOverride = userActionmap[action._group]?.[action.name];
      const baseBindings = (existingOverride ? action.bindings : action.bindings.filter(isEditableBinding)).map(
        (binding) => structuredClone(binding)
      );
      const targetBinding = index >= 0 ? action.bindings[index] : undefined;
      const targetBaseIndex = targetBinding
        ? baseBindings.findIndex((binding) => areBindingsEqual(binding, targetBinding))
        : -1;

      if (!nextBinding.inputName) {
        if (targetBaseIndex >= 0) baseBindings.splice(targetBaseIndex, 1);
      } else if (targetBaseIndex >= 0) {
        baseBindings[targetBaseIndex] = nextBinding;
      } else {
        baseBindings.push(nextBinding);
      }

      const defaultEditableBindings = defaultAction?.bindings.filter(isEditableBinding) || [];
      if (!existingOverride && areBindingListsEqual(baseBindings, defaultEditableBindings)) {
        resetAction(action._group, action.name, userActionmap, setUserActionmap);
      } else {
        rebindAction(action._group, action.name, baseBindings, userActionmap, setUserActionmap);
      }
    },
    [action.bindings, action._group, action.name, defaultAction, setUserActionmap, userActionmap]
  );

  const { recording, startRecording } = useActionBindingRecording({
    currentBinding,
    targetIndex,
    onCommit: saveBindings,
  });

  useEffect(() => () => setKeysHovering([]), [setKeysHovering]);

  const handleClearBinding = () => {
    if (targetIndex < 0) return;
    saveBindings({ ...currentBinding, rawInput: "", inputName: "", modifier: "" }, targetIndex);
  };

  const handleModeChange = (mode: string) => {
    saveBindings({ ...currentBinding, activationMode: mode || undefined }, targetIndex);
  };

  const displayBinding = recording ? recording.binding : currentBinding;
  const hoveredKeys = displayBinding.device === "keyboard" ? [displayBinding.modifier, displayBinding.inputName] : [];
  const displayedBindings = recording ? [recording.binding] : action.bindings.filter(isEditableBinding);

  return (
    <div
      className={cx(styles.action, recording && styles.recording)}
      onMouseEnter={() => setKeysHovering(hoveredKeys)}
      onMouseLeave={() => setKeysHovering([])}
    >
      <Icon className={styles.icon} path={actionIcon(action._group, action.name) || ""} size="1.5rem" />
      <p className={styles.name}>{i18nUI(action.UILabel, language) || action.name}</p>
      {recording ? (
        <div className={styles.recordingHint}>{t("actionRebinding.recordingHint")}</div>
      ) : (
        <ActionBindingControls
          hasBinding={hasBinding}
          hasUserOverride={hasUserOverride}
          canEditMode={targetIndex >= 0 && currentBinding.kind !== "axis"}
          effectiveMode={effectiveMode}
          modeDefinitions={activationModeDefinitions}
          onClear={handleClearBinding}
          onReset={() => resetAction(action._group, action.name, userActionmap, setUserActionmap)}
          onModeChange={handleModeChange}
          onRecord={startRecording}
        />
      )}
      <ActionBindingDisplay bindings={displayedBindings} actionActivationMode={action.activationMode} />
    </div>
  );
};

export default ActionItem;
