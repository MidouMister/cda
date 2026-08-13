const AGENTROUTER_HOST = "agentrouter.org";

const INJECTED_HEADERS = {
  "User-Agent": "claude-cli/1.0.108 (external, cli)",
  "anthropic-version": "2023-06-01",
  "anthropic-beta": "claude-code-20250219,oauth-2025-04-20",
  "anthropic-dangerous-direct-browser-access": "true",
  "x-app": "cli",
  "x-stainless-lang": "js",
  "x-stainless-package-version": "0.55.1",
  "x-stainless-os": "Windows",
  "x-stainless-arch": "x64",
  "x-stainless-runtime": "node",
  "x-stainless-runtime-version": "v22.0.0",
};

function isAgentRouterUrl(url) {
  try {
    const p = typeof url === "string" ? new URL(url) : new URL(url.url ?? url.href ?? String(url));
    return p.hostname.endsWith(AGENTROUTER_HOST);
  } catch {
    return false;
  }
}

function sanitizeSseBody(body) {
  if (!body) return body;
  const dec = new TextDecoder();
  const enc = new TextEncoder();
  let carry = "";
  const t = new TransformStream({
    transform(chunk, controller) {
      const text = carry + dec.decode(chunk, { stream: true });
      const nl = text.lastIndexOf("\n");
      if (nl === -1) {
        carry = text;
        return;
      }
      const complete = text.slice(0, nl + 1);
      carry = text.slice(nl + 1);
      const filtered = complete
        .split("\n")
        .filter((l) => l.trim() !== "data: null" && l.trim() !== "data:null")
        .join("\n");
      if (filtered.length) controller.enqueue(enc.encode(filtered));
    },
    flush(controller) {
      if (carry.trim() !== "data: null" && carry.trim() !== "data:null" && carry.length) {
        controller.enqueue(enc.encode(carry));
      }
    },
  });
  return body.pipeThrough(t);
}

function patchFetchOnce() {
  if (globalThis.__agentrouter_fetch_patched__) return;
  globalThis.__agentrouter_fetch_patched__ = true;
  const orig = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async function (input, init) {
    try {
      const url = typeof input === "string" || input instanceof URL ? input : input?.url;
      if (url && isAgentRouterUrl(url)) {
        const headers = new Headers(init?.headers ?? (input && input.headers) ?? undefined);
        for (const [k, v] of Object.entries(INJECTED_HEADERS)) headers.set(k, v);
        const newInit = { ...(init ?? {}), headers };
        const res = input instanceof Request ? await orig(new Request(input, newInit)) : await orig(input, newInit);
        const ct = res.headers.get("content-type") ?? "";
        if (res.ok && ct.includes("text/event-stream") && res.body) {
          return new Response(sanitizeSseBody(res.body), {
            status: res.status,
            statusText: res.statusText,
            headers: res.headers,
          });
        }
        return res;
      }
    } catch {}
    return orig(input, init);
  };
}

export const AgentRouterHeadersPlugin = async ({ client }) => {
  patchFetchOnce();
  try {
    await client.app.log({
      body: { service: "agentrouter-headers", level: "info", message: "fetch patched for agentrouter.org" },
    });
  } catch {}
  return {};
};
