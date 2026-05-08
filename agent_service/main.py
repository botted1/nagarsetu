"""FastAPI wrapper around the grievance triage agent."""
from __future__ import annotations

import json
import os
import re
import uuid
from typing import Any

from dotenv import load_dotenv

load_dotenv()

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types as genai_types
from pydantic import BaseModel

from agent import build_agent
from departments import find_by_slug
from tools import draft_complaint, lookup_department

APP_NAME = "smartci-grievance"

app = FastAPI(title="NagarSetu Grievance Agent")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_runner: Runner | None = None
_session_service: InMemorySessionService | None = None


def _ensure_runtime() -> Runner:
    global _runner, _session_service
    if _runner is not None:
        return _runner
    if not (
        os.environ.get("GEMINI_API_KEY")
        or os.environ.get("GOOGLE_API_KEY")
        or os.environ.get("GOOGLE_GENAI_USE_VERTEXAI")
    ):
        raise RuntimeError(
            "GEMINI_API_KEY (or GOOGLE_API_KEY) is required to run the agent."
        )
    if not os.environ.get("GOOGLE_API_KEY") and os.environ.get("GEMINI_API_KEY"):
        os.environ["GOOGLE_API_KEY"] = os.environ["GEMINI_API_KEY"]

    _session_service = InMemorySessionService()
    _runner = Runner(
        agent=build_agent(),
        app_name=APP_NAME,
        session_service=_session_service,
        auto_create_session=True,
    )
    return _runner


class GrievanceIn(BaseModel):
    title: str
    description: str
    photoUrl: str | None = None
    lat: float | None = None
    lng: float | None = None
    address: str | None = None
    citizenName: str | None = None


class GrievanceOut(BaseModel):
    category: str
    departmentSlug: str
    priority: str
    draftedComplaint: str
    similarGrievanceIds: list[str]
    confidence: float
    reasoning: str


class VerifyIn(BaseModel):
    originalPhotoUrl: str
    fixPhotoUrl: str
    grievanceTitle: str
    grievanceDescription: str


class VerifyOut(BaseModel):
    verdict: str  # "fixed" | "unchanged" | "different_issue" | "uncertain"
    confidence: float
    reasoning: str


@app.get("/healthz")
async def healthz() -> dict[str, Any]:
    return {
        "ok": True,
        "model": os.environ.get("GEMINI_MODEL", "gemini-2.5-flash"),
        "has_key": bool(
            os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        ),
    }


def _build_user_message(payload: GrievanceIn) -> genai_types.Content:
    parts: list[genai_types.Part] = []
    text = (
        f"Citizen grievance:\n"
        f"Title: {payload.title}\n"
        f"Description: {payload.description}\n"
        f"Citizen name: {payload.citizenName or 'unknown'}\n"
        f"Address: {payload.address or 'not provided'}\n"
        f"Coordinates: {payload.lat}, {payload.lng}\n\n"
        "Please run the full triage flow and return the final JSON object."
    )
    parts.append(genai_types.Part.from_text(text=text))

    if payload.photoUrl:
        parts.append(
            genai_types.Part.from_text(
                text=(
                    f"\n(Photo URL provided by the citizen: {payload.photoUrl} — "
                    "if it's a remote URL you cannot fetch, use only the description.)"
                )
            )
        )

    return genai_types.Content(role="user", parts=parts)


# ──────────────────── JSON extraction helpers ────────────────────
def _balanced_object(text: str) -> str | None:
    """Return the first balanced `{...}` substring, respecting strings + escapes."""
    start = text.find("{")
    if start < 0:
        return None
    depth = 0
    in_string = False
    escape = False
    for i in range(start, len(text)):
        ch = text[i]
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
        else:
            if ch == '"':
                in_string = True
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    return text[start : i + 1]
    return None


def _try_parse(s: str) -> dict[str, Any] | None:
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        # Repair common LLM JSON quirks: \' is not valid JSON, but appears often.
        repaired = s.replace("\\'", "'")
        try:
            return json.loads(repaired)
        except json.JSONDecodeError:
            return None


