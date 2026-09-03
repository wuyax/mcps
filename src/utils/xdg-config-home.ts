import { homedir, platform } from "node:os";
import { join } from "node:path";

export const xdgConfigHome = (): string => {
  const explicit = process.env.XDG_CONFIG_HOME?.trim();
  if (explicit) return explicit;

  if (platform() === "win32") {
    const localAppData = process.env.LOCALAPPDATA?.trim();
    if (localAppData) return localAppData;
  }

  return join(homedir(), ".config");
};
