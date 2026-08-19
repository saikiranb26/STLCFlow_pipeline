const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

function readFlag(name, fallback) {
  const prefix = `${name}=`;
  const direct = process.argv.find((item) => item.startsWith(prefix));
  if (direct) {
    return direct.slice(prefix.length);
  }

  const index = process.argv.findIndex((item) => item === name);
  if (index >= 0 && index < process.argv.length - 1) {
    return process.argv[index + 1];
  }

  return fallback;
}

function contentType(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    case ".woff":
      return "font/woff";
    case ".woff2":
      return "font/woff2";
    case ".webm":
      return "video/webm";
    case ".zip":
      return "application/zip";
    default:
      return "application/octet-stream";
  }
}

const projectRoot = process.cwd();
const latestReportManifestPath = path.join(projectRoot, "artifacts", "latest-allure-report.json");
const explicitRoot = readFlag("--root", "");
const latestReportRoot =
  !explicitRoot && fs.existsSync(latestReportManifestPath)
    ? JSON.parse(fs.readFileSync(latestReportManifestPath, "utf8")).allureReportDir
    : "";
const reportRoot = path.resolve(projectRoot, explicitRoot || latestReportRoot || "artifacts/allure-report");
const port = Number(readFlag("--port", "9323"));
const host = readFlag("--host", "127.0.0.1");

if (!Number.isFinite(port) || port <= 0) {
  throw new Error(`Invalid --port value: ${port}`);
}

if (!fs.existsSync(path.join(reportRoot, "index.html"))) {
  throw new Error(`Allure report was not found at ${reportRoot}. Run npm run automation:report first.`);
}

const server = http.createServer((request, response) => {
  const rawUrl = new URL(request.url || "/", `http://${host}:${port}`);
  const decodedPath = decodeURIComponent(rawUrl.pathname);
  const relativePath = decodedPath === "/" ? "index.html" : decodedPath.replace(/^\/+/, "");
  const filePath = path.resolve(reportRoot, relativePath);

  if (!filePath.startsWith(reportRoot)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentType(filePath),
      "Cache-Control": "no-store"
    });
    fs.createReadStream(filePath).pipe(response);
  });
});

server.listen(port, host, () => {
  console.log(`Allure report: http://${host}:${port}/`);
  console.log(`Serving: ${reportRoot}`);
});
