export type DepartmentSeed = {
  slug: string;
  name: string;
  description: string;
  contactEmail: string;
  color: string;
  icon: string;
  keywords: string[];
};

export const DEPARTMENT_SEED: DepartmentSeed[] = [
  {
    slug: "public-works",
    name: "Public Works Department",
    description:
      "Roads, footpaths, drains, signage, road markings and other civil infrastructure.",
    contactEmail: "publicworks@smartcity.local",
    color: "#F59E0B",
    icon: "Construction",
    keywords: [
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
    slug: "sanitation",
    name: "Sanitation & Solid Waste",
    description:
      "Garbage collection, public dustbins, dump clearing, public toilets and street cleaning.",
    contactEmail: "sanitation@smartcity.local",
    color: "#10B981",
    icon: "Trash2",
    keywords: [
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
    slug: "electrical",
    name: "Electrical & Street Lighting",
    description:
      "Streetlights, public-area electrical hazards, fallen wires and traffic signals.",
    contactEmail: "electrical@smartcity.local",
    color: "#EAB308",
    icon: "Lightbulb",
    keywords: [
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
    slug: "water",
    name: "Water Supply & Sewerage",
    description:
      "Water leaks, low pressure, pipe bursts, blocked sewers and water quality complaints.",
    contactEmail: "water@smartcity.local",
    color: "#06B6D4",
    icon: "Droplets",
    keywords: [
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
];

export function findDepartmentByText(text: string): DepartmentSeed {
  const normalized = text.toLowerCase();
  let best: { dept: DepartmentSeed; score: number } | null = null;
  for (const dept of DEPARTMENT_SEED) {
    let score = 0;
    for (const kw of dept.keywords) if (normalized.includes(kw)) score += 1;
    if (!best || score > best.score) best = { dept, score };
  }
  return best?.dept ?? DEPARTMENT_SEED[0];
}
