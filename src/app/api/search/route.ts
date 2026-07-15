import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const dir = path.join(process.cwd(), "src");
  const results: string[] = [];

  function search(currentPath: string) {
    const files = fs.readdirSync(currentPath);
    for (const file of files) {
      const fullPath = path.join(currentPath, file);
      if (fs.statSync(fullPath).isDirectory()) {
        search(fullPath);
      } else if (fullPath.endsWith(".ts") || fullPath.endsWith(".tsx") || fullPath.endsWith(".js")) {
        const content = fs.readFileSync(fullPath, "utf-8");
        if (content.includes("charCodeAt")) {
          const lines = content.split("\n");
          lines.forEach((line, i) => {
            if (line.includes("charCodeAt")) {
              results.push(`${fullPath}:${i + 1}: ${line.trim()}`);
            }
          });
        }
      }
    }
  }

  search(dir);
  
  // Write to a file in the workspace so we can read it easily
  fs.writeFileSync(path.join(process.cwd(), "search_results.txt"), results.join("\n"));

  return NextResponse.json({ results });
}
