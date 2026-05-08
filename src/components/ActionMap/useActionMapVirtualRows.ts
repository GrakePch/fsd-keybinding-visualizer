import { useMemo } from "react";
import type { AppLanguage } from "../../contexts";
import type { Action, ActionGroup, OrderInfo } from "../../interfaces";
import { i18nUI } from "../../utils/utils";

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

export type ActionMapVirtualRow = ActionMapGroupRow | ActionMapActionRow;

type UseActionMapVirtualRowsProps = {
  activeKeyFilter: string | null;
  actionSearch: string;
  actionRowHeight: number;
  combinedActionGroups: Record<string, ActionGroup>;
  expandedGroups: Record<string, boolean>;
  groupRowHeight: number;
  language: AppLanguage;
  orderInfo: OrderInfo;
  visibleGroupNames: string[];
};

const includesActionSearch = (action: Action, language: AppLanguage, normalizedSearch: string) => {
  if (!normalizedSearch) return true;

  const localizedLabel = i18nUI(action.UILabel, language);
  const englishLabel = i18nUI(action.UILabel, "en");
  const searchValues = [localizedLabel, englishLabel];

  if (!localizedLabel) {
    searchValues.push(action.name);
  }

  return searchValues.some((value) => value.toLowerCase().includes(normalizedSearch));
};

export const useActionMapVirtualRows = ({
  activeKeyFilter,
  actionSearch,
  actionRowHeight,
  combinedActionGroups,
  expandedGroups,
  groupRowHeight,
  language,
  orderInfo,
  visibleGroupNames,
}: UseActionMapVirtualRowsProps) => {
  return useMemo(() => {
    const rows: ActionMapVirtualRow[] = [];
    let top = 0;
    const normalizedActionSearch = actionSearch.trim().toLowerCase();

    visibleGroupNames.forEach((groupName) => {
      const group = combinedActionGroups[groupName];
      const actionNames = orderInfo.inGroupOrder[groupName];
      if (!group || !actionNames) return;

      let filteredListActions = actionNames.map((actionName) => group.actions[actionName]).filter((action) => action?.UILabel);

      if (activeKeyFilter) {
        filteredListActions = filteredListActions.filter((action) => action.kbm.key === activeKeyFilter || action.kbm.modifier === activeKeyFilter);
      }

      if (normalizedActionSearch) {
        filteredListActions = filteredListActions.filter((action) => includesActionSearch(action, language, normalizedActionSearch));
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
  }, [actionRowHeight, actionSearch, activeKeyFilter, combinedActionGroups, expandedGroups, groupRowHeight, language, orderInfo.inGroupOrder, visibleGroupNames]);
};
