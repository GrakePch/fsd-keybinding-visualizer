import Icon from "@mdi/react";
import { mdiLinkOff, mdiRestore } from "@mdi/js";
import { useTranslation } from "react-i18next";
import { maxisInputs, modifiers } from "../../utils/utils";
import { formatKeyLabel } from "../../utils/keyCodes";
import styles from "./ActionItem.module.css";

type MaxisBindingControlsProps = {
  hasBinding: boolean;
  hasUserOverride: boolean;
  modifier: string;
  maxisInput: string;
  onClear: () => void;
  onReset: () => void;
  onModifierChange: (modifier: string) => void;
  onMaxisChange: (maxisInput: string) => void;
};

const cx = (...classNames: Array<string | false | null | undefined>) => classNames.filter(Boolean).join(" ");

const MaxisBindingControls = ({
  hasBinding,
  hasUserOverride,
  modifier,
  maxisInput,
  onClear,
  onReset,
  onModifierChange,
  onMaxisChange,
}: MaxisBindingControlsProps) => {
  const { t } = useTranslation("ui");
  const hasUnknownMaxis = Boolean(maxisInput) && !maxisInputs.includes(maxisInput as (typeof maxisInputs)[number]);

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
      <label className={styles.maxisControl}>
        <span>{t("actionRebinding.modifier")}</span>
        <select
          aria-label={t("actionRebinding.modifier")}
          disabled={!hasBinding}
          value={hasBinding ? modifier : ""}
          onChange={(event) => onModifierChange(event.target.value)}
        >
          <option value="">{t("actionRebinding.noModifier")}</option>
          {modifiers.map((option) => (
            <option key={option} value={option}>{formatKeyLabel(option)}</option>
          ))}
        </select>
      </label>
      <label className={styles.maxisControl}>
        <span>{t("actionRebinding.mouseAxis")}</span>
        <select
          aria-label={t("actionRebinding.mouseAxis")}
          value={maxisInput}
          onChange={(event) => onMaxisChange(event.target.value)}
        >
          <option value="">{t("actionRebinding.selectMouseAxis")}</option>
          {hasUnknownMaxis && <option value={maxisInput}>{maxisInput} *</option>}
          {maxisInputs.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
    </div>
  );
};

export default MaxisBindingControls;