def _extract_json(text: str) -> dict[str, Any] | None:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"```$", "", text).strip()
    direct = _try_parse(text)
    if direct is not None:
        return direct
    candidate = _balanced_object(text)
    return _try_parse(candidate) if candidate else None


def _fallback(payload: GrievanceIn) -> GrievanceOut:
    text = f"{payload.title} {payload.description}"
    dept = lookup_department(category="", hint_text=text)
    drafted = draft_complaint(
        title=payload.title,
        description=payload.description,
        department_name=dept["name"],
        citizen_name=payload.citizenName or "",
        address=payload.address or "",
    )
    priority = "MEDIUM"
    lower = text.lower()
    if any(w in lower for w in ["urgent", "emergency", "danger", "injur", "hazard"]):
        priority = "URGENT"
    elif any(w in lower for w in ["child", "elder", "safety", "night", "dark"]):
        priority = "HIGH"
    category_map = {
        "public-works": "Roads",
        "sanitation": "Solid Waste",
        "electrical": "Streetlight",
        "water": "Water Supply",
    }
    return GrievanceOut(
        category=category_map.get(dept["slug"], "General"),
        departmentSlug=dept["slug"],
        priority=priority,
        draftedComplaint=drafted["complaint"],
        similarGrievanceIds=[],
        confidence=0.4,
        reasoning="Local fallback used (LLM did not produce a parseable result).",
    )


VERIFY_PROMPT_TEMPLATE = """You are NagarSetu's resolution verification agent.

A citizen reported this civic grievance:
- Title: {title}
- Description: {description}

The first image (image 1) is the citizen's evidence of the original problem. The second image (image 2) is what the municipal department posted as proof that the issue has been fixed.

Compare the two images carefully. Decide one of:

- "fixed" — the original problem is clearly addressed in the second image (e.g. pothole filled with fresh asphalt, garbage cleared, streetlight repaired).
- "unchanged" — the second image shows essentially the same problem still present.
- "different_issue" — the second image is of a different location, or shows an unrelated scene.
- "uncertain" — you cannot tell with reasonable confidence.

Then assign a confidence between 0 and 1 (e.g. 0.9 for clear, 0.5 for somewhat ambiguous), and write ONE short sentence of reasoning that mentions visual evidence ("the asphalt is fresh and the surrounding tarmac matches", "the same garbage pile and dustbin are visible", etc).

Return ONLY a strict JSON object on a single line. Use only standard JSON escapes (\\", \\\\, \\n, \\r, \\t — never \\').

Shape:
{{"verdict": "fixed|unchanged|different_issue|uncertain", "confidence": 0.0, "reasoning": "..."}}"""


WEB_APP_URL = os.environ.get("WEB_APP_URL", "http://localhost:3000")


def _absolute_url(url: str) -> str:
    """If the URL is relative (Next.js /uploads/...), prefix the web app origin."""
    if url.startswith("http://") or url.startswith("https://"):
        return url
    if url.startswith("/"):
        return f"{WEB_APP_URL}{url}"
    return url


async def _fetch_image(url: str) -> tuple[bytes, str]:
    """Download an image and return (bytes, mime_type)."""
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        res = await client.get(_absolute_url(url))
        res.raise_for_status()
        ctype = res.headers.get("content-type", "image/jpeg").split(";")[0].strip()
        if not ctype.startswith("image/"):
            ctype = "image/jpeg"
        return res.content, ctype


