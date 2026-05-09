import { GoogleGenAI } from "@google/genai";

export type VerifyVerdict =
  | "fixed"
  | "unchanged"
  | "different_issue"
  | "uncertain";

export type VerifyResult = {
  verdict: VerifyVerdict;
  confidence: number;
  reasoning: string;
};

const VERIFY_PROMPT = `You are NagarSetu's resolution verification agent.

A citizen reported this civic grievance:
- Title: {title}
- Description: {description}

The first image (image 1) is the citizen's evidence of the original problem. The second image (image 2) is what the municipal department posted as proof that the issue has been fixed.

Compare the two images carefully. Decide one of:

- "fixed" — the original problem is clearly addressed in the second image (e.g. pothole filled with fresh asphalt, garbage cleared, streetlight repaired).
- "unchanged" — the second image shows essentially the same problem still present.
- "different_issue" — the second image is of a different location, or shows an unrelated scene.
- "uncertain" — you cannot tell with reasonable confidence.

Then assign a confidence between 0 and 1 (e.g. 0.9 for clear, 0.5 for somewhat ambiguous), and write ONE short sentence of reasoning that mentions visual evidence.

Return ONLY a strict JSON object on a single line. No markdown, no code fences.

Shape:
{"verdict": "fixed|unchanged|different_issue|uncertain", "confidence": 0.0, "reasoning": "..."}`;

/**
 * Fetch an image and return its bytes as a base64 string + mime type.
 */
async function fetchImageAsBase64(
  url: string
): Promise<{ base64: string; mimeType: string }> {
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const absoluteUrl = url.startsWith("/") ? `${origin}${url}` : url;

  const res = await fetch(absoluteUrl, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Image fetch ${res.status}: ${absoluteUrl}`);

  const contentType =
    res.headers.get("content-type")?.split(";")[0].trim() ?? "image/jpeg";
  const mimeType = contentType.startsWith("image/")
    ? contentType
    : "image/jpeg";

  const arrayBuffer = await res.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return { base64, mimeType };
}

/**
 * Extract a JSON object from text that might be wrapped in markdown fences.
 */
function extractJson(text: string): Record<string, unknown> | null {
  let cleaned = text.trim();
  // Strip markdown code fences
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  cleaned = cleaned.trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find a balanced { ... } substring
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
 * Call Gemini directly to verify a resolution (works on Vercel).
 */
async function verifyWithGemini(args: {
  originalPhotoUrl: string;
  fixPhotoUrl: string;
  grievanceTitle: string;
  grievanceDescription: string;
}): Promise<VerifyResult> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.warn("[verify] No GEMINI_API_KEY set, skipping vision verification");
    return {
      verdict: "uncertain",
      confidence: 0,
      reasoning:
        "Gemini API key not configured — verification skipped.",
    };
  }

  // Fetch both images
  const [original, fix] = await Promise.all([
    fetchImageAsBase64(args.originalPhotoUrl),
    fetchImageAsBase64(args.fixPhotoUrl),
  ]);

  const prompt = VERIFY_PROMPT.replace("{title}", args.grievanceTitle).replace(
    "{description}",
    args.grievanceDescription
  );

  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: original.base64,
              mimeType: original.mimeType,
            },
          },
          {
            text: "\n\n^ Image 1: original problem (citizen's photo)\nv Image 2: claimed fix (municipality's photo)",
          },
          {
            inlineData: {
              data: fix.base64,
              mimeType: fix.mimeType,
            },
          },
        ],
      },
    ],
  });

  const text = response.text?.trim() ?? "";
  const parsed = extractJson(text);

  if (!parsed) {
    console.error("[verify] Could not parse Gemini response:", text.slice(0, 300));
    return {
      verdict: "uncertain",
      confidence: 0,
      reasoning: "Verifier produced an unparseable response.",
    };
  }

  let verdict = ((parsed.verdict as string) ?? "uncertain").toLowerCase();
  if (!["fixed", "unchanged", "different_issue", "uncertain"].includes(verdict)) {
    verdict = "uncertain";
  }

  let confidence = Number(parsed.confidence ?? 0.5);
  if (isNaN(confidence)) confidence = 0.5;
  confidence = Math.max(0, Math.min(1, confidence));

  return {
    verdict: verdict as VerifyVerdict,
    confidence,
    reasoning:
      (parsed.reasoning as string) ||
      "Vision comparison complete (no rationale provided).",
  };
}

/**
 * Try the Python agent service first (for local dev), then fall back to
 * calling Gemini directly (works on Vercel).
 */
export async function verifyResolution(args: {
  originalPhotoUrl: string;
  fixPhotoUrl: string;
  grievanceTitle: string;
  grievanceDescription: string;
}): Promise<VerifyResult> {
  // ── Try Python agent service (local dev / self-hosted) ──
  const agentUrl = process.env.AGENT_SERVICE_URL;
  if (agentUrl) {
    try {
      const res = await fetch(`${agentUrl}/verify-resolution`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(45_000),
      });
      if (res.ok) {
        return (await res.json()) as VerifyResult;
      }
      console.warn(
        `[verify] Agent service returned ${res.status}, falling back to direct Gemini call`
      );
    } catch (err) {
      console.warn("[verify] Agent service unreachable, falling back to direct Gemini call:", err);
    }
  }

  // ── Direct Gemini call (works on Vercel) ──
  try {
    return await verifyWithGemini(args);
  } catch (err) {
    console.error("[verify] Direct Gemini call also failed:", err);
    return {
      verdict: "uncertain",
      confidence: 0,
      reasoning:
        "Verification unavailable — admin's status update was applied without vision verification.",
    };
  }
}
