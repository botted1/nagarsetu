import { Badge } from "@/components/ui/badge";
import { cn, formatStatus, statusTone } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <Badge className={cn(statusTone(status), className)}>
      <span className="relative flex h-1.5 w-1.5">
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-50",
            status === "IN_PROGRESS" ? "bg-sky-500" : "bg-current"
          )}
        />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
      </span>
      {formatStatus(status)}
    </Badge>
  );
}
