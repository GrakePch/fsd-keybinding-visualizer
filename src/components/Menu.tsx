import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Icon from "@mdi/react";
import { mdiRadioboxBlank, mdiRadioboxMarked } from "@mdi/js";
import styles from "./Menu.module.css";

const useMenuLayoutEffect = typeof document === "undefined" ? useEffect : useLayoutEffect;

export interface MenuItem {
  id: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  checked?: boolean;
  tooltip?: string;
  shortcut?: string;
}

interface Props {
  label: string;
  items: MenuItem[];
  className?: string;
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onTriggerHover?: () => void;
}

/** A button-anchored action menu, with optional mutually exclusive choices. */
export default function Menu({ label, items, className, children, open: controlledOpen, onOpenChange, onTriggerHover }: Props) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const setOpen = useCallback((value: boolean) => {
    if (controlledOpen === undefined) setLocalOpen(value);
    onOpenChange?.(value);
  }, [controlledOpen, onOpenChange]);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const initialFocus = useRef<"first" | "last">("first");
  const id = useId();
  const close = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  useMenuLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const anchor = triggerRef.current?.getBoundingClientRect();
      const menu = menuRef.current?.getBoundingClientRect();
      if (!anchor || !menu) return;
      setPosition({ left: Math.max(8, Math.min(anchor.left, window.innerWidth - menu.width - 8)), top: Math.max(8, Math.min(anchor.bottom + 6, window.innerHeight - menu.height - 8)) });
    };
    update();
    const available = menuRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
    const firstFocus = available?.[initialFocus.current === "last" ? available.length - 1 : 0];
    (firstFocus ?? menuRef.current)?.focus();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, setOpen]);

  return <>
    <button ref={triggerRef} id={`${id}-trigger`} className={className} type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => { initialFocus.current = "first"; setOpen(!open); }}
      onPointerEnter={event => { if (event.pointerType === "mouse") { initialFocus.current = "first"; onTriggerHover?.(); } }}
      onKeyDown={event => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault(); initialFocus.current = event.key === "ArrowUp" ? "last" : "first"; setOpen(true);
        }
      }}>{children ?? label}</button>
    {open && createPortal(<div ref={menuRef} id={id} role="menu" tabIndex={-1} aria-labelledby={`${id}-trigger`} className={styles.menu} style={position}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget) && !triggerRef.current?.contains(event.relatedTarget)) close(); }}
      onKeyDown={event => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(true); return; }
        if (event.key === "Tab") { event.preventDefault(); close(true); return; }
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
        if (!buttons.length) return;
        const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
        buttons[next]?.focus();
      }}>
      {items.map(item => <button key={item.id} type="button" role={item.checked === undefined ? "menuitem" : "menuitemradio"} aria-checked={item.checked} disabled={item.disabled} title={item.tooltip} className={styles.item}
        onClick={() => { close(true); item.onSelect(); }}>
        {item.checked !== undefined && <Icon className={styles.check} path={item.checked ? mdiRadioboxMarked : mdiRadioboxBlank} size="1rem" aria-hidden="true" />}
        <span>{item.label}</span>{item.shortcut && <span className={styles.shortcut}>{item.shortcut}</span>}
      </button>)}
    </div>, document.body)}
  </>;
}
