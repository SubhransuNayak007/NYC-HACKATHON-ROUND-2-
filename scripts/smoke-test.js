/**
 * QuickReply Post-Deployment Synthetic Smoke Probe
 * Validates availability of core endpoints and routes.
 */
const http = require("http");

const BASE_URL = process.env.TARGET_URL || "http://localhost:3000";

async function pingUrl(urlPath) {
  return new Promise((resolve) => {
    const url = new URL(urlPath, BASE_URL);
    const start = Date.now();
    const req = http.get(url, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        resolve({
          path: urlPath,
          statusCode: res.statusCode,
          durationMs: Date.now() - start,
          ok: res.statusCode >= 200 && res.statusCode < 400,
        });
      });
    });

    req.on("error", (err) => {
      resolve({
        path: urlPath,
        statusCode: 0,
        durationMs: Date.now() - start,
        error: err.message,
        ok: false,
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        path: urlPath,
        statusCode: 408,
        durationMs: 5000,
        error: "Timeout after 5000ms",
        ok: false,
      });
    });
  });
}

async function runSmokeProbes() {
  console.log(`\n🔍 Initiating Post-Deployment Smoke Probes against ${BASE_URL}...`);
  const probes = [
    "/",
    "/register",
    "/api/health",
  ];

  let allOk = true;
  for (const path of probes) {
    const result = await pingUrl(path);
    if (result.ok) {
      console.log(`  ✅ [${result.statusCode}] ${result.path} (${result.durationMs}ms)`);
    } else {
      console.error(`  ❌ [${result.statusCode}] ${result.path} - ${result.error || "Failed"}`);
      allOk = false;
    }
  }

  if (allOk) {
    console.log("\n🎉 All smoke probes PASSED successfully.\n");
    process.exit(0);
  } else {
    console.error("\n❌ One or more smoke probes FAILED.\n");
    process.exit(1);
  }
}

runSmokeProbes();
