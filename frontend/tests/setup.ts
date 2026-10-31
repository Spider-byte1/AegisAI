import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.localStorage.clear();
});

// jsdom has no layout engine, so a few browser APIs are stubbed.
Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", { value: vi.fn(), writable: true });
