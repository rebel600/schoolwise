import * as React from "react";

import { cn } from "../../lib/cn";

export type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "error" | "success" | "info";
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "info", ...props }, ref) => (
    <div
      ref={ref}
      /*
       * role="alert" makes assistive technology announce the message when it
       * appears. A silently-rendered error is invisible to a screen reader
       * user, who has no reason to move focus back to look for it.
       */
      role="alert"
      className={cn(
        "rounded-md border px-4 py-3 text-sm",
        variant === "error" && "border-red-200 bg-red-50 text-red-800",
        variant === "success" && "border-green-200 bg-green-50 text-green-800",
        variant === "info" && "border-blue-200 bg-blue-50 text-blue-800",
        className,
      )}
      {...props}
    />
  ),
);
Alert.displayName = "Alert";
