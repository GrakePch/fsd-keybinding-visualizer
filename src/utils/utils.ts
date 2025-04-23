import { Action, ActionGroup, KeyWithMod, OrderInfo, RawAction, RawActionGroup, RawDefaultProfile, UserActionmap } from "../interfaces";
import i18nRaw from "../i18n/i18n.json";

const i18n: Record<string, Record<string, string>> = i18nRaw;

export const modifiers = ["lalt", "ralt", "lctrl", "rctrl", "lshift", "rshift"];

export function initDefaultActionGroups(
  rawDefaultProfile: RawDefaultProfile,
  setDefaultActionGroups: React.Dispatch<React.SetStateAction<Record<string, ActionGroup>>>,
  setCombinedActionGroups: React.Dispatch<React.SetStateAction<Record<string, ActionGroup>>>,
  setOrderInfo: React.Dispatch<React.SetStateAction<OrderInfo>>
): void {
  const tempDefaultActionGroups: Record<string, ActionGroup> = {};
  const tempGroupOrder: string[] = [];
  const tempInGroupOrder: Record<string, string[]> = {};
  rawDefaultProfile.profile.actionmap?.forEach((rawGroup) => {
    tempGroupOrder.push(rawGroup._name);
    tempInGroupOrder[rawGroup._name] = [];
    tempDefaultActionGroups[rawGroup._name] = {
      name: rawGroup._name,
      version: rawGroup._version || "",
      UILabel: rawGroup._UILabel || "",
      UICategory: rawGroup._UICategory || "",
      actions: {},
    };
    getListActions(rawGroup).forEach((rawAction) => {
      const action = initActions(rawAction, rawGroup);
      tempInGroupOrder[rawGroup._name].push(action.name);
      tempDefaultActionGroups[rawGroup._name].actions[action.name] = action;
    });
  });
  setDefaultActionGroups(tempDefaultActionGroups);
  setCombinedActionGroups(structuredClone(tempDefaultActionGroups));
  setOrderInfo({ groupOrder: tempGroupOrder, inGroupOrder: tempInGroupOrder });
}

export function initActions(rawAction: RawAction, rawGroup: RawActionGroup): Action {
  return {
    _group: rawGroup._name,
    name: rawAction._name,
    onPress: rawAction._onPress || "",
    onHold: rawAction._onHold || "",
    onRelease: rawAction._onRelease || "",
    always: rawAction._always || "",
    activationMode: rawAction._activationMode || rawAction._ActivationMode || "",
    retriggerable: rawAction._retriggerable || "",
    kbm: parseInputString(rawAction._keyboard || rawAction._mouse || ""),
    gamepad: parseInputString(rawAction._gamepad || ""),
    joystick: parseInputString(rawAction._joystick || ""),
    UILabel: rawAction._UILabel || "",
    UIDescription: rawAction._UIDescription || "",
    category: rawAction._Category || "",
  };
}

export function getListActions(rawActionGroup: RawActionGroup): RawAction[] {
  if (Array.isArray(rawActionGroup.action)) return rawActionGroup.action;
  return [rawActionGroup.action];
}

export function parseInputString(input: string): KeyWithMod {
  const keyStr = input.trim();
  if (!keyStr) return { key: "", modifier: "" };
  const res = keyStr.toLowerCase().split("+");
  if (res.length == 0) return { key: "", modifier: "" };
  if (res.length == 1) return { key: res[0], modifier: "" };
  if (modifiers.includes(res[1])) return { key: res[0], modifier: res[1] };
  return { key: res[1], modifier: res[0] };
}

export function i18nUI(label: string, lang?: string): string {
  return i18n[label.slice(1).toLowerCase()]?.[lang || "zh_Hans"] || label;
}

export function getModifier(actionGroups: Record<string, ActionGroup>, groupName: string, actionName: string): string {
  return actionGroups[groupName]?.actions[actionName].kbm.modifier;
}

export function getUserActionmap(userActionmapParsed: object): UserActionmap {
  try {
    const res: Record<string, Record<string, { kbm: KeyWithMod; multiTap: string }> | null> = {};
    const userActionmap = userActionmapParsed._c.ActionMaps[0]._c.ActionProfiles[0]._c.actionmap;
    if (!userActionmap) return {};
    userActionmap.forEach((group) => {
      res[group._a.name] = {};
      group._c.action.forEach((action) => {
        const input = action._c.rebind[0]._a.input.split("_").at(-1);
        res[group._a.name][action._a.name] = {
          kbm: parseInputString(input || ""),
          multiTap: action._c.rebind[0]._a.multiTap || "",
        };
      });
    });
    return res;
  } catch (e) {
    return {};
  }
}

export function rebindAction(groupName: string, actionName: string, key: string, mod: string, multiTap: string | null, userActionmap: UserActionmap, setUserActionmap: React.Dispatch<React.SetStateAction<UserActionmap>>): void {
  if (!userActionmap[groupName]) userActionmap[groupName] = {};
  if (!userActionmap[groupName][actionName]) userActionmap[groupName][actionName] = { kbm: { key: "", modifier: "" }, multiTap: "" };
  userActionmap[groupName][actionName].kbm.key = key;
  userActionmap[groupName][actionName].kbm.modifier = mod;
  if (multiTap !== null) userActionmap[groupName][actionName].multiTap = multiTap;
  setUserActionmap({ ...userActionmap });
}

export function resetAction(groupName: string, actionName: string, userActionmap: UserActionmap, setUserActionmap: React.Dispatch<React.SetStateAction<UserActionmap>>): void {
  if (!userActionmap[groupName]) return;
  if (!userActionmap[groupName][actionName]) return;
  delete userActionmap[groupName][actionName];
  if (Object.keys(userActionmap[groupName]).length === 0) delete userActionmap[groupName];
  setUserActionmap({ ...userActionmap });
}

export function buildActionmapsXML(userImportXMLStr: string, userActionmap: UserActionmap): string {
  console.log(userImportXMLStr);
  const injectIdxStart = userImportXMLStr.indexOf("<actionmap");
  const injectIdxEnd = userImportXMLStr.indexOf("</ActionProfiles>");
  if (injectIdxStart === -1 || injectIdxEnd === -1)
    return `
<ActionMaps>
  <ActionProfiles version="1" optionsVersion="2" rebindVersion="2" profileName="default">

${userActionmapToXML(userActionmap)}
  </ActionProfiles>
</ActionMaps>`;
  return `${userImportXMLStr.slice(0, injectIdxStart)}${userActionmapToXML(userActionmap)}${userImportXMLStr.slice(injectIdxEnd)}`;
}

function userActionmapToXML(userActionmap: UserActionmap): string {
  return Object.entries(userActionmap)
    .map(([groupName, actions]) => {
      const head = `<actionmap name="${groupName}">\n`;
      const tail = `</actionmap>\n`;
      if (!actions) return "";
      const children = Object.entries(actions).map(
        ([actionName, { kbm, multiTap }]) => `  <action name="${actionName}">
    ${kbm.key ? `<rebind input="kb1_${kbm.modifier ? kbm.modifier + "+" + kbm.key : kbm.key}" ${multiTap ? `multiTap="${multiTap}"` : ""}/>` : ""}
  </action>\n`
      );
      return head + children.join("") + tail;
    })
    .join("");
}
