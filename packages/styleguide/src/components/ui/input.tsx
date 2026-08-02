import * as React from "react";

import { cn } from "../../lib/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      /*
       * aria-invalid is what a screen reader announces. A red border alone
       * communicates the error only to sighted users.
       */
      aria-invalid={invalid || undefined}
      className={cn(
        "flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm",
        "placeholder:text-gray-400",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        invalid
          ? "border-red-500 focus-visible:ring-red-500"
          : "border-gray-300 focus-visible:ring-blue-600",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
