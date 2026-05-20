import type { ReactNode } from "react";
import styles from "./Tooltip.module.css";

interface TooltipProps {
  tooltip: string;
  position?: "top-right" | "bottom-right" | "bottom-left";
  className?: string;
  children: ReactNode;
}

function Tooltip({ tooltip, position = "top-right", className = "", children }: TooltipProps) {
  const positionClassName = position === "bottom-left" ? styles.tooltipBottomLeft : position === "bottom-right" ? styles.tooltipBottomRight : "";

  return (
    <span className={`${styles.tooltip} ${positionClassName} ${className}`} aria-label={tooltip} data-tooltip={tooltip}>
      {children}
    </span>
  );
}

export default Tooltip;
