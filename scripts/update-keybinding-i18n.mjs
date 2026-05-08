import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const DEFAULT_SOURCES = {
  zh: "https://sczh.42kit.com/full/global.ini",
  en: "https://sczh.42kit.com/orginal/global.ini",
};

const CANDIDATE_ENCODINGS = ["utf-8", "utf-16le", "gb18030", "gbk"];

const MANUAL_TRANSLATIONS = {
  en: {
    ui_ciminingmode: "Mining Mode (Toggle)",
    ui_cisalvagemode: "Salvage Mode (Toggle)",
    ui_ciscanningmode: "Scanning Mode (Toggle)",
    ui_ciquantumtravelsystemtoggle: "Quantum Travel System (Toggle)",
    ui_cimissilemode: "Missile Operator Mode (Toggle)",
    ui_citoggledecoupledmode: "Decoupled Mode (Toggle, Hold)",
    ui_v_ifcs_limiter_toggle: "Speed Limiter - Enable / Disable",
    ui_citogglevtol: "Toggle VTOL",
    ui_v_master_mode_cycle: "Cycle Master Mode",
    ui_v_capacitor_assignment_engine_max: "Engines - Set to Max (Tap)",
    ui_v_capacitor_assignment_engine_min: "Engines - Set to Min (Tap)",
    ui_v_capacitor_assignment_shield_max: "Shields - Set to Max (Tap)",
    ui_v_capacitor_assignment_shield_min: "Shields - Set to Min (Tap)",
    ui_v_capacitor_assignment_weapon_max: "Weapons - Set to Max (Tap)",
    ui_v_capacitor_assignment_weapon_min: "Weapons - Set to Min (Tap)",
    ui_cifpszoomout: "Zoom Out (ADS)",
    ui_cifpszoomin: "Zoom In (ADS)",
  },
  zh: {
    ui_ciminingmode: "采矿模式（切换）",
    ui_cisalvagemode: "打捞模式（切换）",
    ui_ciscanningmode: "扫描模式（切换）",
    ui_ciquantumtravelsystemtoggle: "量子航行系统（切换）",
    ui_cimissilemode: "导弹操作模式（切换）",
    ui_citoggledecoupledmode: "解耦模式（切换，保持）",
    ui_v_ifcs_limiter_toggle: "限速器 - 启用/禁用",
    ui_citogglevtol: "切换垂直起降",
    ui_v_master_mode_cycle: "循环切换主控模式",
    ui_v_capacitor_assignment_engine_max: "引擎 - 设为最大值（单击）",
    ui_v_capacitor_assignment_engine_min: "引擎 - 设为最小值（单击）",
    ui_v_capacitor_assignment_shield_max: "护盾 - 设为最大值（单击）",
    ui_v_capacitor_assignment_shield_min: "护盾 - 设为最小值（单击）",
    ui_v_capacitor_assignment_weapon_max: "武器 - 设为最大值（单击）",
    ui_v_capacitor_assignment_weapon_min: "武器 - 设为最小值（单击）",
    ui_cifpszoomout: "拉远（瞄准模式）",
    ui_cifpszoomin: "拉近（瞄准模式）",
  },
};

function parseArgs(argv) {
  const options = {
    outDir: resolve("src/i18n/keybinding"),
    profilePath: resolve("src/data/defaultProfile.json"),
    sources: { ...DEFAULT_SOURCES },
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--out-dir" && next) {
      options.outDir = resolve(next);
      index += 1;
      continue;
    }

    if (arg === "--profile" && next) {
      options.profilePath = resolve(next);
      index += 1;
      continue;
    }

    if (arg === "--zh-source" && next) {
      options.sources.zh = next;
      index += 1;
      continue;
    }

    if (arg === "--en-source" && next) {
      options.sources.en = next;
      index += 1;
      continue;
    }

    if (arg === "--help") {
      console.log(
        [
          "Usage: node scripts/update-keybinding-i18n.mjs [options]",
          "",
          "Options:",
          "  --out-dir <path>     Output directory. Defaults to src/i18n/keybinding",
          "  --profile <path>     Default profile JSON. Defaults to src/data/defaultProfile.json",
          "  --zh-source <value>  URL or local path for zh global.ini",
          "  --en-source <value>  URL or local path for en global.ini",
        ].join("\n"),
      );
      process.exit(0);
    }
  }

  return options;
}

