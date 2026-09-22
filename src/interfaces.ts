export interface ActionGroup {
  name: string;
  version: string;
  UILabel: string;
  UICategory: string;
  actions: Record<string, Action>;
}

export type BindingDevice = "keyboard" | "mouse" | "gamepad" | "joystick" | "unknown";

export type BindingKind = "button" | "wheel" | "axis" | "unknown";

export interface InputBinding {
  rawInput: string;
  device: BindingDevice;
  kind: BindingKind;
  inputName: string;
  modifier: string;
  serializationPrefix: string;
  rawInputIsSerialized?: boolean;
  deviceIndex?: number;
  activationMode?: string;
  multiTap?: string;
  extraAttributes: Record<string, string>;
}

export interface UserActionOverride {
  bindings: InputBinding[];
  extraAttributes?: Record<string, string>;
}

export interface Action {
  _group: string;
  name: string;
  onPress: string;
  onHold: string;
  onRelease: string;
  always: string;
  multiTap?: string;
  activationMode: string;
  retriggerable: string;
  kbm: KeyWithMod;
  bindings: InputBinding[];
  keyboard: InputBinding[];
  mouse: InputBinding[];
  gamepad: KeyWithMod;
  joystick: KeyWithMod;
  UILabel: string;
  UIDescription: string;
  category: string;
}

export interface KeyWithMod {
  key: string;
  modifier: string;
}

export interface OrderInfo {
  groupOrder: string[];
  inGroupOrder: Record<string, string[]>;
}

export type UserActionmap = Record<string, Record<string, UserActionOverride> | null>;

export interface RawAction {
  _name: string;
  _onPress?: string;
  _onHold?: string;
  _onRelease?: string;
  _always?: string;
  _activationMode?: string;
  _ActivationMode?: string;
  _retriggerable?: string;
  _keyboard?: string;
  _mouse?: string;
  _gamepad?: string;
  _joystick?: string;
  _UILabel?: string;
  _UIDescription?: string;
  _Category?: string;
  keyboard?: RawDeviceBinding;
  mouse?: RawDeviceBinding;
  gamepad?: RawDeviceBinding;
  joystick?: RawDeviceBinding;
}

export interface RawDeviceBinding {
  _activationMode?: string;
  _input?: string;
}

export interface RawActionGroup {
  _name: string;
  _version?: string;
  _UILabel?: string;
  _UICategory?: string;
  action: RawAction | RawAction[];
}

export interface RawDefaultProfile {
  profile: {
    ActivationModes?: {
      ActivationMode: RawActivationMode | RawActivationMode[];
    };
    actionmap?: RawActionGroup[];
  };
}

export interface RawActivationMode {
  _name: string;
  _onPress?: string;
  _onHold?: string;
  _onRelease?: string;
  _multiTap?: string;
  _multiTapBlock?: string;
  _pressTriggerThreshold?: string;
  _releaseTriggerThreshold?: string;
  _releaseTriggerDelay?: string;
  _retriggerable?: string;
}

export interface ActivationModeDefinition {
  name: string;
  onPress: string;
  onHold: string;
  onRelease: string;
  multiTap: string;
  multiTapBlock: string;
  pressTriggerThreshold: string;
  releaseTriggerThreshold: string;
  releaseTriggerDelay: string;
  retriggerable: string;
  usedByDefault: boolean;
}
