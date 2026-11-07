import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpecValue } from "@/components/ui/spec";
import { WebGLFallback } from "@/components/three/webgl-guard";
import { usePreferences } from "@/stores/preferences";

describe("SpecValue", () => {
  it("never renders a number for unpublished values", () => {
    render(<SpecValue specKey="batteryKwh" spec={{ value: null, verification: "secondary", sourceIds: ["tesla-model-3"], note: "n/a" }} />);
    expect(screen.getByText("Not published")).toBeInTheDocument();
  });

  it("formats with unit and switches to metric", () => {
    usePreferences.setState({ units: "imperial" });
    const spec = { value: 300, verification: "secondary" as const, sourceIds: ["tesla-model-3"] };
    const { rerender } = render(<SpecValue specKey="epaRangeMi" spec={spec} />);
    expect(screen.getByText("300")).toBeInTheDocument();
    expect(screen.getByText("mi")).toBeInTheDocument();
    usePreferences.setState({ units: "metric" });
    rerender(<SpecValue specKey="epaRangeMi" spec={spec} />);
    expect(screen.getByText("483")).toBeInTheDocument();
    expect(screen.getByText("km")).toBeInTheDocument();
  });

  it("labels announced targets distinctly", () => {
    render(<SpecValue specKey="zeroToSixtyS" spec={{ value: 1.9, verification: "announced-target", sourceIds: ["tesla-roadster"] }} />);
    expect(screen.getByRole("button", { name: /Target/ })).toBeInTheDocument();
  });
});

describe("WebGL fallback", () => {
  it("renders an accessible status message", () => {
    render(<WebGLFallback />);
    expect(screen.getByRole("status")).toHaveTextContent(/doesn't support WebGL/);
  });
});
