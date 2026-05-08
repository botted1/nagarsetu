const AGENT_URL = process.env.AGENT_SERVICE_URL ?? "http://localhost:8001";

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

export async function verifyResolution(args: {
  originalPhotoUrl: string;
  fixPhotoUrl: string;
  grievanceTitle: string;
  grievanceDescription: string;
}): Promise<VerifyResult> {
  try {
    const res = await fetch(`${AGENT_URL}/verify-resolution`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`agent ${res.status}: ${txt}`);
    }
    return (await res.json()) as VerifyResult;
  } catch (err) {
    console.error("[verify-resolution] agent call failed:", err);
    return {
      verdict: "uncertain",
      confidence: 0,
      reasoning:
        "Verifier unreachable — admin's status update was applied without vision verification.",
    };
  }
}
