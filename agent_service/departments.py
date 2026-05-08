"""Mirror of the departments seeded in the Next.js Prisma schema."""

DEPARTMENTS = [
    {
        "slug": "public-works",
        "name": "Public Works Department",
        "description": "Roads, footpaths, drains, signage and civil infrastructure.",
        "keywords": [
            "pothole",
            "road",
            "footpath",
            "pavement",
            "drainage",
            "drain",
            "manhole",
            "signage",
            "speed breaker",
        ],
    },
    {
        "slug": "sanitation",
        "name": "Sanitation & Solid Waste",
        "description": "Garbage collection, public dustbins, dump clearing, public toilets and street cleaning.",
        "keywords": [
            "garbage",
            "trash",
            "dustbin",
            "waste",
            "dump",
            "toilet",
            "sewage smell",
            "cleaning",
            "litter",
        ],
    },
    {
        "slug": "electrical",
        "name": "Electrical & Street Lighting",
        "description": "Streetlights, public-area electrical hazards, fallen wires and traffic signals.",
        "keywords": [
            "streetlight",
            "street light",
            "lamp",
            "electrical",
            "wire",
            "transformer",
            "traffic signal",
            "spark",
            "shock",
        ],
    },
    {
        "slug": "water",
        "name": "Water Supply & Sewerage",
        "description": "Water leaks, low pressure, pipe bursts, blocked sewers and water quality complaints.",
        "keywords": [
            "water",
            "leak",
            "pipe",
            "burst",
            "sewer",
            "blocked",
            "pressure",
            "tap",
            "supply",
            "drinking",
        ],
    },
]


def find_by_slug(slug: str):
    for d in DEPARTMENTS:
        if d["slug"] == slug:
            return d
    return None


def keyword_match(text: str) -> str:
    """Fallback keyword classifier — used by the agent or as a safety net."""
    text_lower = text.lower()
    best, best_score = DEPARTMENTS[0], -1
    for dept in DEPARTMENTS:
        score = sum(1 for kw in dept["keywords"] if kw in text_lower)
        if score > best_score:
            best_score = score
            best = dept
    return best["slug"]
