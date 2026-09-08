import { describe, expect, it, vi } from "vitest";

import {
  formatCoHostedBadge,
  logCoHostedNotice,
} from "../src/utils/co-hosted-feedback.ts";
import { logger } from "../src/utils/logger.ts";

describe("co-hosted-feedback", () => {
  describe("formatCoHostedBadge", () => {
    it("returns empty string when agents list is undefined or empty", () => {
      expect(formatCoHostedBadge("configured", undefined)).toBe("");
      expect(formatCoHostedBadge("configured", [])).toBe("");
      expect(formatCoHostedBadge("affected", undefined)).toBe("");
      expect(formatCoHostedBadge("affected", [])).toBe("");
    });

    it("formats co-configured badge with yellow color", () => {
      const badge = formatCoHostedBadge("configured", ["antigravity-cli", "qoder"]);
      expect(badge).toContain("(co-configured: antigravity-cli, qoder)");
    });

    it("formats co-affected badge with yellow color", () => {
      const badge = formatCoHostedBadge("affected", ["antigravity-cli"]);
      expect(badge).toContain("(co-affected: antigravity-cli)");
    });
  });

  describe("logCoHostedNotice", () => {
    it("does nothing when agents list is undefined or empty", () => {
      const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => {});
      logCoHostedNotice("configured", undefined);
      logCoHostedNotice("configured", []);
      logCoHostedNotice("affected", undefined);
      logCoHostedNotice("affected", []);
      expect(infoSpy).not.toHaveBeenCalled();
      infoSpy.mockRestore();
    });

    it("logs configured notice for co-hosted agents", () => {
      const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => {});
      logCoHostedNotice("configured", ["antigravity-cli"]);
      expect(infoSpy).toHaveBeenCalledTimes(1);
      expect(infoSpy.mock.calls[0]?.[0]).toContain("Also configured for co-hosted agent(s):");
      expect(infoSpy.mock.calls[0]?.[0]).toContain("antigravity-cli");
      infoSpy.mockRestore();
    });

    it("logs affected notice for co-hosted agents", () => {
      const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => {});
      logCoHostedNotice("affected", ["github-copilot-cli"]);
      expect(infoSpy).toHaveBeenCalledTimes(1);
      expect(infoSpy.mock.calls[0]?.[0]).toContain("Also affects co-hosted agent(s):");
      expect(infoSpy.mock.calls[0]?.[0]).toContain("github-copilot-cli");
      infoSpy.mockRestore();
    });
  });
});
