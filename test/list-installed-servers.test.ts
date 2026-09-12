import { describe, expect, it } from "vitest";
import {
  groupInstalledServersByName,
  listInstalledMcpServers,
  queryGroupedInstalledServers,
} from "../src/list.ts";
import {
  AgentConfigStore,
  MemoryConfigStoreAdapter,
} from "../src/config-store.ts";
import { getMcpAgentConfig } from "../src/agents.ts";
import type { ListedMcpServer } from "../src/types.ts";

describe("listInstalledMcpServers & groupInstalledServersByName (Deep Query Module)", () => {
  it("groups flat ListedMcpServer entries by serverName and detects divergence", () => {
    const flat: ListedMcpServer[] = [
      {
        serverName: "srv-a",
        agent: "cursor",
        path: "/fake/cursor.json",
        config: { command: "node", args: ["a.js"] },
        serverConfig: { command: "node", args: ["a.js"] },
      },
      {
        serverName: "srv-a",
        agent: "vscode",
        path: "/fake/vscode.json",
        config: { command: "node", args: ["a.js"] },
        serverConfig: { command: "node", args: ["a.js"] },
      },
      {
        serverName: "srv-b",
        agent: "cursor",
        path: "/fake/cursor.json",
        config: { url: "http://localhost:3000" },
        serverConfig: { type: "http", url: "http://localhost:3000" },
      },
      {
        serverName: "srv-b",
        agent: "windsurf" as any,
        path: "/fake/windsurf.json",
        config: { url: "http://localhost:4000" }, // Divergent configuration!
        serverConfig: { type: "http", url: "http://localhost:4000" },
      },
    ];

    const grouped = groupInstalledServersByName(flat);

    expect(grouped.size).toBe(2);

    const srvA = grouped.get("srv-a");
    expect(srvA).toBeDefined();
    expect(srvA?.serverName).toBe("srv-a");
    expect(srvA?.agents).toEqual(["cursor", "vscode"]);
    expect(srvA?.paths).toEqual(["/fake/cursor.json", "/fake/vscode.json"]);
    expect(srvA?.hasDivergence).toBe(false);

    const srvB = grouped.get("srv-b");
    expect(srvB).toBeDefined();
    expect(srvB?.serverName).toBe("srv-b");
    expect(srvB?.agents).toEqual(["cursor", "windsurf"]);
    expect(srvB?.hasDivergence).toBe(true);
  });

  it("queryGroupedInstalledServers lists and groups servers across agents", () => {
    const grouped = queryGroupedInstalledServers({
      cwd: "/nonexistent/test/path",
      global: false,
    });

    expect(grouped).toBeInstanceOf(Map);
  });
});
