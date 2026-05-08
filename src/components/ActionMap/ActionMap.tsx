import "./ActionMap.css";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Icon from "@mdi/react";
import { mdiChevronRight, mdiContentSave, mdiPencil, mdiRestore, mdiTrashCanOutline } from "@mdi/js";
import { CTXOrderInfo, CTXKeysHovering, CTXCombinedActionGroups, CTXUserActionmap, CTXActionRebinding } from "../../contexts";
import { actionMapCategories, actionMapCategoriesMap, filterOurHidden } from "../../utils/actionMapCategories";
import { useSearchParams } from "react-router-dom";
import { Action, ActionGroup } from "../../interfaces";
import { i18nUI, modifiers, rebindAction, resetAction } from "../../utils/utils";
import actionIcon from "../../icons/actionIcon";

const ACTION_MAP_OVERSCAN_ROWS = 8;
const GROUP_ROW_HEIGHT_REM = 2.5;
const ACTION_ROW_HEIGHT_REM = 2;

type ActionMapRowBase = {
  key: string;
  top: number;
  height: number;
};

type ActionMapGroupRow = ActionMapRowBase & {
  type: "group";
  group: ActionGroup;
  isExpanded: boolean;
};

type ActionMapActionRow = ActionMapRowBase & {
  type: "action";
  action: Action;
};

type ActionMapVirtualRow = ActionMapGroupRow | ActionMapActionRow;

const getRootRemSize = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

