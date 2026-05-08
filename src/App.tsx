import { useEffect, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import "./App.css";
import KeyboardFull from "./components/KeyboardFull/KeyboardFull";
import ActionMap from "./components/ActionMap/ActionMap";
import ActionMapFileConsole from "./components/ActionMapFileConsole/ActionMapFileConsole";
import Icon from "@mdi/react";
import { mdiChevronLeft, mdiChevronRight } from "@mdi/js";
import { CTXDefaultActionGroups, CTXOrderInfo, CTXKeysHovering, CTXCombinedActionGroups, CTXUserActionmap, CTXActionRebinding, CTXActionBindingDraft, CTXLanguage, type ActionBindingDraft, type AppLanguage } from "./contexts";
import { ActionGroup, OrderInfo, UserActionmap } from "./interfaces";
import { useSearchParams } from "react-router-dom";
import { actionMapCategories } from "./utils/actionMapCategories";
import defaultProfile from "./data/defaultProfile.json";
import { initDefaultActionGroups } from "./utils/utils";
import { codesNonBindable, keyCodeToCigInput } from "./utils/keyCodes";

const getActionMapWidthBounds = () => {
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const min = 20 * rem;
  const max = Math.max(min, Math.min(80 * rem, window.innerWidth - 5 * rem));

  return { min, max };
};

const clampActionMapWidth = (width: number) => {
  const { min, max } = getActionMapWidthBounds();

  return Math.min(max, Math.max(min, width));
};

const getInitialActionMapWidth = () => {
  if (typeof window === "undefined") return 640;

  return clampActionMapWidth(window.innerWidth * 0.5);
};

const LANGUAGE_LOCAL_STORAGE_KEY = "fsd-keybinding-visualizer.lang";

const isAppLanguage = (lang: string | null): lang is AppLanguage => lang === "en" || lang === "zh";

const getInitialLanguage = (): AppLanguage => {
  if (typeof window === "undefined") return "en";

  const queryLanguage = new URLSearchParams(window.location.search).get("lang");
  if (isAppLanguage(queryLanguage)) return queryLanguage;

  const storedLanguage = window.localStorage.getItem(LANGUAGE_LOCAL_STORAGE_KEY);
  if (isAppLanguage(storedLanguage)) return storedLanguage;

  return "en";
};

const isEditableEventTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;

  return target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
};

