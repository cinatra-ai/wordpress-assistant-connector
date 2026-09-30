// The deps slot binds the host's own address from the ambient runtime port,
// lazily: registration touches nothing of the port; each call of the bound
// member reads it once.

import { afterEach, describe, expect, it, vi } from "vitest";

import { register } from "../register";
import { getWordPressAssistantDeps, _resetWordPressAssistantDepsForTests } from "../deps";

function contextWith(publicBaseUrl: () => string | null) {
  return {
    capabilities: { registerProvider: () => {}, resolveProviders: vi.fn(() => []) },
    runtime: { publicBaseUrl },
  } as never;
}

describe("register — host address from the ambient runtime port", () => {
  afterEach(() => {
    _resetWordPressAssistantDepsForTests();
  });

  it("R1: the bound member returns the host's address", () => {
    register(contextWith(() => "https://app.example.test"));
    expect(getWordPressAssistantDeps().publicBaseUrl?.()).toBe("https://app.example.test");
  });

  it("R2: registration reads nothing; each call of the member reads once", () => {
    const spy = vi.fn(() => "https://app.example.test");
    register(contextWith(spy));
    expect(spy).toHaveBeenCalledTimes(0);
    getWordPressAssistantDeps().publicBaseUrl?.();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
