import { SavedCameraSlot, SavedViewAttributes, SavedViewGroup, SavedViewsDocument, Vec3 } from "../types/savedViews";

const DEFAULT_TYPE = "OrbitSCItemSeat";
const DEFAULT_ROTATION: Vec3 = { x: -15, y: 0, z: 0 };
const DEFAULT_OFFSET: Vec3 = { x: 0, y: 0, z: 0 };

const SLOT_KNOWN_ATTRIBUTES = ["id", "Type", "CameraRotationAngle", "Distance", "TargetOffset", "LensSize", "FStop"];

const getAttributes = (element: Element): SavedViewAttributes => {
  const attributes: SavedViewAttributes = {};

  for (const attr of Array.from(element.attributes)) {
    attributes[attr.name] = attr.value;
  }

  return attributes;
};

const parseNumber = (value: string | null | undefined, fallback: number) => {
  if (value === null || value === undefined || value.trim() === "") return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const parseVec3 = (value: string | null | undefined, fallback: Vec3 = DEFAULT_OFFSET): Vec3 => {
  if (!value) return { ...fallback };

  const parts = value.split(",").map((part) => Number(part.trim()));
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return { ...fallback };

  return { x: parts[0], y: parts[1], z: parts[2] };
};

const formatNumber = (value: number) => (Number.isFinite(value) ? String(value) : "0");

export const formatVec3 = (value: Vec3) => [value.x, value.y, value.z].map(formatNumber).join(",");

const escapeAttribute = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const attributesToXml = (attributes: SavedViewAttributes) =>
  Object.entries(attributes)
    .map(([name, value]) => `${name}="${escapeAttribute(value)}"`)
    .join(" ");

export function createDefaultCameraSlot(slotId: number): SavedCameraSlot {
  return {
    id: slotId,
    type: DEFAULT_TYPE,
    cameraRotationAngle: { ...DEFAULT_ROTATION },
    distance: 1,
    targetOffset: { ...DEFAULT_OFFSET },
    lensSize: 2,
    fStop: 11,
    rawAttributes: {},
  };
}

export function copyCameraSlot(source: SavedCameraSlot, targetSlotId: number): SavedCameraSlot {
  return {
    ...source,
    id: targetSlotId,
    cameraRotationAngle: { ...source.cameraRotationAngle },
    targetOffset: { ...source.targetOffset },
    rawAttributes: { ...source.rawAttributes, id: String(targetSlotId) },
  };
}

const parseSlot = (element: Element): SavedCameraSlot => {
  const rawAttributes = getAttributes(element);
  const id = Math.trunc(parseNumber(rawAttributes.id, 0));

  return {
    id,
    type: rawAttributes.Type || DEFAULT_TYPE,
    cameraRotationAngle: parseVec3(rawAttributes.CameraRotationAngle, DEFAULT_ROTATION),
    distance: parseNumber(rawAttributes.Distance, 1),
    targetOffset: parseVec3(rawAttributes.TargetOffset, DEFAULT_OFFSET),
    lensSize: parseNumber(rawAttributes.LensSize, 2),
    fStop: parseNumber(rawAttributes.FStop, 11),
    rawAttributes,
  };
};

export function parseSavedViewsXml(xmlString: string): SavedViewsDocument {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  const parserError = xmlDoc.querySelector("parsererror");
  if (parserError) throw new Error("Invalid savedviews.xml");

  const root = xmlDoc.querySelector("SavedViews");
  if (!root) throw new Error("savedviews.xml must contain a SavedViews root node");

  const groups: SavedViewGroup[] = Array.from(root.children)
    .filter((child) => child.tagName === "Group")
    .map((groupElement) => ({
      id: groupElement.getAttribute("ID") || "",
      rawAttributes: getAttributes(groupElement),
      slots: Array.from(groupElement.children)
        .filter((child) => child.tagName === "Slot")
        .map(parseSlot)
        .sort((a, b) => a.id - b.id),
    }));

  return { groups, originalXmlString: xmlString };
}

export function getSlotById(group: SavedViewGroup, slotId: number) {
  return group.slots.find((slot) => slot.id === slotId);
}

const slotToAttributes = (slot: SavedCameraSlot): SavedViewAttributes => {
  const attributes: SavedViewAttributes = { ...slot.rawAttributes };

  attributes.id = String(slot.id);
  attributes.Type = slot.type;
  attributes.CameraRotationAngle = formatVec3(slot.cameraRotationAngle);
  attributes.Distance = formatNumber(slot.distance);
  attributes.TargetOffset = formatVec3(slot.targetOffset);
  attributes.LensSize = formatNumber(slot.lensSize);
  attributes.FStop = formatNumber(slot.fStop);

  const orderedAttributes: SavedViewAttributes = {};
  for (const name of SLOT_KNOWN_ATTRIBUTES) {
    orderedAttributes[name] = attributes[name];
    delete attributes[name];
  }

  return { ...orderedAttributes, ...attributes };
};

const groupToAttributes = (group: SavedViewGroup): SavedViewAttributes => ({ ...group.rawAttributes, ID: group.id });

export function buildSavedViewsXml(document: SavedViewsDocument): string {
  const lines = ["<SavedViews>"];

  for (const group of document.groups) {
    const groupAttributes = attributesToXml(groupToAttributes(group));
    const slots = [...group.slots].sort((a, b) => a.id - b.id);

    if (slots.length === 0) {
      lines.push(` <Group ${groupAttributes}/>`);
      continue;
    }

    lines.push(` <Group ${groupAttributes}>`);
    for (const slot of slots) {
      lines.push(`  <Slot ${attributesToXml(slotToAttributes(slot))}/>`);
    }
    lines.push(" </Group>");
  }

  lines.push("</SavedViews>");
  return `${lines.join("\n")}\n`;
}

export function updateSavedCameraSlot(document: SavedViewsDocument, groupId: string, slot: SavedCameraSlot): SavedViewsDocument {
  return {
    ...document,
    groups: document.groups.map((group) => {
      if (group.id !== groupId) return group;

      const nextSlots = group.slots.some((currentSlot) => currentSlot.id === slot.id)
        ? group.slots.map((currentSlot) => (currentSlot.id === slot.id ? slot : currentSlot))
        : [...group.slots, slot];

      return { ...group, slots: nextSlots.sort((a, b) => a.id - b.id) };
    }),
  };
}
