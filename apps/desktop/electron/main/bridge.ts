import http from "http";
import { randomBytes } from "crypto";
import type { IdeContext } from "@coding-helper/shared";
import { getIdeContext, setIdeContext } from "./store";

export interface BridgeState {
  port: number;
  token: string;
  expiresAt: number;
}

let server: http.Server | null = null;
let state: BridgeState | null = null;

function generateToken(): string {
  const part = randomBytes(3).toString("hex").toUpperCase();
  return `${part.slice(0, 4)}-${part.slice(4, 8)}`;
}

function parseBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function isAuthorized(req: http.IncomingMessage): boolean {
  if (!state) return false;
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return false;
  return auth.slice(7) === state.token;
}

export function getBridgeState(): BridgeState | null {
  if (!state) return null;
  if (Date.now() > state.expiresAt) return null;
  return state;
}

export function refreshPairingToken(): BridgeState {
  if (!state) {
    state = { port: 0, token: "", expiresAt: 0 };
  }
  state.token = generateToken();
  state.expiresAt = Date.now() + 5 * 60 * 1000;
  return state;
}

export async function startBridge(
  onContextUpdate?: () => void
): Promise<BridgeState> {
  if (server && state) {
    refreshPairingToken();
    return state;
  }

  return new Promise((resolve, reject) => {
    server = http.createServer(async (req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = req.url ?? "/";

      if (url === "/health" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, paired: Boolean(state?.token) }));
        return;
      }

      if (url === "/context" && req.method === "POST") {
        if (!isAuthorized(req)) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Unauthorized" }));
          return;
        }
        try {
          const body = (await parseBody(req)) as IdeContext;
          setIdeContext(body);
          onContextUpdate?.();
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid body" }));
        }
        return;
      }

      if (url === "/context" && req.method === "GET") {
        if (!isAuthorized(req)) {
          res.writeHead(401);
          res.end();
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(getIdeContext()));
        return;
      }

      res.writeHead(404);
      res.end();
    });

    server.listen(0, "127.0.0.1", () => {
      const addr = server!.address();
      const port = typeof addr === "object" && addr ? addr.port : 39281;
      state = {
        port,
        token: generateToken(),
        expiresAt: Date.now() + 5 * 60 * 1000,
      };
      resolve(state);
    });

    server.on("error", reject);
  });
}

export function stopBridge(): void {
  server?.close();
  server = null;
}
