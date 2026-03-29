import EditableTitle from "@/components/editor/EditableTitle";

export type ToolbarBreadcrumb =
  | {
      kind: "link";
      label: string;
      href: string;
    }
  | {
      kind: "text";
      label: string;
    }
  | {
      kind: "editable";
      label: string;
      onRename: (newTitle: string) => void;
    };

export default function ToolbarBreadcrumbs({
  items,
}: {
  items: ToolbarBreadcrumb[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="ml-2 flex min-w-0 items-center gap-1.5">
      {items.map((item, index) => (
        <span
          key={`${item.kind}:${item.label}:${index}`}
          className="flex min-w-0 items-center gap-1.5"
        >
          <span className="text-xs text-text-secondary" aria-hidden="true">
            /
          </span>
          {item.kind === "editable" ? (
            <EditableTitle value={item.label} onSave={item.onRename} />
          ) : item.kind === "link" ? (
            <a
              href={item.href}
              className="truncate text-xs text-text-secondary transition-colors hover:text-text-primary"
            >
              {item.label}
            </a>
          ) : (
            <span className="truncate text-xs text-text-secondary">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
