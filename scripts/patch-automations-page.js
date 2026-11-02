const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../src/app/dashboard/automations/page.tsx");
let content = fs.readFileSync(filePath, "utf8");

// 1. Add Sparkles import and AIAutomationStudio import
if (!content.includes("AIAutomationStudio")) {
  content = content.replace(
    /import \{[\s\S]*?\} from "lucide-react";/,
    (match) => {
      const withSparkles = match.includes("Sparkles") ? match : match.replace("Zap,", "Zap,\n  Sparkles,");
      return `${withSparkles}\nimport { AIAutomationStudio } from "@/frontend/components/automation/AIAutomationStudio";`;
    }
  );
}

// 2. Update activeTab state
content = content.replace(
  'useState<"chains" | "webhooks" | "followups">("chains")',
  'useState<"ai_studio" | "chains" | "webhooks" | "followups">("ai_studio")'
);

// 3. Add AI Studio tab
if (!content.includes('id: "ai_studio"')) {
  content = content.replace(
    'const tabs = [',
    'const tabs = [\n    { id: "ai_studio" as const, label: "AI Studio (Natural Language OS)", icon: Sparkles, count: "AI" },'
  );
}

// 4. Render AIAutomationStudio
if (!content.includes('<AIAutomationStudio />')) {
  content = content.replace(
    '{/* ═══ CHAINS TAB ═══ */}',
    '{/* ═══ AI STUDIO TAB ═══ */}\n      {activeTab === "ai_studio" && <AIAutomationStudio />}\n\n      {/* ═══ CHAINS TAB ═══ */}'
  );
}

fs.writeFileSync(filePath, content, "utf8");
console.log("Successfully patched AutomationsPage with AIAutomationStudio!");
