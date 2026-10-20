// @effect-diagnostics nodeBuiltinImport:off globalTimers:off globalDate:off -- a plain Node service in a container, outside the Effect runtime.
import * as NodeChildProcess from "node:child_process";
import * as NodeFSP from "node:fs/promises";
import * as NodePath from "node:path";
import * as NodeReadline from "node:readline";

interface CodexAuthFile {
  readonly auth_mode?: string;
  readonly last_refresh?: string;
  readonly tokens?: {
    readonly access_token?: string;
    readonly refresh_token?: string;
    readonly account_id?: string;
  };
}

interface Pending {
  readonly done: (value: unknown) => void;
  readonly fail: (error: Error) => void;
  readonly timer: NodeJS.Timeout;
}

const REFRESH_MARGIN_MS = 60_000;
const MAX_TOKEN_AGE_MS = 8 * 24 * 60 * 60 * 1000;

function tokenExpiry(accessToken: string): number {
  try {
    const payload = accessToken.split(".")[1] ?? "";
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString()) as { exp?: number };
    return (claims.exp ?? 0) * 1000;
  } catch {
    return 0;
  }
}

/**
 * The Codex ChatGPT login, held only by the gateway. Codex itself refreshes
 * the token: the gateway runs `codex app-server` against the login folder and
 * asks it to refresh when the token is near its expiry.
 */
export class CodexSubscription {
  private process: NodeChildProcess.ChildProcessWithoutNullStreams | undefined;
  private readonly pending = new Map<number, Pending>();
  private sequence = 0;
  private queue: Promise<unknown> = Promise.resolve();

  private readonly codexHome: string;
  private readonly path: string;

  constructor(codexHome: string, path: string) {
    this.codexHome = codexHome;
    this.path = path;
  }

  private async start() {
    if (this.process) return;
    const child = NodeChildProcess.spawn(
      "codex",
      ["-c", 'cli_auth_credentials_store="file"', "app-server"],
      {
        cwd: this.codexHome,
        env: { PATH: this.path, HOME: this.codexHome, CODEX_HOME: this.codexHome },
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    this.process = child;
    child.stderr.resume();
    NodeReadline.createInterface({ input: child.stdout }).on("line", (line) => {
      try {
        const message = JSON.parse(line) as { id?: number; result?: unknown; error?: unknown };
        const waiting = message.id === undefined ? undefined : this.pending.get(message.id);
        if (!waiting || message.id === undefined) return;
        this.pending.delete(message.id);
        clearTimeout(waiting.timer);
        if (message.error) waiting.fail(new Error("Codex auth request failed"));
        else waiting.done(message.result);
      } catch {
        // Codex logs non-JSON lines on stdout at times; they carry no reply.
      }
    });
    const stopped = () => {
      this.process = undefined;
      for (const waiting of this.pending.values()) {
        clearTimeout(waiting.timer);
        waiting.fail(new Error("Codex auth helper stopped"));
      }
      this.pending.clear();
    };
    child.on("error", stopped);
    child.on("close", stopped);
    await this.call("initialize", {
      clientInfo: { name: "clyde_gateway", title: "Clyde Gateway", version: "0.1.0" },
    });
    child.stdin.write(`${JSON.stringify({ method: "initialized", params: {} })}\n`);
  }

  private call(method: string, params: unknown) {
    return new Promise<unknown>((done, fail) => {
      const id = ++this.sequence;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        fail(new Error("Codex auth helper timed out"));
      }, 20_000);
      this.pending.set(id, { done, fail, timer });
      this.process?.stdin.write(`${JSON.stringify({ id, method, params })}\n`);
    });
  }

  private async readAuth(): Promise<CodexAuthFile> {
    const raw = await NodeFSP.readFile(NodePath.join(this.codexHome, "auth.json"), "utf8");
    return JSON.parse(raw) as CodexAuthFile;
  }

  /** The headers that authenticate one request to the ChatGPT Codex backend. */
  headers(force = false): Promise<Record<string, string>> {
    const run = this.queue.then(async () => {
      await this.start();
      let auth = await this.readAuth();
      if (
        auth.auth_mode !== "chatgpt" ||
        !auth.tokens?.access_token ||
        !auth.tokens.refresh_token
      ) {
        throw new Error("A ChatGPT login is required");
      }
      const age = Date.now() - Date.parse(auth.last_refresh ?? "");
      if (
        force ||
        tokenExpiry(auth.tokens.access_token) < Date.now() + REFRESH_MARGIN_MS ||
        !(age < MAX_TOKEN_AGE_MS)
      ) {
        await this.call("account/read", { refreshToken: true });
        auth = await this.readAuth();
      }
      const accessToken = auth.tokens?.access_token;
      const accountId = auth.tokens?.account_id;
      if (!accessToken || !accountId) throw new Error("The ChatGPT login has no account");
      return { Authorization: `Bearer ${accessToken}`, "ChatGPT-Account-ID": accountId };
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  close() {
    this.process?.kill("SIGTERM");
  }
}
