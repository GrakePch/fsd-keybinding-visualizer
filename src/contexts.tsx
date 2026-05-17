import React, { createContext } from "react";
import { ActionGroup, KeyWithMod, OrderInfo, UserActionmap } from "./interfaces";
import { GameRootDirectoryState } from "./utils/fileSystemAccess";

export type AppLanguage = "en" | "zh";

export interface ActionBindingValue {
  kbm: KeyWithMod;
  multiTap: string;
}

export interface ActionBindingDraft {
  initial: ActionBindingValue;
  current: ActionBindingValue;
}

export const CTXOrderInfo = createContext<OrderInfo>({ groupOrder: [], inGroupOrder: {} });

export const CTXDefaultActionGroups = createContext<Record<string, ActionGroup>>({});

export const CTXUserActionmap = createContext<[UserActionmap, React.Dispatch<React.SetStateAction<UserActionmap>>]>([{}, () => {}]);

export const CTXCombinedActionGroups = createContext<[Record<string, ActionGroup>, React.Dispatch<React.SetStateAction<Record<string, ActionGroup>>>]>([{}, () => {}]);

export const CTXKeysHovering = createContext<[string[], React.Dispatch<React.SetStateAction<string[]>>]>([[], () => {}]);

export const CTXActionRebinding = createContext<[[string, string], React.Dispatch<React.SetStateAction<[string, string]>>]>([["", ""], () => {}]);

export const CTXActionBindingDraft = createContext<[ActionBindingDraft | null, React.Dispatch<React.SetStateAction<ActionBindingDraft | null>>]>([null, () => {}]);

export const CTXLanguage = createContext<[AppLanguage, React.Dispatch<React.SetStateAction<AppLanguage>>]>(["en", () => {}]);

export const CTXGameRootDirectory = createContext<[GameRootDirectoryState, React.Dispatch<React.SetStateAction<GameRootDirectoryState>>]>([{ rootDirectory: null, pathLabel: "" }, () => {}]);
