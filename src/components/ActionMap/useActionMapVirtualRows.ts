import { useMemo } from "react";
import type { Action, ActionGroup, OrderInfo } from "../../interfaces";

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
  actionRowHeight: number;
  combinedActionGroups: Record<string, ActionGroup>;
  expandedGroups: Record<string, boolean>;
  groupRowHeight: number;
  orderInfo: OrderInfo;
  visibleGroupNames: string[];
};

export const useActionMapVirtualRows = ({
  activeKeyFilter,
  actionRowHeight,
  combinedActionGroups,
  expandedGroups,
  groupRowHeight,
  orderInfo,
  visibleGroupNames,
}: UseActionMapVirtualRowsProps) => {
  return useMemo(() => {
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
};
