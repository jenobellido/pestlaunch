import { cn } from "@/shared/lib/cn";
import { Reveal } from "@/shared/ui/motion";

/** The eyebrow, title and lede every landing section opens with, so they all share one rhythm. */
export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "left",
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <Reveal className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      <p className="text-sm font-medium text-accent">{eyebrow}</p>
      <h2 className="mt-3 text-3xl leading-[1.1] font-medium tracking-tight text-balance sm:text-[2.75rem]">{title}</h2>
      {lede && (
        <p className={cn("mt-4 max-w-xl text-base text-pretty text-muted sm:text-lg", align === "center" && "mx-auto")}>
          {lede}
        </p>
      )}
    </Reveal>
  );
}
