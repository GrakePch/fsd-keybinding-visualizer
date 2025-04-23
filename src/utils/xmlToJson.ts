interface jsonFromXML {
  _a?: Record<string, string>;
  _c?: Record<string, jsonFromXML[]>;
  _t?: string | null;
}

function xmlToJson(xml: Document | Element) {
  const children = xml.children;
  const jsonData : jsonFromXML = {};

  const attributes = xmlNodeAttrToJson(xml);
  if (attributes)
    jsonData._a = attributes;

  if (children.length === 0) return jsonData;

  jsonData._c = {};
  for (const child of children) {
    const nodeName = child.nodeName;

    if (child.nodeType === Node.TEXT_NODE) {
      jsonData._t = child.nodeValue;
      continue;
    }

    if (!jsonData._c[nodeName])
      jsonData._c[nodeName] = [];

    jsonData._c[nodeName].push(xmlToJson(child));
  }

  return jsonData;
}

function xmlNodeAttrToJson(node: Document | Element) {
  if (!(node instanceof Element) || !node.attributes) return;
  if (node.attributes.length === 0) return;

  const jsonData : Record<string, string> = {};
  for (const attr of node.attributes)
    jsonData[attr.nodeName] = attr.nodeValue || '';

  return jsonData;
}

export default xmlToJson;
