interface TreeConnectorProps {
  isLast: boolean;
}

export default function TreeConnector({ isLast }: TreeConnectorProps) {
  return (
    <div className="relative flex items-center w-6 shrink-0" aria-hidden="true">
      {/* Vertical line */}
      <div
        className={`absolute left-2 top-0 w-px bg-bg-border ${
          isLast ? "h-1/2" : "h-full"
        }`}
      />
      {/* Horizontal dash */}
      <div className="absolute left-2 top-1/2 h-px w-4 bg-bg-border" />
    </div>
  );
}
