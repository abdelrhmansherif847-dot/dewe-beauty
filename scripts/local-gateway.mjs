// Minimal stand-in for Supabase's API gateway, for local end-to-end tests only.
// Routes /rest/v1/* to PostgREST and /auth/v1/* to Supabase Auth, and mints the
// local anon key when called with `--sign anon <secret>`.
import { createHmac } from "node:crypto";
import http from "node:http";

if (process.argv[2] === "--sign") {
  const [, , , role, secret] = process.argv;
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const header = b64({ alg: "HS256", typ: "JWT" });
  const payload = b64({ role, iss: "supabase-local", iat: 1700000000, exp: 2000000000 });
  const sig = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  process.stdout.write(`${header}.${payload}.${sig}`);
  process.exit(0);
}

const routes = [
  { prefix: "/rest/v1", port: 3001 },
  { prefix: "/auth/v1", port: 9999 },
];

const server = http.createServer((req, res) => {
  const route = routes.find((r) => req.url === r.prefix || req.url.startsWith(`${r.prefix}/`) || req.url.startsWith(`${r.prefix}?`));
  if (!route) {
    res.writeHead(404).end();
    return;
  }
  const upstream = http.request(
    {
      host: "127.0.0.1",
      port: route.port,
      method: req.method,
      path: req.url.slice(route.prefix.length) || "/",
      headers: { ...req.headers, host: `127.0.0.1:${route.port}` },
    },
    (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers);
      up.pipe(res);
    },
  );
  upstream.on("error", () => res.writeHead(502).end());
  req.pipe(upstream);
});

server.listen(54321, "127.0.0.1");
