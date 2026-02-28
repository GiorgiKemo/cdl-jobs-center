import { cn } from "@/lib/utils";

const SIZE = {
  sm: "h-5 w-5 border-2",
  md: "h-8 w-8 border-4",
  lg: "h-12 w-12 border-4",
} as const;

export function Spinner({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <div
      className={cn("border-primary border-t-transparent rounded-full animate-spin", SIZE[size], className)}
      role="status"
      aria-label="Loading"
    />
  );
}
