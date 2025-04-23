export const layoutKB: (string | [string, number, number?])[][] = [
  ["escape", "", "f1", "f2", "f3", "f4", ["", 0.5], "f5", "f6", "f7", "f8", ["", 0.5], "f9", "f10", "f11", "f12", "print", "scrolllock", "pause"],
  ["backtick", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "minus", "equals", ["backspace", 2], "insert", "home", "pgup", "numlock", "np_divide", "np_multiply", "np_subtract"],
  [["tab", 1.5], "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "lbracket", "rbracket", ["backslash", 1.5], "delete", "end", "pgdn", "np_7", "np_8", "np_9", ["np_add", 1, 2]],
  [["capslock", 1.75], "a", "s", "d", "f", "g", "h", "j", "k", "l", "semicolon", "apostrophe", ["enter", 2.25], ["", 3], "np_4", "np_5", "np_6"],
  [["lshift", 2.25], "z", "x", "c", "v", "b", "n", "m", "comma", "period", "slash", ["rshift", 2.75], "", "up", "", "np_1", "np_2", "np_3", ["np_enter", 1, 2]],
  [["lctrl", 1.25], ["win", 1.25], ["lalt", 1.25], ["space", 6.25], ["ralt", 1.25], ["fn", 1.25], ["menu", 1.25], ["rctrl", 1.25], "left", "down", "right", ["np_0", 2], "np_period"],
];
