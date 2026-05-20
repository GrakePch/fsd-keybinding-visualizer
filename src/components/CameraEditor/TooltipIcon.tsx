import Icon from "@mdi/react";
import { mdiInformation } from "@mdi/js";
import Tooltip from "./Tooltip";
import styles from "./TooltipIcon.module.css";

interface TooltipIconProps {
  tooltip: string;
  iconPath?: string;
  iconSize?: string;
  position?: "top-right" | "bottom-right" | "bottom-left";
  variant?: "default" | "warning" | "danger";
  focusable?: boolean;
  className?: string;
}

function TooltipIcon({ tooltip, iconPath = mdiInformation, iconSize = "0.85rem", position = "top-right", variant = "default", focusable = true, className = "" }: TooltipIconProps) {
  const variantClassName = variant === "danger" ? styles.tooltipIconDanger : variant === "warning" ? styles.tooltipIconWarning : "";

  return (
    <Tooltip tooltip={tooltip} position={position} className={`${styles.tooltipIcon} ${variantClassName} ${className}`}>
      <span tabIndex={focusable ? 0 : undefined}>
        <Icon path={iconPath} size={iconSize} aria-hidden="true" />
      </span>
    </Tooltip>
  );
}

export default TooltipIcon;
