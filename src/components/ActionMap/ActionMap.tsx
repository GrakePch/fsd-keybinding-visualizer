import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
const ACTION_SEARCH_DEBOUNCE_MS = 1000;

const getRootRemSize = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

const ActionMap = () => {
  const [searchParam, setSearchParam] = useSearchParams();
  const { t } = useTranslation("ui");
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
  const actionSearch = searchParam.get("q") || "";
  const [actionSearchDraft, setActionSearchDraft] = useState(actionSearch);
  const selectedCategory = searchParam.get("c");
  const visibleGroupNames = selectedCategory ? actionMapCategoriesMap[selectedCategory] ?? [] : filterOurHidden(orderInfo.groupOrder);

  useEffect(() => {
    setActionSearchDraft(actionSearch);
  }, [actionSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (actionSearchDraft === actionSearch) return;

      const nextSearchParam = new URLSearchParams(searchParam);
      const nextSearch = actionSearchDraft.trim();
      if (nextSearch) nextSearchParam.set("q", nextSearch);
      else nextSearchParam.delete("q");
      setSearchParam(nextSearchParam);
    }, ACTION_SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [actionSearch, actionSearchDraft, searchParam, setSearchParam]);

  useEffect(() => {
    if (!listRef.current) return;

    listRef.current.scrollTop = 0;
    updateListViewport();
  }, [activeKeyFilter, actionSearch, selectedCategory, updateListViewport]);

  const virtualRows = useActionMapVirtualRows({
    activeKeyFilter,
    actionSearch,
    actionRowHeight,
    combinedActionGroups,
    expandedGroups,
    groupRowHeight,
    language,
    orderInfo,
    visibleGroupNames,
  });

  const totalRowsHeight = virtualRows.at(-1) ? virtualRows.at(-1)!.top + virtualRows.at(-1)!.height : 0;
  const visibleStart = Math.max(0, listViewport.scrollTop - ACTION_MAP_OVERSCAN_ROWS * actionRowHeight);
  const visibleEnd = listViewport.scrollTop + listViewport.height + ACTION_MAP_OVERSCAN_ROWS * actionRowHeight;
  const visibleRows = virtualRows.filter((row) => row.top + row.height >= visibleStart && row.top <= visibleEnd);

  return (
    <div className={styles.root}>
      <div className={styles.controls}>
        <input
          aria-label={t("actionMap.searchActions")}
          className={styles.actionSearch}
          placeholder={t("actionMap.searchActions")}
          type="search"
          value={actionSearchDraft}
          onChange={(e) => {
            setActionSearchDraft(e.target.value);
          }}
        />
        <select
          className={styles.categorySelect}
          value={searchParam.get("c") || ""}
          onChange={(e) => {
            const nextSearchParam = new URLSearchParams(searchParam);
            nextSearchParam.set("c", e.target.value);
            setSearchParam(nextSearchParam);
          }}
        >
          <option value="">{t("actionMap.allCategories")}</option>
          {actionMapCategories.map((c) => (
            <option value={c} key={c}>
              {t(`actionMap.categories.${c}`, { defaultValue: c })}
            </option>
          ))}
        </select>
        <button
          aria-hidden={!activeKeyFilter}
          className={`${styles.clearKeyFilterButton} ${activeKeyFilter ? "" : styles.clearKeyFilterButtonHidden}`}
          disabled={!activeKeyFilter}
          tabIndex={activeKeyFilter ? 0 : -1}
          type="button"
          onClick={() => {
            const nextSearchParam = new URLSearchParams(searchParam);
            nextSearchParam.delete("k");
            setSearchParam(nextSearchParam);
          }}
        >
          {t("actionMap.clearKeyFilter")}
        </button>
      </div>

      <div className={styles.actionGroupList} ref={listRef} onScroll={updateListViewport}>
        {virtualRows.length === 0 ? (
          <div className={styles.emptyState}>{t("actionMap.emptyState")}</div>
        ) : (
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
        )}
      </div>
    </div>
  );
};

export default ActionMap;
