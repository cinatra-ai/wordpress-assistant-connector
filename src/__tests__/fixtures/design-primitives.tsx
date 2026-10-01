// Test-only host-module double: no product classes or variant recipes.
// Fixtures are excluded from the published package and the host program.
import * as React from "react";

export function Button({ variant: _variant, size: _size, ...props }: React.ComponentProps<"button"> & {
  variant?: string;
  size?: string;
}) {
  return <button data-slot="button" {...props} />;
}

export function Input(props: React.ComponentProps<"input">) {
  return <input data-slot="input" {...props} />;
}

export function Badge({ variant: _variant, ...props }: React.ComponentProps<"span"> & { variant?: string }) {
  return <span data-slot="badge" {...props} />;
}

export function FieldGroup(props: React.ComponentProps<"div">) {
  return <div data-slot="field-group" {...props} />;
}

export function Field(props: React.ComponentProps<"div">) {
  return <div data-slot="field" {...props} />;
}

export function FieldLabel(props: React.ComponentProps<"label">) {
  return <label data-slot="field-label" {...props} />;
}
