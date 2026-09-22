import type { BindingDevice, InputBinding, KbmActionType } from "../../interfaces";
import { formatKeyLabel } from "../../utils/keyCodes";

export const createEmptyBinding = (device: BindingDevice): InputBinding => ({
  rawInput: "",
  device,
  kind: "button",
  inputName: "",
  modifier: "",
  serializationPrefix: device === "gamepad" ? "gp1" : device === "joystick" ? "js1" : "kb1",
  rawInputIsSerialized: false,
  extraAttributes: {},
});

export const isKbmBinding = (binding: InputBinding) =>
  binding.device === "keyboard" || binding.device === "mouse";

export const isEditableBinding = (binding: InputBinding, actionType: KbmActionType = "non-maxis") =>
  isKbmBinding(binding) && (actionType === "maxis" ? binding.kind === "axis" : binding.kind !== "axis");

export const areBindingsEqual = (a: InputBinding, b: InputBinding) =>
  a.rawInput === b.rawInput &&
  a.device === b.device &&
  a.kind === b.kind &&
  a.inputName === b.inputName &&
  a.modifier === b.modifier &&
  a.serializationPrefix === b.serializationPrefix &&
  a.activationMode === b.activationMode &&
  a.multiTap === b.multiTap &&
  JSON.stringify(a.extraAttributes) === JSON.stringify(b.extraAttributes);

export const areBindingListsEqual = (a: InputBinding[], b: InputBinding[]) =>
  a.length === b.length && a.every((binding, index) => areBindingsEqual(binding, b[index]));

export const bindingLabel = (binding: InputBinding) => {
  if (!binding.inputName) return "";
  const modifier = binding.modifier ? `${formatKeyLabel(binding.modifier)} + ` : "";
  return `${modifier}${formatKeyLabel(binding.inputName)}`;
};
