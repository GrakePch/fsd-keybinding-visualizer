import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Icon from "@mdi/react";
import { mdiGestureDoubleTap, mdiKeyboard, mdiLinkOff, mdiRestore } from "@mdi/js";
import { CTXDefaultActionGroups, CTXKeysHovering, CTXUserActionmap, type ActionBindingValue, type AppLanguage } from "../../contexts";
import type { Action } from "../../interfaces";
import actionIcon from "../../icons/actionIcon";
import { codesNonBindable, formatKeyLabel, keyCodeToCigInput } from "../../utils/keyCodes";
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

const RECORDING_DURATION_MS = 3000;

const mouseButtonToCigInput: Record<number, string> = {
  0: "mouse1",
  2: "mouse2",
  1: "mouse3",
  3: "mouse4",
  4: "mouse5",
  5: "mouse6",
  6: "mouse7",
};

type RecordingState = {
  binding: ActionBindingValue;
  captured: boolean;
  id: number;
};

const getLastPressedModifier = (pressedModifiers: Set<string>) => {
  let lastModifier = "";
  pressedModifiers.forEach((modifier) => {
    lastModifier = modifier;
  });
  return lastModifier;
};

const ActionItem = ({ action, language }: ActionItemProps) => {
  const { t } = useTranslation("ui");
  const [, setKeysHovering] = useContext(CTXKeysHovering);
  const defaultActionGroups = useContext(CTXDefaultActionGroups);
  const [userActionmap, setUserActionmap] = useContext(CTXUserActionmap);
  const [recording, setRecording] = useState<RecordingState | null>(null);
  const recordingRef = useRef<RecordingState | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingIdRef = useRef(0);
  const pressedModifiersRef = useRef(new Set<string>());
  const defaultAction = defaultActionGroups[action._group]?.actions[action.name];
  const defaultBinding = defaultAction ? getBindingValue(defaultAction) : getBindingValue(action);
  const currentBinding = getBindingValue(action);
  const displayedBinding = recording ? recording.binding : currentBinding;
  const hasBinding = Boolean(currentBinding.kbm.key || currentBinding.kbm.modifier || currentBinding.multiTap);
  const isDefaultBinding = areBindingValuesEqual(currentBinding, defaultBinding);
  const isDoubleTap = currentBinding.multiTap === "2";

  const setRecordingState = useCallback((nextRecording: RecordingState | null) => {
    recordingRef.current = nextRecording;
    setRecording(nextRecording);
  }, []);

  const saveBinding = useCallback(
    (nextBinding: ActionBindingValue) => {
      if (areBindingValuesEqual(nextBinding, defaultBinding)) {
        resetAction(action._group, action.name, userActionmap, setUserActionmap);
      } else {
        rebindAction(action._group, action.name, nextBinding.kbm.key, nextBinding.kbm.modifier, nextBinding.multiTap, userActionmap, setUserActionmap);
      }
    },
    [action._group, action.name, defaultBinding, setUserActionmap, userActionmap]
  );

  const saveBindingRef = useRef(saveBinding);

  useEffect(() => {
    saveBindingRef.current = saveBinding;
  }, [saveBinding]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current !== null) {
        window.clearTimeout(recordingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      setKeysHovering([]);
    };
  }, [setKeysHovering]);

  const cancelRecording = useCallback(() => {
    if (recordingTimerRef.current !== null) {
      window.clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    pressedModifiersRef.current.clear();
    setRecordingState(null);
  }, [setRecordingState]);

  const updateRecordingBinding = useCallback((input: string) => {
    setRecording((currentRecording) => {
      if (!currentRecording) return currentRecording;

      const nextBinding = {
        kbm: { ...currentRecording.binding.kbm },
        multiTap: currentRecording.binding.multiTap,
      };

      if (modifiers.includes(input)) {
        if (nextBinding.kbm.key && !modifiers.includes(nextBinding.kbm.key)) {
          nextBinding.kbm.modifier = input;
        } else {
          nextBinding.kbm.key = input;
          nextBinding.kbm.modifier = "";
        }
      } else {
        nextBinding.kbm.key = input;
        nextBinding.kbm.modifier = getLastPressedModifier(pressedModifiersRef.current);
      }

      const nextRecording = {
        ...currentRecording,
        binding: nextBinding,
        captured: true,
      };

      recordingRef.current = nextRecording;
      return nextRecording;
    });
  }, []);

  useEffect(() => {
    if (!recording) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.code === "Escape") {
        cancelRecording();
        return;
      }
      if (event.repeat) return;
      if (codesNonBindable.has(event.code)) return;

      const input = keyCodeToCigInput[event.code];
      if (!input) return;

      if (modifiers.includes(input)) {
        pressedModifiersRef.current.add(input);
      }

      updateRecordingBinding(input);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const input = keyCodeToCigInput[event.code];
      if (input && modifiers.includes(input)) {
        pressedModifiersRef.current.delete(input);
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      const input = mouseButtonToCigInput[event.button];
      if (!input) return;

      event.preventDefault();
      event.stopPropagation();
      updateRecordingBinding(input);
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return;

      event.preventDefault();
      event.stopPropagation();
      updateRecordingBinding(event.deltaY < 0 ? "mwheel_up" : "mwheel_down");
    };

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });
    window.addEventListener("mousedown", handleMouseDown, { capture: true });
    window.addEventListener("wheel", handleWheel, { capture: true, passive: false });
    window.addEventListener("contextmenu", handleContextMenu, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
      window.removeEventListener("mousedown", handleMouseDown, { capture: true });
      window.removeEventListener("wheel", handleWheel, { capture: true });
      window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
    };
  }, [cancelRecording, recording, updateRecordingBinding]);

  const handleClearBinding = () => {
    saveBinding({ kbm: { key: "", modifier: "" }, multiTap: "" });
  };

  const handleResetBinding = () => {
    resetAction(action._group, action.name, userActionmap, setUserActionmap);
  };

  const handleToggleDoubleTap = () => {
    saveBinding({ ...currentBinding, multiTap: isDoubleTap ? "" : "2" });
  };

  const handleStartRecording = () => {
    if (recordingTimerRef.current !== null) {
      window.clearTimeout(recordingTimerRef.current);
    }

    pressedModifiersRef.current.clear();

    const nextRecording = {
      binding: currentBinding,
      captured: false,
      id: recordingIdRef.current + 1,
    };

    recordingIdRef.current = nextRecording.id;
    setRecordingState(nextRecording);
    recordingTimerRef.current = window.setTimeout(() => {
      const recordedBinding = recordingRef.current;

      if (recordedBinding?.id === nextRecording.id && recordedBinding.captured) {
        saveBindingRef.current(recordedBinding.binding);
      }

      pressedModifiersRef.current.clear();
      setRecordingState(null);
      recordingTimerRef.current = null;
    }, RECORDING_DURATION_MS);
  };

  return (
    <div className={cx(styles.action, recording && styles.recording)} onMouseEnter={() => setKeysHovering([displayedBinding.kbm.modifier, displayedBinding.kbm.key])} onMouseLeave={() => setKeysHovering([])}>
      <Icon className={styles.icon} path={actionIcon(action._group, action.name) || ""} size="1.5rem" />
      <p className={styles.name}>{i18nUI(action.UILabel, language) || action.name}</p>
      {recording ? (
        <div className={styles.recordingHint}>{t("actionRebinding.recordingHint")}</div>
      ) : (
        <div className={styles.buttons}>
          {hasBinding && (
            <button className={cx(styles.actionButton, "buttonAccent", styles.clearButton)} type="button" onClick={handleClearBinding}>
              <Icon path={mdiLinkOff} size="1rem" />
              {t("actionRebinding.clear")}
            </button>
          )}
          {!isDefaultBinding && (
            <button className={cx(styles.actionButton, "buttonAccent", styles.resetButton)} type="button" onClick={handleResetBinding}>
              <Icon path={mdiRestore} size="1rem" />
              {t("actionRebinding.reset")}
            </button>
          )}
          {hasBinding && (
            <button className={cx(styles.actionButton, "buttonNormal")} type="button" onClick={handleToggleDoubleTap}>
              <Icon path={mdiGestureDoubleTap} size="1rem" />
              {t(isDoubleTap ? "actionRebinding.singleTap" : "actionRebinding.doubleTap")}
            </button>
          )}
          <button className={cx(styles.actionButton, "buttonNormal")} type="button" onClick={handleStartRecording}>
            <Icon path={mdiKeyboard} size="1rem" />
            {t("actionRebinding.record")}
          </button>
        </div>
      )}
      <p className={styles.kbms}>
        {displayedBinding.kbm.key && displayedBinding.multiTap === "2" && t("actionRebinding.doubleTap")}
        {displayedBinding.kbm.modifier && (
          <span className={getKbmSpanClassName(displayedBinding.kbm.modifier)} title={displayedBinding.kbm.modifier}>
            {formatKeyLabel(displayedBinding.kbm.modifier)}
          </span>
        )}
        {displayedBinding.kbm.key && (
          <span className={getKbmSpanClassName(displayedBinding.kbm.key)} title={displayedBinding.kbm.key}>
            {formatKeyLabel(displayedBinding.kbm.key)}
          </span>
        )}
      </p>
    </div>
  );
};

export default ActionItem;
