import React, { createContext } from "react";
import { ActionGroup, OrderInfo, UserActionmap } from "./interfaces";

export const CTXOrderInfo = createContext<OrderInfo>({ groupOrder: [], inGroupOrder: {} });

export const CTXDefaultActionGroups = createContext<Record<string, ActionGroup>>({});

export const CTXUserActionmap = createContext<[UserActionmap, React.Dispatch<React.SetStateAction<UserActionmap>>]>([{}, () => {}]);

export const CTXCombinedActionGroups = createContext<[Record<string, ActionGroup>, React.Dispatch<React.SetStateAction<Record<string, ActionGroup>>>]>([{}, () => {}]);

export const CTXKeysHovering = createContext<[string[], React.Dispatch<React.SetStateAction<string[]>>]>([[], () => {}]);

export const CTXActionRebinding = createContext<[[string, string], React.Dispatch<React.SetStateAction<[string, string]>>]>([["", ""], () => {}]);
