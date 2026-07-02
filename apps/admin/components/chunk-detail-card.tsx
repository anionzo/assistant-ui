import { extractDisplayFields } from "@/lib/chunk-display";
import { cn } from "@/lib/utils";

type ChunkDetailCardProps = {
  index: number;
  record: Record<string, unknown>;
  score?: number;
  scoreLabel?: string;
  className?: string;
};

export function ChunkDetailCard({
  index,
  record,
  score,
  scoreLabel = "Score",
  className,
}: ChunkDetailCardProps) {
  const { primaryText, fields } = extractDisplayFields(record);

  return (
    <article className={cn("rounded-xl border border-border bg-card p-4 text-sm", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>#{index}</span>
        {score !== undefined ? (
          <span>
            {scoreLabel} {String(score)}
          </span>
        ) : null}
      </div>

      {primaryText ? (
        <p className="mb-3 whitespace-pre-wrap leading-relaxed">{primaryText}</p>
      ) : null}

      {fields.length > 0 ? (
        <dl className="grid gap-2 border-t border-border pt-3 sm:grid-cols-2">
          {fields.map((field) => (
            <div
              key={field.key}
              className={cn("min-w-0", field.multiline && "sm:col-span-2")}
            >
              <dt className="text-xs font-medium text-muted-foreground">{field.key}</dt>
              <dd
                className={cn(
                  "mt-0.5 break-words font-mono text-xs text-foreground",
                  field.multiline && "max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-2",
                )}
              >
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  );
}