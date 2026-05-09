import { findDepartmentByText } from "@/lib/departments";
import { GoogleGenAI } from "@google/genai";

export type AgentResult = {
  category: string;
  departmentSlug: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  draftedComplaint: string;
  similarGrievanceIds: string[];
  confidence: number;
  reasoning: string;
};

type AgentInput = {
  description: string;
  title: string;
  photoUrl?: string | null;
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  citizenName?: string | null;
};

const AGENT_URL = process.env.AGENT_SERVICE_URL;

const TRIAGE_PROMPT = `You are NagarSetu's grievance triage agent for an Indian municipality. Citizens submit civic issues (potholes, broken streetlights, garbage piles, water leaks, etc). For each grievance you MUST:

1. Read the citizen's title, description, and (if provided) the photo URL. Decide the issue category (e.g. "Roads", "Solid Waste", "Streetlight", "Water Supply") and a priority of LOW, MEDIUM, HIGH, or URGENT. Safety risk → HIGH or URGENT.
2. Decide the responsible department. Available department slugs and their names:
   - "public-works" → Department of Public Works (roads, footpaths, bridges, drainage)
   - "sanitation" → Sanitation & Solid Waste Management (garbage, waste, cleaning)
   - "electrical" → Electrical & Street Lighting Department (streetlights, electrical)
   - "water" → Water Supply & Sewerage Department (water, sewage, pipes)
3. Draft a formal complaint letter addressed to the department.

Return ONLY a strict JSON object — no markdown, no code fences, no commentary.

Shape:
{"category":"...","departmentSlug":"public-works|sanitation|electrical|water","priority":"LOW|MEDIUM|HIGH|URGENT","draftedComplaint":"...","similarGrievanceIds":[],"confidence":0.0,"reasoning":"one short sentence"}

The reasoning field must briefly justify the category and priority. Confidence is 0–1.
Do NOT invent a department slug — only use one of: public-works, sanitation, electrical, water.`;

/**
 * Extract a JSON object from text that might be wrapped in markdown fences.
 */
function extractJson(text: string): Record<string, unknown> | null {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  cleaned = cleaned.trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Call Gemini directly to triage a grievance (works on Vercel).
 */
async function processWithGemini(input: AgentInput): Promise<AgentResult> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.warn("[agent] No GEMINI_API_KEY set, using local fallback");
    return localFallback(input);
  }

  const userMessage =
    `Citizen grievance:\n` +
    `Title: ${input.title}\n` +
    `Description: ${input.description}\n` +
    `Citizen name: ${input.citizenName ?? "unknown"}\n` +
    `Address: ${input.address ?? "not provided"}\n` +
    `Coordinates: ${input.lat}, ${input.lng}\n\n` +
    `Please classify and return the JSON object.`;

  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

  const response = await ai.models.generateContent({
    model,
    config: { systemInstruction: TRIAGE_PROMPT },
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
  });

  const text = response.text?.trim() ?? "";
  const parsed = extractJson(text);

  if (!parsed) {
    console.error("[agent] Could not parse Gemini response:", text.slice(0, 400));
    return localFallback(input);
  }

  const slug = (parsed.departmentSlug as string) ?? "public-works";
  const validSlugs = ["public-works", "sanitation", "electrical", "water"];
  const departmentSlug = validSlugs.includes(slug)
    ? slug
    : findDepartmentByText(`${input.title} ${input.description}`).slug;

  let priority = ((parsed.priority as string) ?? "MEDIUM").toUpperCase();
  if (!["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priority)) {
    priority = "MEDIUM";
  }

  return {
    category: (parsed.category as string) ?? "General",
    departmentSlug,
    priority: priority as AgentResult["priority"],
    draftedComplaint:
      (parsed.draftedComplaint as string) ?? localFallback(input).draftedComplaint,
    similarGrievanceIds: (parsed.similarGrievanceIds as string[]) ?? [],
    confidence: Number(parsed.confidence ?? 0.7),
    reasoning: (parsed.reasoning as string) ?? "Agent classification.",
  };
}

export async function processGrievanceWithAgent(
  input: AgentInput
): Promise<AgentResult> {
  // ── Try Python agent service (local dev / self-hosted) ──
  if (AGENT_URL) {
    try {
      const res = await fetch(`${AGENT_URL}/process-grievance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(45_000),
      });
      if (res.ok) {
        return (await res.json()) as AgentResult;
      }
      console.warn(
        `[agent] Agent service returned ${res.status}, falling back to direct Gemini`
      );
    } catch (err) {
      console.warn(
        "[agent] Agent service unreachable, falling back to direct Gemini:",
        err
      );
    }
  }

  // ── Direct Gemini call (works on Vercel) ──
  try {
    return await processWithGemini(input);
  } catch (err) {
    console.error("[agent] Direct Gemini call also failed:", err);
    return localFallback(input);
  }
}

function localFallback(input: AgentInput): AgentResult {
  const text = `${input.title} ${input.description}`;
  const dept = findDepartmentByText(text);
  const priority: AgentResult["priority"] = /urgent|emergency|injur|danger|hazard/i.test(
    text
  )
    ? "URGENT"
    : /child|elderly|safety|night|dark/i.test(text)
      ? "HIGH"
      : "MEDIUM";
  const drafted = `To,
The Commissioner,
${dept.name},

Subject: ${input.title}

Respected Sir/Madam,

I, ${input.citizenName ?? "a concerned citizen"}, would like to bring to your kind attention the following civic issue:

${input.description}

${input.address ? `Location: ${input.address}` : ""}

I request the department to inspect and resolve this issue at the earliest. I would be grateful for an acknowledgement and a tentative timeline.

Yours sincerely,
${input.citizenName ?? "Citizen"}`;

  const categoryMap: Record<string, string> = {
    "public-works": "Roads",
    sanitation: "Solid Waste",
    electrical: "Street Lighting",
    water: "Water Supply",
  };

  return {
    category: categoryMap[dept.slug] ?? "General",
    departmentSlug: dept.slug,
    priority,
    draftedComplaint: drafted,
    similarGrievanceIds: [],
    confidence: 0.4,
    reasoning:
      "Local keyword fallback used because the agent service was unreachable.",
  };
}
