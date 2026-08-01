import { createRef } from "react";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it("renders its children", () => {
    render(<Button>Sign In</Button>);
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });

  it("applies variant styles", () => {
    const { rerender } = render(<Button>Default</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-blue-600");

    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole("button")).toHaveClass("border");
  });

  it("merges a caller-supplied className rather than replacing base styles", () => {
    render(<Button className="w-full">Wide</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("w-full");
    expect(button).toHaveClass("inline-flex");
  });

  it("forwards a ref to the underlying button element", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("passes through native button attributes", () => {
    render(<Button disabled type="submit" />);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("type", "submit");
  });
});
