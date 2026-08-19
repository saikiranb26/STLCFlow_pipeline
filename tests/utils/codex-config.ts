import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface PlaywrightCodexConfig {
  baseUrl: string;
  username: string;
  password: string;
}

export interface AdoCodexConfig {
  orgUrl: string;
  project: string;
  pat: string;
  apiVersion: string;
}

const CODEX_CONFIG_PATH = path.join(os.homedir(), ".codex", "config.toml");

function readCodexConfigRaw(): string {
  if (!fs.existsSync(CODEX_CONFIG_PATH)) {
    throw new Error(`Codex config was not found at ${CODEX_CONFIG_PATH}.`);
  }

  return fs.readFileSync(CODEX_CONFIG_PATH, "utf8");
}

function extractSection(raw: string, sectionName: string): string {
  const lines = raw.split(/\r?\n/);
  const header = `[${sectionName}]`;
  const startIndex = lines.findIndex((line) => line.trim() === header);
  if (startIndex === -1) {
    throw new Error(`Section [${sectionName}] was not found in ${CODEX_CONFIG_PATH}.`);
  }

  const collected: string[] = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim().startsWith("[") && line.trim().endsWith("]")) {
      break;
    }
    collected.push(line);
  }

  return collected.join("\n");
}

function extractInlineEnv(sectionBody: string): Record<string, string> {
  const envMatch = sectionBody.match(/env\s*=\s*\{([\s\S]*?)\}/m);
  if (!envMatch?.[1]) {
    return {};
  }

  const values: Record<string, string> = {};
  const pairRegex = /([A-Z0-9_]+)\s*=\s*"([^"]*)"/g;
  let match: RegExpExecArray | null = null;
  while ((match = pairRegex.exec(envMatch[1])) !== null) {
    values[match[1]] = match[2];
  }

  return values;
}

function readServerEnv(sectionName: string): Record<string, string> {
  const raw = readCodexConfigRaw();
  return extractInlineEnv(extractSection(raw, sectionName));
}

function normalizeAdoOrgUrl(rawOrgUrl: string, project: string): string {
  const parsed = new URL(rawOrgUrl);
  const trimmedPath = parsed.pathname.replace(/\/+$/g, "");
  const projectSuffix = `/${project}`.toLowerCase();

  if (trimmedPath.toLowerCase().endsWith(projectSuffix)) {
    parsed.pathname = trimmedPath.slice(0, -projectSuffix.length) || "/";
  } else {
    parsed.pathname = trimmedPath || "/";
  }

  return parsed.toString().replace(/\/+$/g, "");
}

function getRequiredValue(name: string, sources: Array<string | undefined>): string {
  const value = sources.map((item) => String(item || "").trim()).find(Boolean);
  if (!value) {
    throw new Error(`Missing required value for ${name}.`);
  }

  return value;
}

export function loadPlaywrightCodexConfig(): PlaywrightCodexConfig {
  const env = readServerEnv("mcp_servers.playwright");
  return {
    baseUrl: getRequiredValue("APP_BASE_URL", [env.APP_BASE_URL, process.env.APP_BASE_URL]),
    username: getRequiredValue("APP_USERNAME", [env.APP_USERNAME, process.env.APP_USERNAME]),
    password: getRequiredValue("APP_PASSWORD", [env.APP_PASSWORD, process.env.APP_PASSWORD])
  };
}

export function loadAdoCodexConfig(): AdoCodexConfig {
  const env = readServerEnv("mcp_servers.ado");
  const project = getRequiredValue("AZURE_DEVOPS_DEFAULT_PROJECT", [
    env.AZURE_DEVOPS_DEFAULT_PROJECT,
    process.env.AZURE_DEVOPS_DEFAULT_PROJECT
  ]);
  const rawOrgUrl = getRequiredValue("AZURE_DEVOPS_ORG_URL", [env.AZURE_DEVOPS_ORG_URL, process.env.AZURE_DEVOPS_ORG_URL]);

  return {
    orgUrl: normalizeAdoOrgUrl(rawOrgUrl, project),
    project,
    pat: getRequiredValue("ADO_MCP_AUTH_TOKEN", [env.ADO_MCP_AUTH_TOKEN, process.env.ADO_MCP_AUTH_TOKEN]),
    apiVersion: getRequiredValue("AZURE_DEVOPS_API_VERSION", [
      env.AZURE_DEVOPS_API_VERSION,
      process.env.AZURE_DEVOPS_API_VERSION,
      "7.0"
    ])
  };
}

export function getCodexConfigPath(): string {
  return CODEX_CONFIG_PATH;
}