async function loadSource(source) {
  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${source}: ${response.status} ${response.statusText}`);
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  return readFile(resolve(source));
}

function getActionList(rawGroup) {
  if (!rawGroup?.action) {
    return [];
  }

  return Array.isArray(rawGroup.action) ? rawGroup.action : [rawGroup.action];
}

function normalizeLabelKey(label) {
  if (typeof label !== "string") {
    return "";
  }

  const normalized = label.trim();
  if (!normalized.startsWith("@") || normalized.length <= 1) {
    return "";
  }

  return normalized.slice(1).toLowerCase();
}

async function loadRequiredKeys(profilePath) {
  const rawProfile = JSON.parse(await readFile(profilePath, "utf8"));
  const keys = new Set();

  for (const group of rawProfile.profile?.actionmap ?? []) {
    const groupKey = normalizeLabelKey(group._UILabel);
    if (groupKey) {
      keys.add(groupKey);
    }

    for (const action of getActionList(group)) {
      const actionKey = normalizeLabelKey(action?._UILabel);
      if (actionKey) {
        keys.add(actionKey);
      }
    }
  }

  return keys;
}

function scoreDecodedIni(text, requiredKeys) {
  let keyMatches = 0;

  for (const key of requiredKeys) {
    const pattern = new RegExp(`^${escapeRegExp(key)}=`, "im");
    if (pattern.test(text)) {
      keyMatches += 1;
    }
  }

  const replacementCount = (text.match(/\uFFFD/g) ?? []).length;
  const suspiciousCount = (text.match(/[锟�]/g) ?? []).length;

  return {
    keyMatches,
    replacementCount,
    suspiciousCount,
    score: keyMatches * 1000 - replacementCount * 25 - suspiciousCount * 5,
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeIni(buffer, requiredKeys) {
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(buffer);
  }

  const utf8Text = new TextDecoder("utf-8").decode(buffer);
  if (scoreDecodedIni(utf8Text, requiredKeys).keyMatches > 0) {
    return utf8Text;
  }

  const attempts = CANDIDATE_ENCODINGS.map((encoding) => {
    const text = new TextDecoder(encoding).decode(buffer);
    return { encoding, text, ...scoreDecodedIni(text, requiredKeys) };
  }).sort((left, right) => right.score - left.score);

  const best = attempts[0];
  if (!best || best.keyMatches === 0) {
    const summary = attempts
      .map((attempt) => `${attempt.encoding}:keys=${attempt.keyMatches},score=${attempt.score}`)
      .join("; ");
    throw new Error(`Unable to decode INI source reliably. Attempts: ${summary}`);
  }

  return best.text;
}

function sanitizeIniValue(value) {
  return value.replace(/(?:\\r|\\n)+$/g, "").replace(/[\r\n]+$/g, "").trimEnd();
}

function extractEntries(iniText, requiredKeys) {
  const map = new Map();

  for (const rawLine of iniText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith(";") || line.startsWith("#") || line.startsWith("[")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    if (!requiredKeys.has(key)) {
      continue;
    }

    const value = sanitizeIniValue(line.slice(separatorIndex + 1).trimStart());
    map.set(key, value);
  }

  return Object.fromEntries([...map.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

async function writeLocaleFile(outDir, locale, source, requiredKeys) {
  const buffer = await loadSource(source);
  const iniText = decodeIni(buffer, requiredKeys);
  const entries = {
    ...Object.fromEntries(
      Object.entries(MANUAL_TRANSLATIONS[locale]).filter(([key]) => requiredKeys.has(key)),
    ),
    ...extractEntries(iniText, requiredKeys),
  };
  const sortedEntries = Object.fromEntries(
    Object.entries(entries).sort(([left], [right]) => left.localeCompare(right)),
  );
  const outputPath = resolve(outDir, `${locale}.json`);
  const payload = `${JSON.stringify(sortedEntries, null, 2)}\n`;

  await writeFile(outputPath, payload, "utf8");
  console.log(`Updated ${basename(outputPath)} with ${Object.keys(sortedEntries).length} entries from ${source}`);

  return sortedEntries;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const requiredKeys = await loadRequiredKeys(options.profilePath);

  await mkdir(options.outDir, { recursive: true });

  const [zhEntries, enEntries] = await Promise.all([
    writeLocaleFile(options.outDir, "zh", options.sources.zh, requiredKeys),
    writeLocaleFile(options.outDir, "en", options.sources.en, requiredKeys),
  ]);

  const missingKeys = [...requiredKeys]
    .filter((key) => !(key in zhEntries) && !(key in enEntries))
    .sort((left, right) => left.localeCompare(right));

  console.log(`Tracked ${requiredKeys.size} keybinding i18n labels`);
  console.log(`Skipped ${missingKeys.length} labels missing from both locale sources`);
  for (const key of missingKeys.slice(0, 20)) {
    console.log(`  - ${key}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
