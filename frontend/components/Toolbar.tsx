import { type ReactNode } from "react";

interface ToolbarUser {
  name: string;
  avatarUrl?: string;
}

interface ToolbarProps {
  navigation?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  user?: ToolbarUser;
}

function DiamondIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="10"
        y="1"
        width="12.73"
        height="12.73"
        rx="2"
        transform="rotate(45 10 1)"
        fill="currentColor"
      />
    </svg>
  );
}

export default function Toolbar({
  navigation,
  status,
  actions,
  user,
}: ToolbarProps) {
  return (
    <header className="flex h-12 shrink-0 items-center border-b border-bg-border bg-bg-elevated px-4">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-accent-amber" aria-hidden="true">
          <DiamondIcon />
        </span>
        <span className="whitespace-nowrap text-sm font-semibold text-text-primary">
          ResumeForge
        </span>
        {navigation}
      </div>

      <div className="flex flex-1 justify-center px-4">{status}</div>

      <div className="flex shrink-0 items-center gap-3">
        {actions}
        {user ? (
          <div className="flex items-center gap-2">
            <a
              href="/api/logto/sign-out"
              className="text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              Sign out
            </a>
            <div
              className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-bg-border bg-bg-surface"
              title={user.name}
            >
              {user.avatarUrl ? (
                // External IdP avatars can come from arbitrary hosts, so keep a plain img here.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs font-medium text-text-secondary">
                  {user.name[0]?.toUpperCase()}
                </span>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
