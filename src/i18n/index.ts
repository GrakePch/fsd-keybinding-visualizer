import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import keybindingEn from "./keybinding/en.json";
import keybindingZh from "./keybinding/zh.json";
import uiEn from "./ui/en.json";
import uiZh from "./ui/zh.json";

i18n.use(initReactI18next).init({
  resources: {
    en: {
      keybinding: keybindingEn,
      ui: uiEn,
    },
    zh: {
      keybinding: keybindingZh,
      ui: uiZh,
    },
  },
  fallbackLng: "en",
  lng: "en",
  ns: ["ui", "keybinding"],
  defaultNS: "ui",
  supportedLngs: ["en", "zh"],
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
