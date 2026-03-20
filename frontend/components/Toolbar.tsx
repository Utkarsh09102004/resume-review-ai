"use client";

import { type ReactNode } from "react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface ToolbarUser {
  name: string;
  avatarUrl?: string;
}

interface ToolbarProps {
  breadcrumb?: BreadcrumbItem[];
  children?: ReactNode;
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
  breadcrumb,
  children,
  actions,
  user,
}: ToolbarProps) {
  return (
    <header className="flex h-12 shrink-0 items-center border-b border-bg-border bg-bg-elevated px-4">
      {/* Left section */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-accent-amber" aria-hidden="true">
          <DiamondIcon />
        </span>
        <span className="text-sm font-semibold text-text-primary whitespace-nowrap">
          ResumeForge
        </span>

        {breadcrumb && breadcrumb.length > 0 ? (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 ml-2 min-w-0">
            {breadcrumb.map((item, i) => (
              <span key={i} className="flex items-center gap-1.5 min-w-0">
                <span className="text-text-secondary text-xs" aria-hidden="true">
                  /
                </span>
                {item.href ? (
                  <a
                    href={item.href}
                    className="text-xs text-text-secondary hover:text-text-primary transition-colors truncate"
                  >
                    {item.label}
                  </a>
                ) : (
                  <span className="text-xs text-text-secondary truncate">
                    {item.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
      </div>

      {/* Center section */}
      <div className="flex-1 flex justify-center px-4">
        {children}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3 shrink-0">
        {actions}
        {user ? (
          <div
            className="h-8 w-8 rounded-full bg-bg-surface border border-bg-border flex items-center justify-center overflow-hidden"
            title={user.name}
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xs font-medium text-text-secondary">
                {user.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        ) : null}
      </div>
    </header>
  );
}
