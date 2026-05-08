import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatStatus(status: string) {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());
}

export function formatRelativeTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function statusTone(status: string) {
  switch (status) {
    case "SUBMITTED":
      return "bg-zinc-200 text-zinc-900 ring-zinc-300/60 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700";
    case "ACKNOWLEDGED":
      return "bg-amber-100 text-amber-900 ring-amber-300/60 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/30";
    case "IN_PROGRESS":
      return "bg-sky-100 text-sky-900 ring-sky-300/60 dark:bg-sky-500/15 dark:text-sky-200 dark:ring-sky-500/30";
    case "RESOLVED":
      return "bg-emerald-100 text-emerald-900 ring-emerald-300/60 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/30";
    case "REJECTED":
      return "bg-rose-100 text-rose-900 ring-rose-300/60 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-rose-500/30";
    default:
      return "bg-zinc-100 text-zinc-900";
  }
}

export function priorityTone(priority: string) {
  switch (priority) {
    case "URGENT":
      return "text-rose-700 dark:text-rose-300";
    case "HIGH":
      return "text-amber-700 dark:text-amber-300";
    case "MEDIUM":
      return "text-sky-700 dark:text-sky-300";
    default:
      return "text-zinc-600 dark:text-zinc-400";
  }
}
