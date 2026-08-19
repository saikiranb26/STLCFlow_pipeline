import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const BASE_URL = "https://cadencyhelp.lower.trintech.com/edinburgh/";
const OUTPUT_ROOT = path.resolve("knowledge", "match-help");
const TOC_URL = new URL("Data/Tocs/Cadency.js", BASE_URL).toString();
const MAX_PAGES_PER_MODULE_IN_MD = 24;
const DASHBOARD_WRAPPERS = new Set(
  [
    "advanced features",
    "about the admin dashboard",
    "about the match configuration dashboard",
    "about the transactions dashboard",
    "about the archive dashboard",
    "about the audits dashboard",
    "understanding the manage dashboard"
  ].map(normalizeTitle)
);

function evaluateDefineModule(source, label) {
  let result;
  const sandbox = {
    define(value) {
      result = value;
    }
  };

  vm.runInNewContext(source, sandbox, { filename: label, timeout: 5000 });

  if (!result) {
    throw new Error(`Unable to evaluate MadCap define() payload for ${label}`);
  }

  return result;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "STLCFlow knowledge harvester"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function stripTags(html) {
  return decodeEntities(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function decodeEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractTitle(html, fallback) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!titleMatch) {
    return fallback;
  }

  return stripTags(titleMatch[1]).replace(/\s+/g, " ").trim() || fallback;
}

function extractMainHtml(html) {
  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : html;
  const topicBodyMatch =
    body.match(/<div[^>]+id=["']mc-main-content["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/i) ||
    body.match(/<div[^>]+role=["']main["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/i) ||
    body.match(/<div[^>]+class=["'][^"']*\btopic-body\b[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/main>/i) ||
    body.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i) ||
    body.match(/<div[^>]+class=["'][^"']*\bbody-container\b[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);

  return topicBodyMatch ? topicBodyMatch[1] : body;
}

function extractElements(html) {
  const mainHtml = extractMainHtml(html);
  const headings = [];
  const paragraphs = [];
  const listItems = [];
  const tableHeaders = [];

  for (const match of mainHtml.matchAll(/<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const text = stripTags(match[2]);
    if (text) {
      headings.push(text);
    }
  }

  for (const match of mainHtml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = stripTags(match[1]);
    if (isUsefulContent(text)) {
      paragraphs.push(text);
    }
  }

  for (const match of mainHtml.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
    const text = stripTags(match[1]);
    if (isUsefulContent(text)) {
      listItems.push(text);
    }
  }

  for (const match of mainHtml.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)) {
    const text = stripTags(match[1]);
    if (isUsefulContent(text)) {
      tableHeaders.push(text);
    }
  }

  return {
    headings: unique(headings).slice(0, 20),
    paragraphs: unique(paragraphs).slice(0, 12),
    listItems: unique(listItems).slice(0, 30),
    tableHeaders: unique(tableHeaders).slice(0, 30)
  };
}

function isUsefulContent(text) {
  if (!text || text.length < 8) {
    return false;
  }

  const lowered = text.toLowerCase();
  return ![
    "home",
    "print",
    "expand all",
    "collapse all",
    "previous topic",
    "next topic",
    "contents",
    "search results",
    "loading"
  ].includes(lowered);
}

function unique(values) {
  const seen = new Set();
  const output = [];
  for (const value of values) {
    const normalized = value.replace(/\s+/g, " ").trim();
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(normalized);
  }
  return output;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeUrlPath(urlPath) {
  return urlPath.replace(/^\.\./, "").replace(/\\/g, "/").toLowerCase();
}

function resolveEntry(chunkEntriesByIndex, chunkId, index) {
  const entries = chunkEntriesByIndex.get(chunkId);
  if (!entries) {
    return undefined;
  }

  return entries.get(index);
}

function buildChunkIndex(chunkObject) {
  const index = new Map();

  for (const [urlPath, payload] of Object.entries(chunkObject)) {
    for (const itemIndex of payload.i || []) {
      index.set(itemIndex, {
        index: itemIndex,
        urlPath: normalizeUrlPath(urlPath),
        title: payload.t?.[0] || path.basename(urlPath, ".htm")
      });
    }
  }

  return index;
}

function traverseToc(nodes, chunkEntriesByIndex, ancestors = [], output = []) {
  for (const node of nodes || []) {
    const entry = resolveEntry(chunkEntriesByIndex, node.c, node.i);
    const title = entry?.title || `Untitled ${node.i}`;
    const currentPath = [...ancestors, title];

    if (entry) {
      output.push({
        index: node.i,
        chunk: node.c,
        title,
        urlPath: entry.urlPath,
        tocPath: currentPath
      });
    }

    traverseToc(node.n, chunkEntriesByIndex, currentPath, output);
  }

  return output;
}

function getModuleName(tocPath, urlPath) {
  const matchIndex = tocPath.findIndex((part) => part.toLowerCase() === "match");
  if (matchIndex >= 0) {
    const afterMatch = tocPath.slice(matchIndex + 1);
    return deriveFunctionalArea(afterMatch);
  }

  const top = tocPath[0] || "";
  if (normalizeTitle(top) === "about reporting") {
    return "Reports";
  }

  const parts = urlPath.split("/").filter(Boolean);
  const matchPathIndex = parts.indexOf("match");
  return matchPathIndex >= 0 && parts[matchPathIndex + 1] ? toTitleCase(parts[matchPathIndex + 1]) : "Overview";
}

function deriveFunctionalArea(afterMatch) {
  if (afterMatch.length === 0) {
    return "Overview";
  }

  const significant = [];
  for (const part of afterMatch) {
    const normalized = normalizeTitle(part);
    if (DASHBOARD_WRAPPERS.has(normalized)) {
      continue;
    }

    if (normalized === "accessing match" && afterMatch.length > 1) {
      continue;
    }

    if (normalized === "system security in match" && afterMatch.length > 2) {
      continue;
    }

    if (normalized === "available reports" && afterMatch.length > 1) {
      continue;
    }

    significant.push(part);
  }

  return simplifyFunctionalArea(significant[0] || afterMatch[0] || "Overview");
}

function simplifyFunctionalArea(value) {
  return value
    .replace(/^About\s+/i, "")
    .replace(/^Understanding\s+/i, "")
    .replace(/^Introducing\s+/i, "")
    .replace(/\s+Screen$/i, "")
    .replace(/\s+List Screen$/i, " List")
    .replace(/^The\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitle(value) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function toTitleCase(value) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function summarizePage(page) {
  const text = `${page.title} ${page.moduleName} ${page.tocPath.join(" ")} ${page.headings.join(" ")} ${page.tableHeaders.join(" ")}`.toLowerCase();
  const summaries = new Set();

  if (text.includes("dashboard")) {
    summaries.add("Dashboard/navigation coverage: verify entry points, available cards or links, default landing behavior, and role-based visibility.");
  }
  if (text.includes("create") || text.includes("edit") || text.includes("new") || text.includes("definition") || text.includes("configuration") || text.includes("maintenance")) {
    summaries.add("Setup/maintenance coverage: verify add, edit, save, cancel, required fields, duplicate handling, and validation messages.");
  }
  if (text.includes("import") || text.includes("export")) {
    summaries.add("Import/export coverage: verify file or process parameters, success/failure statuses, history records, and downstream data availability.");
  }
  if (text.includes("transaction") || text.includes("smartmatch") || text.includes("criteria") || text.includes("search")) {
    summaries.add("Transaction coverage: verify search criteria, filters, result grids, row details, selection behavior, and matching or bulk actions.");
  }
  if (text.includes("task") || text.includes("process") || text.includes("reconciliation")) {
    summaries.add("Process coverage: verify task launch, run parameters, execution status, result review, and retained evidence after completion.");
  }
  if (text.includes("report")) {
    summaries.add("Reporting coverage: verify report selection, required parameters, output, export behavior, empty results, and return navigation.");
  }
  if (text.includes("security") || text.includes("permission") || text.includes("profile") || text.includes("user")) {
    summaries.add("Security coverage: verify authorized and unauthorized access, disabled actions, field visibility, sector scope, and role-specific results.");
  }
  if (text.includes("exception") || text.includes("resolve") || text.includes("variance")) {
    summaries.add("Exception/resolution coverage: verify exception visibility, assignment or comments, resolution actions, audit evidence, and reopen/undo behavior when available.");
  }
  if (text.includes("archive")) {
    summaries.add("Archive coverage: verify archived data search, detail view, retention controls, and access boundaries.");
  }
  if (summaries.size === 0) {
    summaries.add(`Functional coverage: verify the ${page.title} behavior through navigation, field validation, save/cancel flow, grid state, and permissions.`);
  }

  return [...summaries].slice(0, 4);
}

function inferQaFocus(moduleName, pages) {
  const combined = `${moduleName} ${pages.map((page) => `${page.title} ${page.tocPath.join(" ")}`).join(" ")}`.toLowerCase();
  const focus = new Set();

  if (combined.includes("setup") || combined.includes("definition") || combined.includes("configuration")) {
    focus.add("Verify create, edit, save, cancel, validation, and duplicate-name behavior for setup records.");
  }
  if (combined.includes("import")) {
    focus.add("Cover successful imports, rejected files, validation feedback, history/status updates, and downstream availability.");
  }
  if (combined.includes("transaction") || combined.includes("search") || combined.includes("smartmatch")) {
    focus.add("Cover filters, result counts, row selection, transaction detail, matching actions, and retained grid state.");
  }
  if (combined.includes("task") || combined.includes("process")) {
    focus.add("Cover launch/run behavior, parameters, scheduler or recurring settings, history, statuses, and permissions.");
  }
  if (combined.includes("report")) {
    focus.add("Cover report launch, required parameters, export/output formats, empty results, and navigation back to lists.");
  }
  if (combined.includes("security") || combined.includes("permission") || combined.includes("profile")) {
    focus.add("Cover access granted/denied states by role, field visibility, disabled actions, and cross-sector restrictions.");
  }
  if (combined.includes("exception") || combined.includes("resolve")) {
    focus.add("Cover exception visibility, assignment, comments, resolution actions, audit trail, and reopen/undo behavior where supported.");
  }
  if (focus.size === 0) {
    focus.add("Cover navigation, default values, required fields, grid behavior, save/cancel flows, permissions, and audit/result evidence.");
  }

  return [...focus];
}

function buildModuleMarkdown(moduleName, pages, generatedAt) {
  const slug = slugify(moduleName);
  const qaFocus = inferQaFocus(moduleName, pages);
  const importantPages = pages.slice(0, MAX_PAGES_PER_MODULE_IN_MD);
  const omittedCount = Math.max(0, pages.length - importantPages.length);

  const lines = [
    `# Match Help Context - ${moduleName}`,
    "",
    `Generated: ${generatedAt}`,
    "",
    "Source: Cadency Help Edinburgh Match documentation.",
    "",
    "Use this as functional context for STLCFlow story analysis and testcase generation. It is a paraphrased QA knowledge file, not a replacement for the live Help page.",
    "",
    "## Scope",
    "",
    describeModule(moduleName, pages),
    "",
    "## QA Focus",
    "",
    ...qaFocus.map((item) => `- ${item}`),
    "",
    "## Child Pages",
    ""
  ];

  for (const page of importantPages) {
    lines.push(`### ${page.title}`, "");
    lines.push(`- TOC path: ${page.tocPath.join(" > ")}`);
    lines.push(`- Source: ${page.sourceUrl}`);

    const summaryItems = summarizePage(page);
    for (const item of summaryItems) {
      lines.push(`- Context: ${item}`);
    }

    if (page.tableHeaders.length > 0) {
      lines.push(`- Field/table cues: ${page.tableHeaders.slice(0, 8).join("; ")}`);
    }

    const sectionCues = page.headings.filter((heading) => normalizeTitle(heading) !== normalizeTitle(page.title));
    if (sectionCues.length > 0) {
      lines.push(`- Section cues: ${sectionCues.slice(0, 8).join("; ")}`);
    }

    lines.push("");
  }

  if (omittedCount > 0) {
    lines.push(`Additional child pages in this module are listed in \`match-help-page-index.json\` (${omittedCount} not expanded here to keep this file readable).`, "");
  }

  lines.push("## Testcase Generation Guidance", "");
  lines.push("- Prefer story acceptance criteria over this background context.");
  lines.push("- Use the source pages to identify screens, actions, fields, and expected outcomes for the Match module.");
  lines.push("- Combine this module context with existing ADO regression patterns for realistic step wording and coverage depth.");
  lines.push("- Include positive, negative, permission, navigation, data-state, and audit/result scenarios when relevant to the story.");
  lines.push("");

  return {
    slug,
    markdown: lines.join("\n")
  };
}

function describeModule(moduleName, pages) {
  const pageTitles = pages.map((page) => page.title).slice(0, 8).join(", ");
  return `This file covers the Match functional area **${moduleName}**. Key child pages include ${pageTitles}. Use it with the regression-suite corpus in the parent knowledge folder when writing story-specific testcases.`;
}

function buildReadme(modules, generatedAt, totalPages) {
  const lines = [
    "# Match Help Knowledge",
    "",
    `Generated: ${generatedAt}`,
    "",
    "Source root: https://cadencyhelp.lower.trintech.com/edinburgh/content/match/reference/match.htm?tocpath=Match%7C_____0",
    "",
    "This folder contains paraphrased context from the Cadency Help Match documentation. It is intended for story analysis, manual testcase design, and automation planning in STLCFlow.",
    "",
    "## Files",
    "",
    ...modules.map((module) => `- [${module.fileName}](./${module.fileName}) - ${module.moduleName} (${module.pageCount} page(s))`),
    "- [match-help-page-index.json](./match-help-page-index.json) - full harvested Match page index with source URLs and TOC paths",
    "",
    "## Usage Rules",
    "",
    "- Current ADO story details and acceptance criteria remain the source of truth.",
    "- Help context explains expected product behavior and screen/function terminology.",
    "- Regression-suite knowledge in the parent `knowledge` folder should still be used for coverage style and realistic wording.",
    "- Do not copy source documentation verbatim into testcases; convert it into concrete user actions and expected results.",
    "",
    `Harvested Match pages: ${totalPages}`,
    ""
  ];

  return lines.join("\n");
}

async function main() {
  const generatedAt = new Date().toISOString();
  const tocSource = await fetchText(TOC_URL);
  const toc = evaluateDefineModule(tocSource, TOC_URL);

  const chunkEntriesByIndex = new Map();
  for (let chunkId = 0; chunkId < toc.numchunks; chunkId += 1) {
    const chunkUrl = new URL(`Data/Tocs/${toc.prefix}${chunkId}.js`, BASE_URL).toString();
    const chunkSource = await fetchText(chunkUrl);
    const chunkObject = evaluateDefineModule(chunkSource, chunkUrl);
    chunkEntriesByIndex.set(chunkId, buildChunkIndex(chunkObject));
  }

  const allEntries = traverseToc(toc.tree.n, chunkEntriesByIndex);
  const matchEntries = allEntries
    .filter((entry) => entry.urlPath.includes("/content/match/") || entry.tocPath.some((part) => part.toLowerCase() === "match"))
    .filter((entry) => entry.urlPath.endsWith(".htm"));

  const uniqueEntries = uniqueBy(matchEntries, (entry) => `${entry.urlPath}|${entry.tocPath.join(">")}`);
  const pages = [];

  for (const entry of uniqueEntries) {
    const sourceUrl = new URL(entry.urlPath.replace(/^\//, ""), BASE_URL).toString();
    try {
      const html = await fetchText(sourceUrl);
      const extracted = extractElements(html);
      pages.push({
        ...entry,
        moduleName: getModuleName(entry.tocPath, entry.urlPath),
        title: extractTitle(html, entry.title),
        sourceUrl,
        ...extracted
      });
    } catch (error) {
      pages.push({
        ...entry,
        moduleName: getModuleName(entry.tocPath, entry.urlPath),
        sourceUrl,
        title: entry.title,
        headings: [],
        paragraphs: [`Fetch failed: ${error.message}`],
        listItems: [],
        tableHeaders: []
      });
    }
  }

  pages.sort((left, right) => left.tocPath.join(">").localeCompare(right.tocPath.join(">")));

  const modulesByName = new Map();
  for (const page of pages) {
    if (!modulesByName.has(page.moduleName)) {
      modulesByName.set(page.moduleName, []);
    }
    modulesByName.get(page.moduleName).push(page);
  }

  const projectRoot = process.cwd();
  const expectedKnowledgeRoot = path.resolve(projectRoot, "knowledge");
  if (!OUTPUT_ROOT.startsWith(expectedKnowledgeRoot)) {
    throw new Error(`Refusing to write outside project knowledge folder: ${OUTPUT_ROOT}`);
  }

  await fs.rm(OUTPUT_ROOT, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_ROOT, { recursive: true });

  const moduleFiles = [];
  for (const [moduleName, modulePages] of [...modulesByName.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const { slug, markdown } = buildModuleMarkdown(moduleName, modulePages, generatedAt);
    const fileName = `${slug || "overview"}.md`;
    await fs.writeFile(path.join(OUTPUT_ROOT, fileName), markdown, "utf8");
    moduleFiles.push({ moduleName, pageCount: modulePages.length, fileName });
  }

  const index = {
    generatedAt,
    sourceRoot: "https://cadencyhelp.lower.trintech.com/edinburgh/content/match/reference/match.htm?tocpath=Match%7C_____0",
    tocSource: TOC_URL,
    totalPages: pages.length,
    modules: moduleFiles,
    pages: pages.map((page) => ({
      title: page.title,
      moduleName: page.moduleName,
      tocPath: page.tocPath,
      sourceUrl: page.sourceUrl,
      urlPath: page.urlPath,
      headings: page.headings
    }))
  };

  await fs.writeFile(path.join(OUTPUT_ROOT, "match-help-page-index.json"), `${JSON.stringify(index, null, 2)}\n`, "utf8");
  await fs.writeFile(path.join(OUTPUT_ROOT, "README.md"), buildReadme(moduleFiles, generatedAt, pages.length), "utf8");

  console.log(`Harvested ${pages.length} Match Help page(s) into ${OUTPUT_ROOT}`);
  for (const moduleFile of moduleFiles) {
    console.log(`- ${moduleFile.moduleName}: ${moduleFile.pageCount} page(s) -> ${moduleFile.fileName}`);
  }
}

function uniqueBy(values, getKey) {
  const seen = new Set();
  const output = [];

  for (const value of values) {
    const key = getKey(value);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(value);
  }

  return output;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
