import { createRequire } from "module";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const dir = dirname(fileURLToPath(import.meta.url));
const electronPkg = dirname(require.resolve("electron/package.json"));
const { spawnSync } = await import("child_process");
const installScript = join(electronPkg, "install.js");
const r = spawnSync(process.execPath, [installScript], { stdio: "inherit", cwd: electronPkg });
process.exit(r.status ?? 1);
