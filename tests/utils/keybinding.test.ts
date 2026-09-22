import { describe, expect, it } from "vitest";
import defaultProfile from "../../src/data/defaultProfile.json";
import { buildActionmapsXML, createInputBinding, getActivationModeDefinitions, getListActions, getUserActionmap, initActions, isSupportedKbmAction, maxisInputs, updateInputBinding } from "../../src/utils/utils";

describe("keybinding input bindings", () => {
  it("recognizes mouse inputs that use the kb1 serialization prefix", () => {
    const binding = createInputBinding("kb1_mouse2");

    expect(binding).toMatchObject({
      rawInput: "kb1_mouse2",
      device: "mouse",
      kind: "button",
      inputName: "mouse2",
      serializationPrefix: "kb1",
    });
  });

  it("keeps keyboard modifiers separate from the input token", () => {
    const binding = createInputBinding("kb1_lalt+f");

    expect(binding).toMatchObject({
      device: "keyboard",
      inputName: "f",
      modifier: "lalt",
      rawInput: "kb1_lalt+f",
    });
  });

  it("classifies a modified mouse token by its input instead of the kb1 prefix", () => {
    const binding = createInputBinding("kb1_lalt+mouse2");

    expect(binding).toMatchObject({
      device: "mouse",
      kind: "button",
      inputName: "mouse2",
      modifier: "lalt",
    });
  });

  it("reads per-device activation modes from default-profile child nodes", () => {
    const action = initActions(
      {
        _name: "prone_rollleft",
        keyboard: { _input: "q", _activationMode: "double_tap" },
        gamepad: { _input: "shoulderl+thumbl_left", _activationMode: "tap" },
      },
      { _name: "fps" , action: { _name: "prone_rollleft" } },
    );

    expect(action.keyboard[0]).toMatchObject({ inputName: "q", activationMode: "double_tap" });
    expect(action.gamepad).toMatchObject({ key: "thumbl_left", modifier: "shoulderl" });
    expect(action.bindings.find((binding) => binding.device === "gamepad")?.activationMode).toBe("tap");
  });

  it("treats keyboard and mouse as one kbm slot in the default profile", () => {
    const action = initActions(
      { _name: "fire", _keyboard: "f", _mouse: "mouse2" },
      { _name: "ship", action: { _name: "fire" } },
    );

    expect(action.bindings.filter((binding) => binding.device === "keyboard" || binding.device === "mouse")).toHaveLength(1);
    expect(action.kbm).toEqual({ key: "f", modifier: "" });
    expect(action.kbmActionType).toBe("non-maxis");
  });

  it("derives maxis action type from a default axis token regardless of its XML device attribute", () => {
    const action = initActions(
      { _name: "throttle", _keyboard: "lalt+maxis_z" },
      { _name: "ship", action: { _name: "throttle" } },
    );

    expect(action.kbmActionType).toBe("maxis");
    expect(action.kbm).toEqual({ key: "maxis_z", modifier: "lalt" });
    expect(action.bindings[0]).toMatchObject({ device: "mouse", kind: "axis" });
  });

  it("limits the supported action scope to UILabel actions without inputdata", () => {
    expect(isSupportedKbmAction({ _name: "visible", _UILabel: "@visible", _keyboard: "f" })).toBe(true);
    expect(isSupportedKbmAction({ _name: "unbound", _UILabel: "@unbound" })).toBe(true);
    expect(isSupportedKbmAction({ _name: "blank-keyboard", _UILabel: "@blank", _keyboard: " ", _gamepad: "a" })).toBe(true);
    expect(isSupportedKbmAction({ _name: "empty-mouse", _UILabel: "@empty", _mouse: "", _joystick: "x" })).toBe(true);
    expect(isSupportedKbmAction({ _name: "hidden", _keyboard: "f" })).toBe(false);
    expect(isSupportedKbmAction({
      _name: "controller-only",
      _UILabel: "@controller",
      _gamepad: "thumbrx",
      _joystick: "x",
    })).toBe(false);
    expect(isSupportedKbmAction({
      _name: "multi-input",
      _UILabel: "@multi",
      keyboard: { inputdata: [{ _input: "enter" }, { _input: "np_enter" }] },
    })).toBe(false);
  });

  it("classifies the current supported default profile into the two kbm action types", () => {
    const actions = defaultProfile.profile.actionmap.flatMap((group) =>
      getListActions(group).filter(isSupportedKbmAction).map((rawAction) => initActions(rawAction, group))
    );

    expect(actions).toHaveLength(721);
    expect(actions.filter((action) => action.kbmActionType === "maxis")).toHaveLength(17);
    expect(new Set(actions.map((action) => action.kbmActionType))).toEqual(new Set(["maxis", "non-maxis"]));
    expect(maxisInputs).toEqual(["maxis_x", "maxis_y", "maxis_z"]);
    expect(actions.filter((action) => action.name === "v_view_yaw")).toHaveLength(0);
    expect(actions.filter((action) => action.name === "v_view_yaw_mouse")).toHaveLength(2);
  });

  it("writes a recorded modifier into the kb1 input", () => {
    const binding = createInputBinding("kb1_f");
    if (!binding) throw new Error("fixture binding could not be created");

    expect(updateInputBinding(binding, "mouse2", "lctrl")).toMatchObject({
      rawInput: "kb1_lctrl+mouse2",
      inputName: "mouse2",
      modifier: "lctrl",
    });
  });

  it("keeps only the first kbm rebind and preserves its activation mode", () => {
    const parsed = getUserActionmap({
      _c: {
        ActionMaps: [
          {
            _c: {
              ActionProfiles: [
                {
                  _c: {
                    actionmap: [
                      {
                        _a: { name: "ship" },
                        _c: {
                          action: [
                            {
                              _a: { name: "fire", customAction: "keep" },
                              _c: {
                                rebind: [
                                  { _a: { input: "kb1_mouse2", activationMode: "hold", custom: "keep" } },
                                  { _a: { input: "kb1_lalt+f", multiTap: "2" } },
                                ],
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    });

    expect(parsed.ship?.fire?.bindings).toHaveLength(1);
    expect(parsed.ship?.fire?.bindings[0]).toMatchObject({ device: "mouse", activationMode: "hold", rawInput: "kb1_mouse2" });
    expect(parsed.ship?.fire?.bindings[0].extraAttributes).toEqual({ custom: "keep" });
    expect(parsed.ship?.fire?.extraAttributes).toEqual({ customAction: "keep" });
  });

  it("writes mouse bindings with kb1 and keeps mode and extra attributes", () => {
    const binding = createInputBinding("kb1_mouse2", undefined, { custom: "keep&me" });
    if (!binding) throw new Error("fixture binding could not be created");
    binding.activationMode = "hold";

    const xml = buildActionmapsXML("", { ship: { fire: { bindings: [binding] } } });

    expect(xml).toContain('input="kb1_mouse2"');
    expect(xml).toContain('activationMode="hold"');
    expect(xml).toContain('custom="keep&amp;me"');
  });

  it("normalizes a default-profile mouse token when it enters a user rebind", () => {
    const binding = createInputBinding("mouse2", "keyboard");
    if (!binding) throw new Error("fixture binding could not be created");

    const xml = buildActionmapsXML("", { ship: { fire: { bindings: [binding] } } });

    expect(xml).toContain('input="kb1_mouse2"');
    expect(xml).not.toContain('input="mouse2"');
  });

  it("preserves a prefixed unknown input instead of rewriting it as kb1", () => {
    const binding = createInputBinding("vendor1_special_input");
    if (!binding) throw new Error("fixture binding could not be created");

    const xml = buildActionmapsXML("", { ship: { fire: { bindings: [binding] } } });

    expect(xml).toContain('input="vendor1_special_input"');
  });

  it("loads all activation modes and marks default usage", () => {
    const modes = getActivationModeDefinitions(defaultProfile);

    expect(modes).toHaveLength(18);
    expect(modes.find((mode) => mode.name === "hold")?.usedByDefault).toBe(true);
    expect(modes.find((mode) => mode.name === "tap_quicker")?.usedByDefault).toBe(false);
  });
});