function App() {
  const [searchParam, setSearchParam] = useSearchParams();
  const [defaultActionGroups, setDefaultActionGroups] = useState<Record<string, ActionGroup>>({});
  const [orderInfo, setOrderInfo] = useState<OrderInfo>({ groupOrder: [], inGroupOrder: {} });
  const [keysHovering, setKeysHovering] = useState<string[]>([]);
  const [userActionmap, setUserActionmap] = useState<UserActionmap>({});
  const [combinedActionGroups, setCombinedActionGroups] = useState<Record<string, ActionGroup>>({});
  const [actionRebinding, setActionRebinding] = useState<[string, string]>(["", ""]);
  const [actionBindingDraft, setActionBindingDraft] = useState<ActionBindingDraft | null>(null);
  const [isActionMapOpen, setIsActionMapOpen] = useState(true);
  const [isActionMapResizing, setIsActionMapResizing] = useState(false);
  const [actionMapWidth, setActionMapWidth] = useState(getInitialActionMapWidth);
  const [language, setLanguage] = useState<AppLanguage>(getInitialLanguage);

  useEffect(() => {
    initDefaultActionGroups(defaultProfile, setDefaultActionGroups, setCombinedActionGroups, setOrderInfo);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (actionRebinding[1] === "") return;
      if (isEditableEventTarget(event.target)) return;
      if (codesNonBindable.has(event.code)) return;
      if (!keyCodeToCigInput[event.code]) return;

      event.preventDefault();
      setActionBindingDraft((draft) =>
        draft
          ? {
              ...draft,
              current: {
                ...draft.current,
                kbm: {
                  ...draft.current.kbm,
                  key: keyCodeToCigInput[event.code],
                },
              },
            }
          : draft
      );
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [actionRebinding]);

  useEffect(() => {
    const combined = structuredClone(defaultActionGroups);

    for (const [groupName, actions] of Object.entries(userActionmap)) {
      if (!actions) continue;
      for (const [actionName, { kbm, multiTap }] of Object.entries(actions)) {
        if (!kbm) continue;
        if (groupName in combined && actionName in combined[groupName].actions) {
          combined[groupName].actions[actionName].kbm = { ...kbm };
          combined[groupName].actions[actionName].multiTap = multiTap;
        }
      }
    }

    console.log(userActionmap);
    setCombinedActionGroups(combined);
  }, [defaultActionGroups, userActionmap]);

  useEffect(() => {
    const cate = searchParam.get("c") || "";
    if (searchParam.has("c") && actionMapCategories.includes(cate) === false) {
      const nextSearchParam = new URLSearchParams(searchParam);
      nextSearchParam.delete("c");
      setSearchParam(nextSearchParam);
    }
  }, [defaultActionGroups, orderInfo, searchParam, setSearchParam]);

  useEffect(() => {
    if (searchParam.get("lang") !== language) {
      const nextSearchParam = new URLSearchParams(searchParam);
      nextSearchParam.set("lang", language);
      setSearchParam(nextSearchParam, { replace: true });
    }
    window.localStorage.setItem(LANGUAGE_LOCAL_STORAGE_KEY, language);
  }, [language, searchParam, setSearchParam]);

  useEffect(() => {
    const handleResize = () => {
      setActionMapWidth((width) => clampActionMapWidth(width));
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleActionMapResizePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsActionMapOpen(true);
    setIsActionMapResizing(true);

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const updateWidth = (clientX: number) => {
      setActionMapWidth(clampActionMapWidth(window.innerWidth - clientX));
    };

    const handlePointerMove = (event: PointerEvent) => {
      updateWidth(event.clientX);
    };

    const handlePointerUp = () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      setIsActionMapResizing(false);
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    updateWidth(event.clientX);
  };

  const appShellStyle = {
    "--action-sidebar-width": `${actionMapWidth}px`,
  } as CSSProperties;

  const switchLanguage = () => {
    const nextLanguage: AppLanguage = language === "en" ? "zh" : "en";
    const nextSearchParam = new URLSearchParams(searchParam);

    nextSearchParam.set("lang", nextLanguage);
    setLanguage(nextLanguage);
    setSearchParam(nextSearchParam);
    window.localStorage.setItem(LANGUAGE_LOCAL_STORAGE_KEY, nextLanguage);
  };

  const counterpartLanguage = language === "en" ? "zh" : "en";

  return (
    <CTXLanguage.Provider value={[language, setLanguage]}>
      <CTXOrderInfo.Provider value={orderInfo}>
        <CTXDefaultActionGroups.Provider value={defaultActionGroups}>
          <CTXUserActionmap.Provider value={[userActionmap, setUserActionmap]}>
            <CTXCombinedActionGroups.Provider value={[combinedActionGroups, setCombinedActionGroups]}>
              <CTXKeysHovering.Provider value={[keysHovering, setKeysHovering]}>
                <CTXActionRebinding.Provider value={[actionRebinding, setActionRebinding]}>
                  <CTXActionBindingDraft.Provider value={[actionBindingDraft, setActionBindingDraft]}>
                    <div className={"AppShell" + (isActionMapOpen ? "" : " action-map-closed") + (isActionMapResizing ? " action-map-resizing" : "")} style={appShellStyle}>
                      <main className="visualizer-pane">
                        <div className="visualizer-scroll">
                          <KeyboardFull />
                        </div>
                        <ActionMapFileConsole />
                        <button className="language-toggle-fab" type="button" aria-label={counterpartLanguage === "zh" ? "切换到中文" : "Switch to English"} onClick={switchLanguage}>
                          {counterpartLanguage === "zh" ? "中" : "EN"}
                        </button>
                      </main>
                      <aside className="action-map-sidebar" aria-label="Action map sidebar">
                        <button
                          className="action-map-toggle"
                          type="button"
                          aria-label={isActionMapOpen ? "收起 ActionMap" : "展开 ActionMap"}
                          aria-expanded={isActionMapOpen}
                          onClick={() => setIsActionMapOpen((open) => !open)}
                        >
                          <Icon path={isActionMapOpen ? mdiChevronRight : mdiChevronLeft} size="1.25rem" />
                        </button>
                        <div className="action-map-drawer">
                          <div
                            className="action-map-resize-handle"
                            role="separator"
                            aria-orientation="vertical"
                            aria-label="调整 ActionMap 宽度"
                            onPointerDown={handleActionMapResizePointerDown}
                          />
                          <ActionMap />
                        </div>
                      </aside>
                    </div>
                  </CTXActionBindingDraft.Provider>
                </CTXActionRebinding.Provider>
              </CTXKeysHovering.Provider>
            </CTXCombinedActionGroups.Provider>
          </CTXUserActionmap.Provider>
        </CTXDefaultActionGroups.Provider>
      </CTXOrderInfo.Provider>
    </CTXLanguage.Provider>
  );
}

export default App;
