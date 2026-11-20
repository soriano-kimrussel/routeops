"use client";

import type { ReactNode } from "react";

/** Submit button that asks before running a destructive form action. */
export function ConfirmButton({
  message,
  className = "btn btn-danger",
  children,
}: {
  message: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
