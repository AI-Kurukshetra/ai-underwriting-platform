import { cn } from "@/lib/utils";
import { formatToken } from "@/lib/utils";

export function StatusPill({ value }: { value: string }) {
  const normalized = value.toLowerCase().replace(/\s+/g, "_");
  return <span className={cn("status-pill", normalized)}>{formatToken(value)}</span>;
}
