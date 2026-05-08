"use client";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

function Skeleton({ height = 320 }: { height?: number }) {
  return (
    <div
      className="grid place-items-center bg-[var(--secondary)]/40"
      style={{ height }}
    >
      <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading map…
      </div>
    </div>
  );
}

export const GrievanceOverviewMapClient = dynamic(
  () =>
    import("./grievance-map").then((m) => ({
      default: m.GrievanceOverviewMap,
    })),
  {
    ssr: false,
    loading: () => <Skeleton />,
  }
);

export const GrievancePickerClient = dynamic(
  () =>
    import("./grievance-map").then((m) => ({ default: m.GrievancePicker })),
  {
    ssr: false,
    loading: () => <Skeleton />,
  }
);
