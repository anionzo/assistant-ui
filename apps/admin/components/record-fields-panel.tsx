import { extractDisplayFields } from "@/lib/chunk-display";
import { cn } from "@/lib/utils";

type RecordFieldsPanelProps = {
  record: Record<string, unknown>;
  title?: string;
  className?: string;
  contentKeys?: string[];
  skipKeys?: string[];
};

export function RecordFieldsPanel({
  record,
  title,
  className,
  contentKeys,
  skipKeys,
}: RecordFieldsPanelProps) {
  const { primaryText, fields } = extractDisplayFields(record, { contentKeys, skipKeys });

  if (!primaryText && fields.length === 0) return null;

  return (
    <section className={cn("rounded-xl border border-border bg-card p-4 text-sm", className)}>
      {title ? <h3 className="mb-3 text-sm font-semibold">{title}</h3> : null}
      {primaryText ? (
        <p className="mb-3 whitespace-pre-wrap leading-relaxed text-muted-foreground">{primaryText}</p>
      ) : null}
      {fields.length > 0 ? (
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((field) => (
            <div
              key={field.key}
              className={cn("min-w-0", field.multiline && "sm:col-span-2 lg:col-span-3")}
            >
              <dt className="text-xs text-muted-foreground">{field.key}</dt>
              <dd
                className={cn(
                  "mt-0.5 break-words font-medium",
                  field.multiline && "max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-2 font-mono text-xs font-normal",
                )}
              >
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}