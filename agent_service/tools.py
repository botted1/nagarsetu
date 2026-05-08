"""Tools used by the NagarSetu grievance agent."""
from __future__ import annotations

import json
import os
from typing import Any

import httpx

from departments import DEPARTMENTS, find_by_slug, keyword_match

WEB_APP_URL = os.environ.get("WEB_APP_URL", "http://localhost:3000")


# Note: ADK function tools introspect the function signature & docstring to build the
# tool spec presented to Gemini. Keep them simple, with clear types and docstrings.

def lookup_department(category: str, hint_text: str = "") -> dict[str, Any]:
    """Resolve a high-level category (e.g. 'Roads', 'Garbage', 'Streetlight', 'Water')
    to the responsible municipal department. Falls back to keyword matching against
    `hint_text` if the category is ambiguous.

    Args:
      category: A short category label such as "Roads", "Solid Waste", "Streetlight", "Water Supply".
      hint_text: Optional free-text description, used as a fallback for matching.

    Returns:
      A dict with keys: slug, name, description.
    """
    cat = (category or "").strip().lower()
    cat_to_slug = {
        "roads": "public-works",
        "road": "public-works",
        "pothole": "public-works",
        "footpath": "public-works",
        "drainage": "public-works",
        "drain": "public-works",
        "infrastructure": "public-works",
        "solid waste": "sanitation",
        "waste": "sanitation",
        "garbage": "sanitation",
        "sanitation": "sanitation",
        "toilet": "sanitation",
        "streetlight": "electrical",
        "street light": "electrical",
        "street lighting": "electrical",
        "electrical": "electrical",
        "wires": "electrical",
        "traffic signal": "electrical",
        "water": "water",
        "water supply": "water",
        "sewerage": "water",
        "sewer": "water",
        "leak": "water",
    }
    slug = cat_to_slug.get(cat)
    if slug is None and hint_text:
        slug = keyword_match(hint_text)
    if slug is None:
        slug = "public-works"
    dept = find_by_slug(slug) or DEPARTMENTS[0]
    return {
        "slug": dept["slug"],
        "name": dept["name"],
        "description": dept["description"],
    }


async def find_similar(
    lat: float, lng: float, category: str = "", radius_meters: int = 250
) -> dict[str, Any]:
    """Find existing grievances of the same kind within `radius_meters` of the given
    coordinates. The web app exposes an internal endpoint that does the geo lookup;
    this tool just calls it.

    Args:
      lat: Latitude in decimal degrees.
      lng: Longitude in decimal degrees.
      category: Optional category hint, e.g. "Roads".
      radius_meters: Search radius (default 250).

    Returns:
      A dict {"ids": [grievance_id, ...]}.
    """
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.post(
                f"{WEB_APP_URL}/api/grievance/similar",
                json={
                    "lat": lat,
                    "lng": lng,
                    "category": category,
                    "radiusMeters": radius_meters,
                },
            )
            res.raise_for_status()
            return res.json()
    except Exception as exc:  # noqa: BLE001
        return {"ids": [], "error": str(exc)}


def draft_complaint(
    title: str,
    description: str,
    department_name: str,
    citizen_name: str = "",
    address: str = "",
) -> dict[str, str]:
    """Compose a formal Indian municipal complaint letter ("To, The Commissioner...").

    Args:
      title: Short title of the grievance.
      description: Full description from the citizen.
      department_name: e.g. "Public Works Department".
      citizen_name: Optional citizen name; falls back to "a concerned citizen".
      address: Optional location/address string.

    Returns:
      A dict {"complaint": "..."}.
    """
    citizen = citizen_name.strip() or "A concerned citizen"
    addr_line = f"\nLocation of issue: {address}\n" if address else "\n"
    body = f"""To,
The Commissioner,
{department_name},

Subject: {title}

Respected Sir/Madam,

I, {citizen}, am writing to formally bring to your attention the following civic issue that requires the department's immediate intervention:

{description}
{addr_line}
The issue is causing inconvenience and, in some cases, potential safety risk to residents of the area. I respectfully request the department to inspect the location at the earliest, take appropriate corrective action, and update the complainant on the progress.

I would be grateful for an acknowledgement and a tentative timeline for resolution.

Yours sincerely,
{citizen}"""
    return {"complaint": body}
