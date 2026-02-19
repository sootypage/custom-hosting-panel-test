const Fastify = require("fastify");
const websocket = require("fastify-websocket");
const cors = require("@fastify/cors");
const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");

const app = Fastify({ logger: true });
app.register(websocket);
app.register(cors, { origin: true });

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

function id8() {
  return Math.random().toString(16).slice(2, 10);
}

function requireAuth(req, reply) {
  const h = req.headers.authorization || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!t) return reply.code(401).send({ error: "no token" });
  try { req.user = jwt.verify(t, JWT_SECRET); }
  catch { return reply.code(401).send({ error: "bad token" }); }
}

function requireAdmin(req, reply) {
  requireAuth(req, reply);
  if (!req.user || req.user.role !== "admin") {
    return reply.code(403).send({ error: "admin only" });
  }
}

// --- Stores (MVP: in-memory) ---
const nodes = new Map();   // nodeId -> { url, token, lastSeen }
const servers = new Map(); // serverId -> { ... , owner }
const users = new Map();   // username -> { username, password, role }

// seed default admin
users.set("admin", { username: "admin", password: "admin", role: "admin" });

// --- Auth ---
app.post("/auth/login", async (req, reply) => {
  const { username, password } = req.body || {};
  const u = users.get(username);
  if (!u || u.password !== password) {
    return reply.code(401).send({ error: "bad login" });
  }
  const token = jwt.sign(
    { userId: username, role: u.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
  return { token, role: u.role };
});

// --- Public health ---
app.get("/health", async () => ({ ok: true }));

// --- Nodes (auth) ---
app.get("/nodes", async (req, reply) => {
  requireAuth(req, reply);
  return { nodes: [...nodes.entries()].map(([id, v]) => ({ id, url: v.url })) };
});

// --- Servers (user sees only assigned) ---
app.get("/servers", async (req, reply) => {
  requireAuth(req, reply);

  const all = [...servers.values()];
  if (req.user.role === "admin") return { servers: all };

  const mine = all.filter(s => s.owner === req.user.userId);
  return { servers: mine };
});

app.get("/servers/:id", async (req, reply) => {
  requireAuth(req, reply);

  const s = servers.get(req.params.id);
  if (!s) return reply.code(404).send({ error: "not found" });

  if (req.user.role !== "admin" && s.owner !== req.user.userId) {
    return reply.code(403).send({ error: "forbidden" });
  }
  return { server: s };
});

// Server creation is ADMIN ONLY now
app.post("/servers", async (req, reply) => {
  requireAdmin(req, reply);

  const { name, nodeId, game, memoryMb, cpu, port, owner } = req.body || {};
  if (!name || !nodeId || !game) return reply.code(400).send({ error: "missing fields" });
  if (!nodes.has(nodeId)) return reply.code(400).send({ error: "unknown node" });

  const id = id8();
  const rec = {
    id,
    name,
    nodeId,
    game,
    memoryMb: Number(memoryMb || 2048),
    cpu: Number(cpu || 1),
    port: Number(port || 25565),
    owner: owner || null,
    containerId: null,
    createdAt: new Date().toISOString()
  };

  try {
    const node = nodes.get(nodeId);
    const prov = await fetch(`${node.url}/provision`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-node-token": node.token },
      body: JSON.stringify({ id, name, game, port: rec.port, memoryMb: rec.memoryMb, cpu: rec.cpu }),
    });
    const pdata = await prov.json().catch(() => ({}));
    if (!prov.ok) return reply.code(500).send({ error: "node provision failed", detail: pdata });
    rec.containerId = pdata.containerId || null;
  } catch (e) {
    return reply.code(500).send({ error: "node provision error", detail: String(e?.message || e) });
  }

  servers.set(id, rec);
  return { server: rec };
});

// --- Admin: Users ---
app.get("/admin/users", async (req, reply) => {
  requireAdmin(req, reply);
  return {
    users: [...users.values()].map(u => ({ username: u.username, role: u.role }))
  };
});

app.post("/admin/users", async (req, reply) => {
  requireAdmin(req, reply);
  const { username, password, role } = req.body || {};
  if (!username || !password) return reply.code(400).send({ error: "missing" });
  if (users.has(username)) return reply.code(400).send({ error: "user exists" });
  users.set(username, { username, password, role: role || "user" });
  return { ok: true };
});

app.put("/admin/users/:username", async (req, reply) => {
  requireAdmin(req, reply);
  const { username } = req.params;
  const u = users.get(username);
  if (!u) return reply.code(404).send({ error: "not found" });

  const { password, role } = req.body || {};
  if (typeof password === "string" && password.length > 0) u.password = password;
  if (typeof role === "string" && role.length > 0) u.role = role;

  users.set(username, u);
  return { ok: true };
});

app.delete("/admin/users/:username", async (req, reply) => {
  requireAdmin(req, reply);
  const { username } = req.params;
  if (username === "admin") return reply.code(400).send({ error: "can't delete admin" });
  users.delete(username);
  return { ok: true };
});

// --- Admin: Nodes ---
app.get("/admin/nodes", async (req, reply) => {
  requireAdmin(req, reply);
  return { nodes: [...nodes.entries()].map(([id, v]) => ({ id, url: v.url, token: v.token })) };
});

app.post("/admin/nodes", async (req, reply) => {
  requireAdmin(req, reply);
  const { nodeId, url, token } = req.body || {};
  if (!nodeId || !url || !token) return reply.code(400).send({ error: "missing" });
  nodes.set(nodeId, { url, token, lastSeen: new Date().toISOString() });
  return { ok: true };
});

app.put("/admin/nodes/:nodeId", async (req, reply) => {
  requireAdmin(req, reply);
  const { nodeId } = req.params;
  const cur = nodes.get(nodeId);
  if (!cur) return reply.code(404).send({ error: "not found" });

  const { url, token } = req.body || {};
  if (typeof url === "string" && url.length > 0) cur.url = url;
  if (typeof token === "string" && token.length > 0) cur.token = token;

  nodes.set(nodeId, cur);
  return { ok: true };
});

app.delete("/admin/nodes/:nodeId", async (req, reply) => {
  requireAdmin(req, reply);
  nodes.delete(req.params.nodeId);
  return { ok: true };
});

// --- Admin: Servers ---
app.get("/admin/servers", async (req, reply) => {
  requireAdmin(req, reply);
  return { servers: [...servers.values()] };
});

app.put("/admin/servers/:id/assign", async (req, reply) => {
  requireAdmin(req, reply);
  const s = servers.get(req.params.id);
  if (!s) return reply.code(404).send({ error: "not found" });

  const { owner } = req.body || {};
  if (!owner) return reply.code(400).send({ error: "missing owner" });
  if (!users.has(owner)) return reply.code(400).send({ error: "unknown user" });

  s.owner = owner;
  servers.set(s.id, s);
  return { ok: true, server: s };
});


// --- Server actions (owner or admin) ---
function canAccessServer(req, s) {
  if (req.user.role === "admin") return true;
  return s.owner === req.user.userId;
}

app.get("/servers/:id/status", async (req, reply) => {
  requireAuth(req, reply);

  const s = servers.get(req.params.id);
  if (!s) return reply.code(404).send({ error: "not found" });
  if (!canAccessServer(req, s)) return reply.code(403).send({ error: "forbidden" });

  try {
    const node = nodes.get(s.nodeId);
    const res = await fetch(`${node.url}/servers/${s.id}/status`, { headers: { "x-node-token": node.token } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return reply.code(500).send({ error: "node status failed", detail: data });
    return data;
  } catch (e) {
    return reply.code(500).send({ error: "status error", detail: String(e?.message || e) });
  }
});

async function serverAction(req, reply, action) {
  requireAuth(req, reply);

  const s = servers.get(req.params.id);
  if (!s) return reply.code(404).send({ error: "not found" });
  if (!canAccessServer(req, s)) return reply.code(403).send({ error: "forbidden" });

  try {
    const node = nodes.get(s.nodeId);
    const res = await fetch(`${node.url}/servers/${s.id}/${action}`, { method: "POST", headers: { "x-node-token": node.token } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return reply.code(500).send({ error: "node action failed", detail: data });
    return { ok: true };
  } catch (e) {
    return reply.code(500).send({ error: "action error", detail: String(e?.message || e) });
  }
}

app.post("/servers/:id/start", (req, reply) => serverAction(req, reply, "start"));
app.post("/servers/:id/stop", (req, reply) => serverAction(req, reply, "stop"));
app.post("/servers/:id/restart", (req, reply) => serverAction(req, reply, "restart"));

app.listen({ port: 4000, host: "0.0.0.0" });
