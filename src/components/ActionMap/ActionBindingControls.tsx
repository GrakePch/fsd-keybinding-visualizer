import { useTranslation } from "react-i18next";
import Icon from "@mdi/react";
import { mdiKeyboard, mdiLinkOff, mdiRestore, mdiTune } from "@mdi/js";
import type { ActivationModeDefinition } from "../../interfaces";
import styles from "./ActionItem.module.css";

type ActionBindingControlsProps = {
  hasBinding: boolean;
  hasUserOverride: boolean;
  canEditMode: boolean;
  effectiveMode: string;
  modeDefinitions: ActivationModeDefinition[];
  onClear: () => void;
  onReset: () => void;
  onModeChange: (mode: string) => void;
  onRecord: () => void;
};

const cx = (...classNames: Array<string | false | null | undefined>) => classNames.filter(Boolean).join(" ");

const ActionBindingControls = ({
  hasBinding,
  hasUserOverride,
  canEditMode,
  effectiveMode,
  modeDefinitions,
  onClear,
  onReset,
  onModeChange,
  onRecord,
}: ActionBindingControlsProps) => {
  const { t } = useTranslation("ui");
  const hasUnknownMode = effectiveMode && !modeDefinitions.some((mode) => mode.name === effectiveMode);

  return (
    <div className={styles.buttons}>
      {hasBinding && (
        <button className={cx(styles.actionButton, "buttonAccent", styles.clearButton)} type="button" onClick={onClear}>
          <Icon path={mdiLinkOff} size="1rem" />
          {t("actionRebinding.clear")}
        </button>
      )}
      {hasUserOverride && (
        <button className={cx(styles.actionButton, "buttonAccent", styles.resetButton)} type="button" onClick={onReset}>
          <Icon path={mdiRestore} size="1rem" />
          {t("actionRebinding.reset")}
        </button>
      )}
      {canEditMode && (
        <label className={styles.modeControl}>
          <Icon path={mdiTune} size="1rem" />
          <select
            aria-label={t("actionRebinding.activationMode")}
            value={effectiveMode}
            onChange={(event) => onModeChange(event.target.value)}
          >
            <option value="">{t("actionRebinding.inheritMode")}</option>
            {hasUnknownMode && <option value={effectiveMode}>{effectiveMode} *</option>}
            {modeDefinitions.map((mode) => (
              <option key={mode.name} value={mode.name}>
                {mode.name}
                {mode.usedByDefault ? "" : " *"}
              </option>
            ))}
          </select>
        </label>
      )}
      <button className={cx(styles.actionButton, "buttonNormal")} type="button" onClick={onRecord}>
        <Icon path={mdiKeyboard} size="1rem" />
        {t("actionRebinding.record")}
      </button>
    </div>
  );
};

export default ActionBindingControls;
