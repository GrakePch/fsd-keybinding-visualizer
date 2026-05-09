import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const CONVERSIONS = [
  {
    input: resolve("src/data/raw/defaultprofile.xml"),
    output: resolve("src/data/defaultProfile.json"),
  },
  {
    input: resolve("src/data/raw/keybinding_localization.xml"),
    output: resolve("src/data/keybinding_localization.json"),
  },
];

function decodeXmlEntity(value) {
  return value.replace(/&(?:#(\d+)|#x([\da-fA-F]+)|amp|lt|gt|quot|apos);/g, (match, decimal, hex) => {
    if (decimal) return String.fromCodePoint(Number.parseInt(decimal, 10));
    if (hex) return String.fromCodePoint(Number.parseInt(hex, 16));

    switch (match) {
      case "&amp;":
        return "&";
      case "&lt;":
        return "<";
      case "&gt;":
        return ">";
      case "&quot;":
        return "\"";
      case "&apos;":
        return "'";
      default:
        return match;
    }
  });
}

function parseAttributes(source) {
  const attrs = {};
  const attrPattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match;

  while ((match = attrPattern.exec(source)) !== null) {
    attrs[match[1]] = decodeXmlEntity(match[2] ?? match[3] ?? "");
  }

  return attrs;
}

function parseTag(source) {
  const selfClosing = /\/\s*$/.test(source);
  const content = source.replace(/\/\s*$/, "").trim();
  const nameEndIndex = content.search(/\s/);

  if (nameEndIndex === -1) {
    return { name: content, attrs: {}, children: [], selfClosing };
  }

  return {
    name: content.slice(0, nameEndIndex),
    attrs: parseAttributes(content.slice(nameEndIndex + 1)),
    children: [],
    selfClosing,
  };
}

function findTagEnd(xml, startIndex) {
  let quote = "";

  for (let index = startIndex + 1; index < xml.length; index += 1) {
    const char = xml[index];

    if (quote) {
      if (char === quote) quote = "";
      continue;
    }

    if (char === "\"" || char === "'") {
      quote = char;
      continue;
    }

    if (char === ">") {
      return index;
    }
  }

  return -1;
}

function parseXml(xml) {
  const root = { name: "", attrs: {}, children: [] };
  const stack = [root];
  let index = 0;

  while (index < xml.length) {
    const tagStart = xml.indexOf("<", index);
    if (tagStart === -1) break;

    const text = xml.slice(index, tagStart);
    const trimmedText = text.trim();
    if (trimmedText === "/&gt;") {
      index = tagStart;
      continue;
    }

    if (trimmedText) {
      throw new Error(`Unexpected text node near: ${text.trim().slice(0, 40)}`);
    }

    if (xml.startsWith("<!--", tagStart)) {
      const commentEnd = xml.indexOf("-->", tagStart + 4);
      if (commentEnd === -1) throw new Error("Unterminated XML comment");
      index = commentEnd + 3;
      continue;
    }

    if (xml.startsWith("<![CDATA[", tagStart)) {
      const cdataEnd = xml.indexOf("]]>", tagStart + 9);
      if (cdataEnd === -1) throw new Error("Unterminated CDATA section");
      const cdata = xml.slice(tagStart + 9, cdataEnd);
      if (cdata.trim()) {
        throw new Error(`Unexpected CDATA near: ${cdata.trim().slice(0, 40)}`);
      }
      index = cdataEnd + 3;
      continue;
    }

    const tagEnd = findTagEnd(xml, tagStart);
    if (tagEnd === -1) throw new Error("Unterminated XML tag");

    const rawTag = xml.slice(tagStart + 1, tagEnd).trim();

    if (rawTag.startsWith("?") || rawTag.startsWith("!")) {
      index = tagEnd + 1;
      continue;
    }

    if (rawTag.startsWith("/")) {
      const name = rawTag.slice(1).trim();
      const current = stack.pop();

      if (!current || current.name !== name) {
        throw new Error(`Mismatched closing tag: ${name}`);
      }

      index = tagEnd + 1;
      continue;
    }

    const node = parseTag(rawTag);
    stack.at(-1).children.push(node);

    if (!node.selfClosing) {
      stack.push(node);
    }

    index = tagEnd + 1;
  }

  if (stack.length !== 1) {
    throw new Error(`Unclosed XML tag: ${stack.at(-1).name}`);
  }

  if (root.children.length !== 1) {
    throw new Error(`Expected exactly one root element, got ${root.children.length}`);
  }

  return root.children[0];
}

function convertNode(node) {
  const output = {};

  for (const [key, value] of Object.entries(node.attrs)) {
    output[`_${key}`] = value;
  }

  const groupedChildren = new Map();
  for (const child of node.children) {
    const items = groupedChildren.get(child.name) ?? [];
    items.push(convertNode(child));
    groupedChildren.set(child.name, items);
  }

  for (const [name, items] of groupedChildren.entries()) {
    output[name] = items.length === 1 ? items[0] : items;
  }

  return output;
}

async function convertFile({ input, output }) {
  const xml = await readFile(input, "utf8");
  const root = parseXml(xml);
  const data = { [root.name]: convertNode(root) };
  const payload = `${JSON.stringify(data, null, 4)}\n`;

  await writeFile(output, payload, "utf8");
  console.log(`Updated ${basename(output)} from ${input}`);
}

for (const conversion of CONVERSIONS) {
  await convertFile(conversion);
}
