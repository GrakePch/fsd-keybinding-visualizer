import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { CTXOrderInfo, CTXCombinedActionGroups, CTXLanguage } from "../../contexts";
import { actionMapCategories, actionMapCategoriesMap, filterOurHidden } from "../../utils/actionMapCategories";
import { useSearchParams } from "react-router-dom";
import ActionGroupHeader from "./ActionGroupHeader";
import ActionItem from "./ActionItem";
import styles from "./ActionMap.module.css";
import { useActionMapVirtualRows } from "./useActionMapVirtualRows";

const ACTION_MAP_OVERSCAN_ROWS = 8;
const GROUP_ROW_HEIGHT_REM = 2.5;
const ACTION_ROW_HEIGHT_REM = 2;

const getRootRemSize = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

const ActionMap = () => {
  const [searchParam, setSearchParam] = useSearchParams();
  const orderInfo = useContext(CTXOrderInfo);
  const [combinedActionGroups] = useContext(CTXCombinedActionGroups);
  const [language] = useContext(CTXLanguage);
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
  const selectedCategory = searchParam.get("c");
  const visibleGroupNames = selectedCategory ? actionMapCategoriesMap[selectedCategory] ?? [] : filterOurHidden(orderInfo.groupOrder);
  const virtualRows = useActionMapVirtualRows({
    activeKeyFilter,
    actionRowHeight,
    combinedActionGroups,
    expandedGroups,
    groupRowHeight,
    orderInfo,
    visibleGroupNames,
  });

  const totalRowsHeight = virtualRows.at(-1) ? virtualRows.at(-1)!.top + virtualRows.at(-1)!.height : 0;
  const visibleStart = Math.max(0, listViewport.scrollTop - ACTION_MAP_OVERSCAN_ROWS * actionRowHeight);
  const visibleEnd = listViewport.scrollTop + listViewport.height + ACTION_MAP_OVERSCAN_ROWS * actionRowHeight;
  const visibleRows = virtualRows.filter((row) => row.top + row.height >= visibleStart && row.top <= visibleEnd);

  return (
    <div className={styles.root}>
      <select
        className={styles.categorySelect}
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

      <div className={styles.actionGroupList} ref={listRef} onScroll={updateListViewport}>
        <div className={styles.virtualSpace} style={{ height: totalRowsHeight }}>
          {visibleRows.map((row) => (
            <div className={styles.virtualRow} key={row.key} style={{ height: row.height, transform: `translateY(${row.top}px)` }}>
              {row.type === "group" ? (
                <ActionGroupHeader
                  group={row.group}
                  isExpanded={row.isExpanded}
                  onToggle={() => {
                    setExpandedGroups((groups) => ({ ...groups, [row.group.name]: !(groups[row.group.name] ?? true) }));
                  }}
                  language={language}
                />
              ) : (
                <ActionItem action={row.action} language={language} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActionMap;
