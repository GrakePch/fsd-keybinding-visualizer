import { useEffect, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import "./App.css";
import KeyboardFull from "./components/KeyboardFull/KeyboardFull";
import ActionMap from "./components/ActionMap/ActionMap";
import Icon from "@mdi/react";
import { mdiChevronLeft, mdiChevronRight } from "@mdi/js";
import { CTXDefaultActionGroups, CTXOrderInfo, CTXKeysHovering, CTXCombinedActionGroups, CTXUserActionmap, CTXActionRebinding } from "./contexts";
import { ActionGroup, OrderInfo, UserActionmap } from "./interfaces";
import { useSearchParams } from "react-router-dom";
import { actionMapCategories } from "./utils/actionMapCategories";
import defaultProfile from "./data/defaultProfile.json";
import { initDefaultActionGroups, rebindAction } from "./utils/utils";
import { keyCodeToCigInput } from "./utils/keyCodes";

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

function App() {
  const [searchParam, setSearchParam] = useSearchParams();
  const [defaultActionGroups, setDefaultActionGroups] = useState<Record<string, ActionGroup>>({});
  const [orderInfo, setOrderInfo] = useState<OrderInfo>({ groupOrder: [], inGroupOrder: {} });
  const [keysHovering, setKeysHovering] = useState<string[]>([]);
  const [userActionmap, setUserActionmap] = useState<UserActionmap>({});
  const [combinedActionGroups, setCombinedActionGroups] = useState<Record<string, ActionGroup>>({});
  const [actionRebinding, setActionRebinding] = useState<[string, string]>(["", ""]);
  const [isActionMapOpen, setIsActionMapOpen] = useState(true);
  const [isActionMapResizing, setIsActionMapResizing] = useState(false);
  const [actionMapWidth, setActionMapWidth] = useState(getInitialActionMapWidth);

  useEffect(() => {
    initDefaultActionGroups(defaultProfile, setDefaultActionGroups, setCombinedActionGroups, setOrderInfo);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      console.log(event);
      if (actionRebinding[1] === "") return;
      if (!keyCodeToCigInput[event.code]) return;
      rebindAction(...actionRebinding, keyCodeToCigInput[event.code], combinedActionGroups[actionRebinding[0]].actions[actionRebinding[1]].kbm.modifier, null, userActionmap, setUserActionmap);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [actionRebinding, combinedActionGroups, userActionmap]);

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
    if (actionMapCategories.includes(cate) === false) {
      searchParam.delete("c");
      setSearchParam(searchParam);
    }
  }, [defaultActionGroups, orderInfo, searchParam, setSearchParam]);

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

  return (
    <CTXOrderInfo.Provider value={orderInfo}>
      <CTXDefaultActionGroups.Provider value={defaultActionGroups}>
        <CTXUserActionmap.Provider value={[userActionmap, setUserActionmap]}>
          <CTXCombinedActionGroups.Provider value={[combinedActionGroups, setCombinedActionGroups]}>
            <CTXKeysHovering.Provider value={[keysHovering, setKeysHovering]}>
              <CTXActionRebinding.Provider value={[actionRebinding, setActionRebinding]}>
                <div className={"AppShell" + (isActionMapOpen ? "" : " action-map-closed") + (isActionMapResizing ? " action-map-resizing" : "")} style={appShellStyle}>
                  <main className="keyboard-pane">
                    <KeyboardFull />
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
              </CTXActionRebinding.Provider>
            </CTXKeysHovering.Provider>
          </CTXCombinedActionGroups.Provider>
        </CTXUserActionmap.Provider>
      </CTXDefaultActionGroups.Provider>
    </CTXOrderInfo.Provider>
  );
}

export default App;