@app.post("/verify-resolution", response_model=VerifyOut)
async def verify_resolution(payload: VerifyIn) -> VerifyOut:
    if not (
        os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    ):
        raise HTTPException(
            status_code=503, detail="Gemini API key not configured"
        )
    if not os.environ.get("GOOGLE_API_KEY") and os.environ.get("GEMINI_API_KEY"):
        os.environ["GOOGLE_API_KEY"] = os.environ["GEMINI_API_KEY"]

    try:
        original_bytes, original_mime = await _fetch_image(payload.originalPhotoUrl)
        fix_bytes, fix_mime = await _fetch_image(payload.fixPhotoUrl)
    except Exception as exc:  # noqa: BLE001
        print(f"[verify] image fetch failed: {exc!r}")
        return VerifyOut(
            verdict="uncertain",
            confidence=0.0,
            reasoning=f"Could not fetch one of the images: {type(exc).__name__}",
        )

    prompt = VERIFY_PROMPT_TEMPLATE.format(
        title=payload.grievanceTitle, description=payload.grievanceDescription
    )

    try:
        client = genai.Client()
        response = client.models.generate_content(
            model=os.environ.get("GEMINI_MODEL", "gemini-2.5-flash"),
            contents=[
                genai_types.Content(
                    role="user",
                    parts=[
                        genai_types.Part.from_text(text=prompt),
                        genai_types.Part.from_bytes(
                            data=original_bytes, mime_type=original_mime
                        ),
                        genai_types.Part.from_text(
                            text="\n\n^ Image 1: original problem (citizen's photo)\n"
                            "v Image 2: claimed fix (municipality's photo)"
                        ),
                        genai_types.Part.from_bytes(
                            data=fix_bytes, mime_type=fix_mime
                        ),
                    ],
                )
            ],
        )
    except Exception as exc:  # noqa: BLE001
        print(f"[verify] Gemini call failed: {exc!r}")
        return VerifyOut(
            verdict="uncertain",
            confidence=0.0,
            reasoning=f"Gemini call failed: {type(exc).__name__}. Approved without verification.",
        )

    text = (response.text or "").strip()
    parsed = _extract_json(text)
    if not parsed:
        print(f"[verify] could not parse JSON; raw: {text[:300]!r}")
        return VerifyOut(
            verdict="uncertain",
            confidence=0.0,
            reasoning="Verifier produced an unparseable response.",
        )

    verdict = (parsed.get("verdict") or "uncertain").lower()
    if verdict not in {"fixed", "unchanged", "different_issue", "uncertain"}:
        verdict = "uncertain"
    try:
        confidence = float(parsed.get("confidence") or 0.5)
    except (TypeError, ValueError):
        confidence = 0.5
    confidence = max(0.0, min(1.0, confidence))

    return VerifyOut(
        verdict=verdict,
        confidence=confidence,
        reasoning=parsed.get("reasoning")
        or "Vision comparison complete (no rationale provided).",
    )


@app.post("/process-grievance", response_model=GrievanceOut)
async def process_grievance(payload: GrievanceIn) -> GrievanceOut:
    runner = _ensure_runtime()
    assert _session_service is not None

    user_id = "citizen"
    session_id = uuid.uuid4().hex

    await _session_service.create_session(
        app_name=APP_NAME, user_id=user_id, session_id=session_id
    )

    final_text = ""
    try:
        async for event in runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=_build_user_message(payload),
        ):
            if event.is_final_response() and event.content and event.content.parts:
                for part in event.content.parts:
                    if getattr(part, "text", None):
                        final_text += part.text
    except Exception as exc:  # noqa: BLE001
        print(f"[agent] run failed: {exc!r}")
        return _fallback(payload)

    parsed = _extract_json(final_text) if final_text else None
    if not parsed:
        print(f"[agent] could not parse JSON; raw: {final_text[:400]!r}")
        return _fallback(payload)

    slug = parsed.get("departmentSlug") or "public-works"
    if not find_by_slug(slug):
        slug = lookup_department(
            category=parsed.get("category", ""),
            hint_text=f"{payload.title} {payload.description}",
        )["slug"]

    priority = (parsed.get("priority") or "MEDIUM").upper()
    if priority not in {"LOW", "MEDIUM", "HIGH", "URGENT"}:
        priority = "MEDIUM"

    return GrievanceOut(
        category=parsed.get("category") or "General",
        departmentSlug=slug,
        priority=priority,
        draftedComplaint=parsed.get("draftedComplaint")
        or _fallback(payload).draftedComplaint,
        similarGrievanceIds=list(parsed.get("similarGrievanceIds") or []),
        confidence=float(parsed.get("confidence") or 0.7),
        reasoning=parsed.get("reasoning") or "Agent classification.",
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "8001")),
        reload=False,
    )
