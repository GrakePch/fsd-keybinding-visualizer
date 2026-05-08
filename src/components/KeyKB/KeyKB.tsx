import { useContext, useEffect, useState } from "react";
import "./KeyKB.css";
import { CTXOrderInfo, CTXKeysHovering, CTXCombinedActionGroups, CTXActionRebinding, CTXActionBindingDraft, CTXLanguage } from "../../contexts";
import { useSearchParams } from "react-router-dom";
import { getModifier, i18nUI, modifiers } from "../../utils/utils";
import Icon from "@mdi/react";
import actionIcon from "../../icons/actionIcon";
import { actionMapCategoriesMap, filterOurHidden } from "../../utils/actionMapCategories";
import { OrderInfo, ActionGroup } from "../../interfaces";
import { cigInputNonBinable, formatKeyLabel } from "../../utils/keyCodes";

const KeyKB = ({ keyId, widthX, heightX }: { keyId: string; widthX?: number; heightX?: number }) => {
  widthX = widthX || 1;
  heightX = heightX || 1;
  const gap = 0.5;
  const [searchParam, setSearchParam] = useSearchParams();
  const [combinedActionGroups] = useContext(CTXCombinedActionGroups);
  const orderInfo = useContext(CTXOrderInfo);
  const [keysHovering] = useContext(CTXKeysHovering);
  const [actionOnKey, setActionOnKey] = useState({ g: "", a: "" });
  const [actionRebinding] = useContext(CTXActionRebinding);
  const [, setActionBindingDraft] = useContext(CTXActionBindingDraft);
  const [language] = useContext(CTXLanguage);

  useEffect(() => {
    setActionOnKey(getShownAction(orderInfo, keyId, searchParam, combinedActionGroups));
  }, [orderInfo, keyId, searchParam, combinedActionGroups]);
  return (
    <div
      className="KeyKB"
      style={{
        width: widthX * 4 + "rem",
        height: "4.5rem",
        padding: gap / 2 + "rem",
      }}
    >
      {keyId ? (
        <div
          className={"cap " + keyId + (keysHovering.includes(keyId) ? " hover" : "") + (searchParam.get("k") === keyId ? " highlighted" : "")}
          style={{
            height: heightX * 4.5 - gap + "rem",
          }}
          onClick={() => {
            if (cigInputNonBinable.has(keyId)) return;
            if (actionRebinding[0]) {
              setActionBindingDraft((draft) =>
                draft
                  ? {
                      ...draft,
                      current: {
                        ...draft.current,
                        kbm: {
                          ...draft.current.kbm,
                          key: keyId,
                        },
                      },
                    }
                  : draft
              );
            } else {
              const nextSearchParam = new URLSearchParams(searchParam);
              if (nextSearchParam.get("k") === keyId) nextSearchParam.delete("k");
              else nextSearchParam.set("k", keyId);
              setSearchParam(nextSearchParam);
            }
          }}
        >
          <div className="key-face">
            {actionOnKey.a &&
              (actionIcon(actionOnKey.g, actionOnKey.a) ? (
                <Icon className={getModifier(combinedActionGroups, actionOnKey.g, actionOnKey.a)} path={actionIcon(actionOnKey.g, actionOnKey.a)} size="2rem" />
              ) : (
                <div className={"action-label " + getModifier(combinedActionGroups, actionOnKey.g, actionOnKey.a)}>{i18nUI(combinedActionGroups[actionOnKey.g].actions[actionOnKey.a].UILabel, language) || actionOnKey.a}</div>
              ))}
          </div>
          <div className="key-side">
            <p className="key-label" title={keyId}>
              {formatKeyLabel(keyId)}
            </p>
          </div>
        </div>
      ) : (
        <div
          className="_empty"
          style={{
            height: heightX * 4.5 - gap + "rem",
          }}
        ></div>
      )}
    </div>
  );
};

export default KeyKB;

const getShownAction = (orderInfo: OrderInfo, keyId: string, searchParam: URLSearchParams, actionGroups: Record<string, ActionGroup>): { g: string; a: string } => {
  const groupNames = searchParam.get("c") ? actionMapCategoriesMap[searchParam.get("c") as string] : filterOurHidden(orderInfo.groupOrder);
  if (modifiers.includes(searchParam.get("k") || "")) {
    for (const groupName of groupNames) {
      if (orderInfo.inGroupOrder[groupName])
        for (const actionName of orderInfo.inGroupOrder[groupName]) {
          if (groupName in actionGroups === false) continue;
          const action = actionGroups[groupName].actions[actionName];
          if (!action.UILabel) continue;
          if (action.kbm.modifier === searchParam.get("k") && action.kbm.key === keyId) {
            return { g: groupName, a: actionName };
          }
        }
    }
    return { g: "", a: "" };
  } else {
    let tempActionOnKey = { g: "", a: "" };
    let tempActionOnKeyWithModifier = { g: "", a: "" };
    let breakLoop = false;
    for (const groupName of groupNames) {
      if (orderInfo.inGroupOrder[groupName])
        for (const actionName of orderInfo.inGroupOrder[groupName]) {
          if (groupName in actionGroups === false) continue;
          const action = actionGroups[groupName].actions[actionName];
          if (!action.UILabel) continue;
          if (action.kbm.modifier === "" && action.kbm.key === keyId) {
            tempActionOnKey = { g: groupName, a: actionName };
            breakLoop = true;
            break;
          } else if (action.kbm.modifier !== "" && action.kbm.key === keyId) {
            if (!tempActionOnKeyWithModifier.a) tempActionOnKeyWithModifier = { g: groupName, a: actionName };
          }
        }
      if (breakLoop) break;
    }
    return tempActionOnKey.a ? tempActionOnKey : tempActionOnKeyWithModifier;
  }
};
