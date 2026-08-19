"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPlaywrightCodexConfig = loadPlaywrightCodexConfig;
exports.loadAdoCodexConfig = loadAdoCodexConfig;
exports.getCodexConfigPath = getCodexConfigPath;
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const CODEX_CONFIG_PATH = node_path_1.default.join(node_os_1.default.homedir(), ".codex", "config.toml");
function readCodexConfigRaw() {
    if (!node_fs_1.default.existsSync(CODEX_CONFIG_PATH)) {
        throw new Error(`Codex config was not found at ${CODEX_CONFIG_PATH}.`);
    }
    return node_fs_1.default.readFileSync(CODEX_CONFIG_PATH, "utf8");
}
function extractSection(raw, sectionName) {
    const lines = raw.split(/\r?\n/);
    const header = `[${sectionName}]`;
    const startIndex = lines.findIndex((line) => line.trim() === header);
    if (startIndex === -1) {
        throw new Error(`Section [${sectionName}] was not found in ${CODEX_CONFIG_PATH}.`);
    }
    const collected = [];
    for (let index = startIndex + 1; index < lines.length; index += 1) {
        const line = lines[index];
        if (line.trim().startsWith("[") && line.trim().endsWith("]")) {
            break;
        }
        collected.push(line);
    }
    return collected.join("\n");
}
function extractInlineEnv(sectionBody) {
    const envMatch = sectionBody.match(/env\s*=\s*\{([\s\S]*?)\}/m);
    if (!envMatch?.[1]) {
        return {};
    }
    const values = {};
    const pairRegex = /([A-Z0-9_]+)\s*=\s*"([^"]*)"/g;
    let match = null;
    while ((match = pairRegex.exec(envMatch[1])) !== null) {
        values[match[1]] = match[2];
    }
    return values;
}
function readServerEnv(sectionName) {
    const raw = readCodexConfigRaw();
    return extractInlineEnv(extractSection(raw, sectionName));
}
function normalizeAdoOrgUrl(rawOrgUrl, project) {
    const parsed = new URL(rawOrgUrl);
    const trimmedPath = parsed.pathname.replace(/\/+$/g, "");
    const projectSuffix = `/${project}`.toLowerCase();
    if (trimmedPath.toLowerCase().endsWith(projectSuffix)) {
        parsed.pathname = trimmedPath.slice(0, -projectSuffix.length) || "/";
    }
    else {
        parsed.pathname = trimmedPath || "/";
    }
    return parsed.toString().replace(/\/+$/g, "");
}
function getRequiredValue(name, sources) {
    const value = sources.map((item) => String(item || "").trim()).find(Boolean);
    if (!value) {
        throw new Error(`Missing required value for ${name}.`);
    }
    return value;
}
function loadPlaywrightCodexConfig() {
    const env = readServerEnv("mcp_servers.playwright");
    return {
        baseUrl: getRequiredValue("APP_BASE_URL", [env.APP_BASE_URL, process.env.APP_BASE_URL]),
        username: getRequiredValue("APP_USERNAME", [env.APP_USERNAME, process.env.APP_USERNAME]),
        password: getRequiredValue("APP_PASSWORD", [env.APP_PASSWORD, process.env.APP_PASSWORD])
    };
}
function loadAdoCodexConfig() {
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
function getCodexConfigPath() {
    return CODEX_CONFIG_PATH;
}