const ActionMap = () => {
  const [searchParam, setSearchParam] = useSearchParams();
  const orderInfo = useContext(CTXOrderInfo);
  const [combinedActionGroups] = useContext(CTXCombinedActionGroups);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [listViewport, setListViewport] = useState({ scrollTop: 0, height: 0 });
  const [remSize, setRemSize] = useState(getRootRemSize);
  const listRef = useRef<HTMLDivElement>(null);

  const updateListViewport = useCallback(() => {
    const list = listRef.current;
    if (!list) return;

    setListViewport({ scrollTop: list.scrollTop, height: list.clientHeight });
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setRemSize(getRootRemSize());
      updateListViewport();
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [updateListViewport]);

  const groupRowHeight = GROUP_ROW_HEIGHT_REM * remSize;
  const actionRowHeight = ACTION_ROW_HEIGHT_REM * remSize;
  const activeKeyFilter = searchParam.get("k");
  const visibleGroupNames = searchParam.get("c") ? actionMapCategoriesMap[searchParam.get("c") as string] : filterOurHidden(orderInfo.groupOrder);

  const virtualRows = useMemo(() => {
    const rows: ActionMapVirtualRow[] = [];
    let top = 0;

    visibleGroupNames.forEach((groupName) => {
      const group = combinedActionGroups[groupName];
      const actionNames = orderInfo.inGroupOrder[groupName];
      if (!group || !actionNames) return;

      let filteredListActions = actionNames.map((actionName) => group.actions[actionName]).filter((action) => action?.UILabel);

      if (activeKeyFilter) {
        filteredListActions = filteredListActions.filter((action) => action.kbm.key === activeKeyFilter || action.kbm.modifier === activeKeyFilter);
      }

      if (filteredListActions.length === 0) return;

      const isExpanded = expandedGroups[group.name] ?? true;
      rows.push({
        type: "group",
        key: `group:${group.name}`,
        group,
        isExpanded,
        top,
        height: groupRowHeight,
      });
      top += groupRowHeight;

      if (!isExpanded) return;

      filteredListActions.forEach((action) => {
        rows.push({
          type: "action",
          key: `action:${action._group}:${action.name}`,
          action,
          top,
          height: actionRowHeight,
        });
        top += actionRowHeight;
      });
    });

    return rows;
  }, [actionRowHeight, activeKeyFilter, combinedActionGroups, expandedGroups, groupRowHeight, orderInfo.inGroupOrder, visibleGroupNames]);

  const totalRowsHeight = virtualRows.at(-1) ? virtualRows.at(-1)!.top + virtualRows.at(-1)!.height : 0;
  const visibleStart = Math.max(0, listViewport.scrollTop - ACTION_MAP_OVERSCAN_ROWS * actionRowHeight);
  const visibleEnd = listViewport.scrollTop + listViewport.height + ACTION_MAP_OVERSCAN_ROWS * actionRowHeight;
  const visibleRows = virtualRows.filter((row) => row.top + row.height >= visibleStart && row.top <= visibleEnd);

  return (
    <div className={"ActionMap" + (searchParam.get("k") ? " highlighted " + searchParam.get("k") : "")}>
      <select
        className="select-category"
        value={searchParam.get("c") || ""}
        onChange={(e) => {
          searchParam.set("c", e.target.value);
          setSearchParam(searchParam);
        }}
      >
        <option value="">all</option>
        {actionMapCategories.map((c) => (
          <option value={c} key={c}>
            {c}
          </option>
        ))}
      </select>

      <div className="list-action-groups" ref={listRef} onScroll={updateListViewport}>
        <div className="virtual-action-map-space" style={{ height: totalRowsHeight }}>
          {visibleRows.map((row) => (
            <div className="virtual-action-map-row" key={row.key} style={{ height: row.height, transform: `translateY(${row.top}px)` }}>
              {row.type === "group" ? (
                <ActionGroupHeader
                  group={row.group}
                  isExpanded={row.isExpanded}
                  onToggle={() => {
                    setExpandedGroups((groups) => ({ ...groups, [row.group.name]: !(groups[row.group.name] ?? true) }));
                  }}
                />
              ) : (
                <ActionItem action={row.action} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ActionGroupHeader = ({ group, isExpanded, onToggle }: { group: ActionGroup; isExpanded: boolean; onToggle: () => void }) => {
  return (
    <div className="ActionGroup">
      <p className="name" onClick={onToggle}>
        <Icon path={mdiChevronRight} rotate={isExpanded ? 90 : 0} size="1.5rem" />
        <span>{i18nUI(group.UILabel) || group.name}</span>
      </p>
    </div>
  );
};

const ActionItem = ({ action }: { action: Action }) => {
  const [, setKeysHovering] = useContext(CTXKeysHovering);
  const [actionRebinding, setActionRebinding] = useContext(CTXActionRebinding);
  const [userActionmap, setUserActionmap] = useContext(CTXUserActionmap);

  useEffect(() => {
    return () => {
      setKeysHovering([]);
    };
  }, [setKeysHovering]);

  return (
    <div className="Action" onMouseEnter={() => setKeysHovering([action.kbm.modifier, action.kbm.key])} onMouseLeave={() => setKeysHovering([])}>
      <Icon path={actionIcon(action._group, action.name) || ""} size="1.5rem" />
      <p className="name">{i18nUI(action.UILabel) || action.name}</p>
      {actionRebinding[0] === action._group && actionRebinding[1] === action.name ? (
        <>
          <div className="buttons">
            <button
              className="save"
              onClick={() => {
                setActionRebinding(["", ""]);
              }}
            >
              <Icon path={mdiContentSave} size="1rem" />
            </button>
          </div>
          <input
            type="checkbox"
            id={"multiTap_" + action.name}
            checked={action.multiTap === "2"}
            onChange={(e) => rebindAction(action._group, action.name, action.kbm.key, action.kbm.modifier, e.target.checked ? "2" : "", userActionmap, setUserActionmap)}
          />
          <label htmlFor={"multiTap_" + action.name}>双击</label>
          <p className="kbms">
            <select onChange={(e) => rebindAction(action._group, action.name, action.kbm.key, e.target.value, null, userActionmap, setUserActionmap)} value={action.kbm.modifier}>
              <option value="">无组合键</option>
              {modifiers.map((m) => (
                <option value={m} key={m}>
                  {m}
                </option>
              ))}
            </select>
            {<span>{action.kbm.key.length === 1 ? action.kbm.key.toUpperCase() : action.kbm.key || " "}</span>}
          </p>
        </>
      ) : (
        <>
          <div className="buttons">
            <button
              className="clear"
              onClick={() => {
                rebindAction(action._group, action.name, "", "", "", userActionmap, setUserActionmap);
              }}
            >
              <Icon path={mdiTrashCanOutline} size="1rem" />
            </button>
            <button
              className="reset"
              onClick={() => {
                resetAction(action._group, action.name, userActionmap, setUserActionmap);
              }}
            >
              <Icon path={mdiRestore} size="1rem" />
              默认
            </button>
            <button
              className="rebind"
              onClick={() => {
                setActionRebinding([action._group, action.name]);
              }}
            >
              <Icon path={mdiPencil} size="1rem" />
            </button>
          </div>
          <p className="kbms">
            {action.kbm.key && action.multiTap === "2" && "双击"}
            {action.kbm.modifier && <span>{action.kbm.modifier}</span>}
            {action.kbm.key && <span>{action.kbm.key.length === 1 ? action.kbm.key.toUpperCase() : action.kbm.key}</span>}
          </p>
        </>
      )}
    </div>
  );
};

export default ActionMap;
