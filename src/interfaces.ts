export interface ActionGroup {
  name: string;
  version: string;
  UILabel: string;
  UICategory: string;
  actions: Record<string, Action>;
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

export type UserActionmap = Record<string, Record<string, { kbm: KeyWithMod; multiTap: string }> | null>;

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
    actionmap?: RawActionGroup[];
  };
}
