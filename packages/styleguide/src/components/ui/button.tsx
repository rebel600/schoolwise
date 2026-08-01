import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2";
    const variantStyles =
      variant === "default"
        ? "bg-blue-600 text-white hover:bg-blue-700"
        : "border border-gray-300 bg-transparent hover:bg-gray-100 text-gray-900";

    return (
      <button
        className={`${baseStyles} ${variantStyles} ${className}`}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
