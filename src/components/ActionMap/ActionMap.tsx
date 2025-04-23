import "./ActionMap.css";
import { ChangeEvent, useContext, useState } from "react";
import Icon from "@mdi/react";
import { mdiChevronRight, mdiContentSave, mdiPencil, mdiRestore, mdiTrashCanOutline } from "@mdi/js";
import { CTXOrderInfo, CTXKeysHovering, CTXCombinedActionGroups, CTXUserActionmap, CTXActionRebinding } from "../../contexts";
import { actionMapCategories, actionMapCategoriesMap, filterOurHidden } from "../../utils/actionMapCategories";
import { useSearchParams } from "react-router-dom";
import { Action, ActionGroup, UserActionmap } from "../../interfaces";
import { getUserActionmap, i18nUI, modifiers, rebindAction, resetAction, buildActionmapsXML } from "../../utils/utils";
import xmlToJson from "../../utils/xmlToJson";
import actionIcon from "../../icons/actionIcon";

const ActionMap = () => {
  const [searchParam, setSearchParam] = useSearchParams();
  const orderInfo = useContext(CTXOrderInfo);
  const [userActionmap, setUserActionmap] = useContext(CTXUserActionmap);
  const [combinedActionGroups] = useContext(CTXCombinedActionGroups);
  const [userImportXMLStr, setUserImportXMLStr] = useState("");


  const exportActionmapAsXML = () => {
    const xml = buildActionmapsXML(userImportXMLStr, userActionmap);
    console.log(xml)
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "actionmap.xml";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

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

      <input type="file" id="inputActionMaps" name="actionMaps" accept=".xml" onChange={(e) => handleFileSelect(e, setUserActionmap, setUserImportXMLStr)} />

      <button className="export" onClick={exportActionmapAsXML}>导出 actionmap.xml</button>

      <ul className="list-action-groups">
        {(searchParam.get("c") ? actionMapCategoriesMap[searchParam.get("c") as string] : filterOurHidden(orderInfo.groupOrder)).map((groupName) => (
          <ActionGroupElm key={groupName} group={combinedActionGroups[groupName]} />
        ))}
      </ul>
    </div>
  );
};

const ActionGroupElm = ({ group }: { group: ActionGroup }) => {
  const searchParam = useSearchParams()[0];
  const [isExpanded, setIsExpanded] = useState(true);
  const orderInfo = useContext(CTXOrderInfo);
  if (!group) return null;

  let filteredListActions = orderInfo.inGroupOrder[group.name].map((actionName) => group.actions[actionName]).filter((action) => action.UILabel);

  if (searchParam.get("k")) {
    filteredListActions = filteredListActions.filter((action) => action.kbm.key === searchParam.get("k") || action.kbm.modifier === searchParam.get("k"));
  }

  return (
    filteredListActions.length > 0 && (
      <li className="ActionGroup">
        <p className="name" onClick={() => setIsExpanded(!isExpanded)}>
          <Icon path={mdiChevronRight} rotate={isExpanded ? 90 : 0} size="1.5rem" />
          {i18nUI(group.UILabel) || group.name}
        </p>
        <ul style={{ display: isExpanded ? "block" : "none" }}>
          {filteredListActions.map((action) => (
            <ActionItem key={action.name} action={action} />
          ))}
        </ul>
      </li>
    )
  );
};

const ActionItem = ({ action }: { action: Action }) => {
  const [, setKeysHovering] = useContext(CTXKeysHovering);
  const [actionRebinding, setActionRebinding] = useContext(CTXActionRebinding);
  const [userActionmap, setUserActionmap] = useContext(CTXUserActionmap);
  return (
    <li className="Action" onMouseEnter={() => setKeysHovering([action.kbm.modifier, action.kbm.key])} onMouseLeave={() => setKeysHovering([])}>
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
    </li>
  );
};

const handleFileSelect = (e: ChangeEvent<HTMLInputElement>, setUserActionmap: React.Dispatch<React.SetStateAction<UserActionmap>>, setUserImportXMLStr: React.Dispatch<React.SetStateAction<string>>) => {
  const files = e.target.files;
  if (!files) return;
  const file = files[0];

  if (!file) return;

  const reader = new FileReader();
  reader.readAsText(file);
  reader.onload = function (e) {
    if (!e.target) return;
    const xmlString = e.target.result as string;
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    const result = xmlToJson(xmlDoc);
    
    setUserImportXMLStr(xmlString);
    setUserActionmap(getUserActionmap(result));
  };
};

export default ActionMap;
