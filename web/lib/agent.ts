import { findDepartmentByText } from "@/lib/departments";

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

const AGENT_URL = process.env.AGENT_SERVICE_URL ?? "http://localhost:8001";

export async function processGrievanceWithAgent(
  input: AgentInput
): Promise<AgentResult> {
  try {
    const res = await fetch(`${AGENT_URL}/process-grievance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      // Agent calls can take 5–15 s with vision.
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Agent service ${res.status}: ${body}`);
    }
    return (await res.json()) as AgentResult;
  } catch (err) {
    console.error(
      "[agent] service unreachable, falling back to keyword routing:",
      err
    );
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
