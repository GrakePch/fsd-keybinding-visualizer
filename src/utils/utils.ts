import {
  Action,
  ActionGroup,
  ActivationModeDefinition,
  BindingDevice,
  BindingKind,
  InputBinding,
  KbmActionType,
  KeyWithMod,
  OrderInfo,
  RawAction,
  RawActionGroup,
  RawDefaultProfile,
  UserActionOverride,
  UserActionmap,
} from "../interfaces";
import i18n from "../i18n";

export const modifiers = ["lalt", "ralt", "lctrl", "rctrl", "lshift", "rshift"];
export const maxisInputs = ["maxis_x", "maxis_y", "maxis_z"] as const;

const hasOwn = (value: object, property: string) =>
  Object.prototype.hasOwnProperty.call(value, property);

const hasDeviceField = (rawAction: RawAction, device: "keyboard" | "mouse" | "gamepad" | "joystick") =>
  hasOwn(rawAction, `_${device}`) || hasOwn(rawAction, device);

export function isSupportedKbmAction(rawAction: RawAction): boolean {
  if (!rawAction._UILabel?.trim()) return false;
  if ([rawAction.keyboard, rawAction.mouse, rawAction.gamepad, rawAction.joystick]
    .some((binding) => binding?.inputdata !== undefined)) return false;

  const hasKbmField = hasDeviceField(rawAction, "keyboard") || hasDeviceField(rawAction, "mouse");
  const hasControllerField = hasDeviceField(rawAction, "gamepad") || hasDeviceField(rawAction, "joystick");

  return hasKbmField || !hasControllerField;
}

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
    getListActions(rawGroup).filter(isSupportedKbmAction).forEach((rawAction) => {
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
  const kbmBinding = createDefaultBinding(rawAction._keyboard, rawAction.keyboard, "keyboard") || createDefaultBinding(rawAction._mouse, rawAction.mouse, "mouse");
  const bindings = [
    kbmBinding,
    createDefaultBinding(rawAction._gamepad, rawAction.gamepad, "gamepad"),
    createDefaultBinding(rawAction._joystick, rawAction.joystick, "joystick"),
  ].filter((binding): binding is InputBinding => binding !== null);
  const keyboard = bindings.filter((binding) => binding.device === "keyboard");
  const mouse = bindings.filter((binding) => binding.device === "mouse");
  const gamepad = bindings.find((binding) => binding.device === "gamepad");
  const joystick = bindings.find((binding) => binding.device === "joystick");

  return {
    _group: rawGroup._name,
    name: rawAction._name,
    onPress: rawAction._onPress || "",
    onHold: rawAction._onHold || "",
    onRelease: rawAction._onRelease || "",
    always: rawAction._always || "",
    activationMode: rawAction._activationMode || rawAction._ActivationMode || "",
    retriggerable: rawAction._retriggerable || "",
    kbmActionType: getKbmActionType(kbmBinding),
    kbm: keyWithModFromBinding(kbmBinding || undefined),
    bindings,
    keyboard,
    mouse,
    gamepad: keyWithModFromBinding(gamepad),
    joystick: keyWithModFromBinding(joystick),
    UILabel: rawAction._UILabel || "",
    UIDescription: rawAction._UIDescription || "",
    category: rawAction._Category || "",
  };
}

function getKbmActionType(binding: InputBinding | null): KbmActionType {
  return binding?.kind === "axis" ? "maxis" : "non-maxis";
}

function createDefaultBinding(input: string | undefined, deviceBinding: RawAction["keyboard"], device: BindingDevice): InputBinding | null {
  const binding = createInputBinding(deviceBinding?._input ?? input ?? "", device);
  if (!binding) return null;
  binding.activationMode = deviceBinding?._activationMode;
  return binding;
}

const mouseButtonPattern = /^mouse\d+$/i;
const mouseAxisPattern = /^maxis_/i;
const mouseWheelPattern = /^mwheel_(up|down)$/i;
const serializedPrefixPattern = /^(kb|ms|gp|js)(\d*)_(.+)$/i;

const getSerializedParts = (rawInput: string) => {
  const normalized = rawInput.trim().toLowerCase();
  const match = normalized.match(serializedPrefixPattern);
  if (!match) return { prefix: "", inputName: normalized };

  return { prefix: `${match[1]}${match[2]}`, inputName: match[3] };
};

const getDeviceFromPrefix = (prefix: string): BindingDevice | null => {
  const normalized = prefix.toLowerCase();
  if (normalized.startsWith("gp")) return "gamepad";
  if (normalized.startsWith("js")) return "joystick";
  if (normalized.startsWith("ms")) return "mouse";
  if (normalized.startsWith("kb")) return "keyboard";
  return null;
};

const getBindingDevice = (inputName: string, hint: BindingDevice | undefined, prefix: string): BindingDevice => {
  if (mouseButtonPattern.test(inputName) || mouseWheelPattern.test(inputName) || mouseAxisPattern.test(inputName)) return "mouse";

  const prefixedDevice = getDeviceFromPrefix(prefix);
  if (prefixedDevice && prefixedDevice !== "keyboard") return prefixedDevice;
  if (hint) return hint;
  if (prefixedDevice) return prefixedDevice;
  return "unknown";
};

const getBindingKind = (inputName: string, device: BindingDevice): BindingKind => {
  if (device === "mouse" && mouseWheelPattern.test(inputName)) return "wheel";
  if (device === "mouse" && mouseAxisPattern.test(inputName)) return "axis";
  if (device === "keyboard" || device === "mouse" || device === "gamepad" || device === "joystick") return "button";
  return "unknown";
};

export function createInputBinding(input: string, hint?: BindingDevice, extraAttributes: Record<string, string> = {}): InputBinding | null {
  const rawInput = input.trim();
  if (!rawInput) return null;

  const { prefix, inputName: serializedInputName } = getSerializedParts(rawInput);
  const parsed = parseInputString(serializedInputName);
  const inputName = parsed.key;
  const device = getBindingDevice(inputName, hint, prefix);
  const serializationPrefix = prefix || (device === "gamepad" ? "gp1" : device === "joystick" ? "js1" : "kb1");
  const indexMatch = serializationPrefix.match(/\d+$/);

  return {
    rawInput,
    device,
    kind: getBindingKind(inputName, device),
    inputName,
    modifier: parsed.modifier,
    serializationPrefix,
    rawInputIsSerialized: Boolean(prefix) || hint === undefined,
    ...(indexMatch ? { deviceIndex: Number(indexMatch[0]) } : {}),
    extraAttributes: { ...extraAttributes },
  };
}

export function updateInputBinding(binding: InputBinding, inputName: string, modifier = binding.modifier): InputBinding {
  const normalizedInputName = inputName.trim().toLowerCase();
  const normalizedModifier = modifier.trim().toLowerCase();
  const nextInputName = normalizedInputName;
  const prefix = binding.serializationPrefix || (binding.device === "gamepad" ? "gp1" : binding.device === "joystick" ? "js1" : "kb1");
  const serializedInput = normalizedModifier ? `${normalizedModifier}+${nextInputName}` : nextInputName;

  return {
    ...binding,
    rawInput: `${prefix}_${serializedInput}`,
    inputName: nextInputName,
    modifier: normalizedModifier,
    rawInputIsSerialized: true,
    kind: getBindingKind(normalizedInputName, binding.device),
  };
}

export function keyWithModFromBinding(binding: InputBinding | undefined): KeyWithMod {
  if (!binding) return { key: "", modifier: "" };
  return { key: binding.inputName, modifier: binding.modifier };
}

export function applyBindingsToAction(action: Action, bindings: InputBinding[]): Action {
  const nextBindings = normalizeBindingList(bindings);
  const kbmBinding = nextBindings.find((binding) => binding.device === "keyboard" || binding.device === "mouse");
  const keyboard = nextBindings.filter((binding) => binding.device === "keyboard");
  const mouse = nextBindings.filter((binding) => binding.device === "mouse");

  return {
    ...action,
    bindings: nextBindings,
    keyboard,
    mouse,
    kbm: keyWithModFromBinding(kbmBinding),
  };
}

export function normalizeBindingList(bindings: InputBinding[]): InputBinding[] {
  let hasKbmBinding = false;
  return bindings.filter((binding) => {
    if (binding.device !== "keyboard" && binding.device !== "mouse") return true;
    if (hasKbmBinding) return false;
    hasKbmBinding = true;
    return true;
  }).map((binding) => structuredClone(binding));
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

export function getActivationModeDefinitions(rawDefaultProfile: RawDefaultProfile): ActivationModeDefinition[] {
  const rawModes = rawDefaultProfile.profile.ActivationModes?.ActivationMode;
  const modes = Array.isArray(rawModes) ? rawModes : rawModes ? [rawModes] : [];
  const usedByDefault = new Set<string>();

  rawDefaultProfile.profile.actionmap?.forEach((group) => {
    getListActions(group).forEach((action) => {
      const mode = action._activationMode || action._ActivationMode;
      if (mode) usedByDefault.add(mode);
      [action.keyboard, action.mouse, action.gamepad, action.joystick].forEach((deviceBinding) => {
        if (deviceBinding?._activationMode) usedByDefault.add(deviceBinding._activationMode);
      });
    });
  });

  return modes.map((mode) => ({
    name: mode._name,
    onPress: mode._onPress || "",
    onHold: mode._onHold || "",
    onRelease: mode._onRelease || "",
    multiTap: mode._multiTap || "",
    multiTapBlock: mode._multiTapBlock || "",
    pressTriggerThreshold: mode._pressTriggerThreshold || "",
    releaseTriggerThreshold: mode._releaseTriggerThreshold || "",
    releaseTriggerDelay: mode._releaseTriggerDelay || "",
    retriggerable: mode._retriggerable || "",
    usedByDefault: usedByDefault.has(mode._name),
  }));
}

function normalizeLocale(lang?: string): "en" | "zh" {
  if (lang?.toLowerCase().startsWith("zh")) {
    return "zh";
  }

  return "en";
}

export function i18nUI(label: string, lang?: string): string {
  const normalizedLabel = label.trim();
  const isToken = normalizedLabel.startsWith("@");
  const key = isToken ? normalizedLabel.slice(1).toLowerCase() : normalizedLabel.toLowerCase();
  const locale = normalizeLocale(lang);

  if (i18n.exists(key, { lng: locale, ns: "keybinding" })) {
    return i18n.getFixedT(locale, "keybinding")(key);
  }

  if (i18n.exists(key, { lng: "en", ns: "keybinding" })) {
    return i18n.getFixedT("en", "keybinding")(key);
  }

  return isToken ? "" : label;
}

export function getModifier(actionGroups: Record<string, ActionGroup>, groupName: string, actionName: string): string {
  return actionGroups[groupName]?.actions[actionName].kbm.modifier;
}

export function getUserActionmap(userActionmapParsed: object): UserActionmap {
  try {
    const root = userActionmapParsed as JsonXmlNode;
    const actionMaps = root._c?.ActionMaps || [root];
    const profiles = actionMaps.flatMap((map) => map._c?.ActionProfiles || []);
    const actionmaps = profiles.flatMap((profile) => profile._c?.actionmap || []);
    const res: UserActionmap = {};

    actionmaps.forEach((group) => {
      const groupName = group._a?.name;
      if (!groupName) return;
      const actions: Record<string, UserActionOverride> = {};
      (group._c?.action || []).forEach((action) => {
        const actionName = action._a?.name;
        if (!actionName) return;
        const bindings = normalizeBindingList((action._c?.rebind || []).flatMap((rebind) => {
          const attributes = rebind._a || {};
          const input = attributes.input || "";
          if (!input) return [];
          const extraAttributes = Object.fromEntries(Object.entries(attributes).filter(([name]) => !["input", "activationMode", "multiTap"].includes(name)));
          const binding = createInputBinding(input, undefined, extraAttributes);
          if (!binding) return [];
          binding.activationMode = attributes.activationMode;
          binding.multiTap = attributes.multiTap;
          return [binding];
        }));
        const extraAttributes = Object.fromEntries(Object.entries(action._a || {}).filter(([name]) => name !== "name"));
        actions[actionName] = { bindings, extraAttributes };
      });
      res[groupName] = actions;
    });

    return res;
  } catch {
    return {};
  }
}

interface JsonXmlNode {
  _a?: Record<string, string>;
  _c?: Record<string, JsonXmlNode[]>;
}

export function rebindAction(groupName: string, actionName: string, bindings: InputBinding[], userActionmap: UserActionmap, setUserActionmap: React.Dispatch<React.SetStateAction<UserActionmap>>): void {
  const actionGroup = userActionmap[groupName] || {};

  setUserActionmap({
    ...userActionmap,
    [groupName]: {
      ...actionGroup,
      [actionName]: {
        bindings: normalizeBindingList(bindings),
      },
    },
  });
}

export function resetAction(groupName: string, actionName: string, userActionmap: UserActionmap, setUserActionmap: React.Dispatch<React.SetStateAction<UserActionmap>>): void {
  const actionGroup = userActionmap[groupName];
  if (!actionGroup?.[actionName]) return;

  const nextActionGroup = { ...actionGroup };
  delete nextActionGroup[actionName];

  const nextUserActionmap = { ...userActionmap };
  if (Object.keys(nextActionGroup).length === 0) delete nextUserActionmap[groupName];
  else nextUserActionmap[groupName] = nextActionGroup;

  setUserActionmap(nextUserActionmap);
}

export function buildActionmapsXML(userImportXMLStr: string, userActionmap: UserActionmap): string {
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
      const children = Object.entries(actions).map(([actionName, { bindings, extraAttributes }]) => {
        const actionAttributes = Object.entries(extraAttributes || {}).map(([name, value]) => `${name}="${escapeXml(value)}"`);
        const rebinds = normalizeBindingList(bindings).map((binding) => {
          const attributes = [
            `input="${escapeXml(serializedInputForBinding(binding))}"`,
            binding.activationMode ? `activationMode="${escapeXml(binding.activationMode)}"` : "",
            binding.multiTap ? `multiTap="${escapeXml(binding.multiTap)}"` : "",
            ...Object.entries(binding.extraAttributes).map(([name, value]) => `${name}="${escapeXml(value)}"`),
          ].filter(Boolean);
          return `    <rebind ${attributes.join(" ")}/>`;
        });
        return `  <action name="${escapeXml(actionName)}"${actionAttributes.length ? ` ${actionAttributes.join(" ")}` : ""}>\n${rebinds.join("\n")}\n  </action>\n`;
      });
      return head + children.join("") + tail;
    })
    .join("");
}

function buildInputString(binding: InputBinding): string {
  const prefix = binding.serializationPrefix || (binding.device === "gamepad" ? "gp1" : binding.device === "joystick" ? "js1" : "kb1");
  const input = binding.modifier ? `${binding.modifier}+${binding.inputName}` : binding.inputName;
  return `${prefix}_${input}`;
}

function serializedInputForBinding(binding: InputBinding): string {
  return binding.rawInputIsSerialized ? binding.rawInput : buildInputString(binding);
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (character) => {
    switch (character) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      default:
        return "&quot;";
    }
  });
}
