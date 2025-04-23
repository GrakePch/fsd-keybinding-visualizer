import { useEffect, useState } from "react";
import "./App.css";
import KeyboardFull from "./components/KeyboardFull/KeyboardFull";
import ActionMap from "./components/ActionMap/ActionMap";
import { CTXDefaultActionGroups, CTXOrderInfo, CTXKeysHovering, CTXCombinedActionGroups, CTXUserActionmap, CTXActionRebinding } from "./contexts";
import { ActionGroup, OrderInfo, UserActionmap } from "./interfaces";
import { useSearchParams } from "react-router-dom";
import { actionMapCategories } from "./utils/actionMapCategories";
import defaultProfile from "./data/defaultProfile.json";
import { initDefaultActionGroups, rebindAction } from "./utils/utils";
import { keyCodeToCigInput } from "./utils/keyCodes";

function App() {
  const [searchParam, setSearchParam] = useSearchParams();
  const [defaultActionGroups, setDefaultActionGroups] = useState<Record<string, ActionGroup>>({});
  const [orderInfo, setOrderInfo] = useState<OrderInfo>({ groupOrder: [], inGroupOrder: {} });
  const [keysHovering, setKeysHovering] = useState<string[]>([]);
  const [userActionmap, setUserActionmap] = useState<UserActionmap>({});
  const [combinedActionGroups, setCombinedActionGroups] = useState<Record<string, ActionGroup>>({});
  const [actionRebinding, setActionRebinding] = useState<[string, string]>(["", ""]);

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

  return (
    <CTXOrderInfo.Provider value={orderInfo}>
      <CTXDefaultActionGroups.Provider value={defaultActionGroups}>
        <CTXUserActionmap.Provider value={[userActionmap, setUserActionmap]}>
          <CTXCombinedActionGroups.Provider value={[combinedActionGroups, setCombinedActionGroups]}>
            <CTXKeysHovering.Provider value={[keysHovering, setKeysHovering]}>
              <CTXActionRebinding.Provider value={[actionRebinding, setActionRebinding]}>
                <KeyboardFull />
                <ActionMap />
              </CTXActionRebinding.Provider>
            </CTXKeysHovering.Provider>
          </CTXCombinedActionGroups.Provider>
        </CTXUserActionmap.Provider>
      </CTXDefaultActionGroups.Provider>
    </CTXOrderInfo.Provider>
  );
}

export default App;
