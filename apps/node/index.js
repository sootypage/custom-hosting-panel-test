const Fastify = require("fastify");
const Docker = require("dockerode");
const fs = require("fs");
const path = require("path");

const app = Fastify({ logger: true });

const NODE_TOKEN = process.env.NODE_TOKEN || "node_secret";
const DATA_DIR = process.env.DATA_DIR || "/data";
const STATE_FILE = path.join(DATA_DIR, "servers.json");

const docker = new Docker({ socketPath: "/var/run/docker.sock" });

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
ensureDir(DATA_DIR);

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); }
  catch { return { servers: {} }; }
}
function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function auth(req, reply) {
  const t = req.headers["x-node-token"];
  if (!t || t !== NODE_TOKEN) return reply.code(401).send({ error: "bad node token" });
}

app.get("/health", async () => ({ ok: true }));

app.get("/servers/:id/status", async (req, reply) => {
  auth(req, reply); if (reply.sent) return;
  const st = loadState();
  const rec = st.servers[req.params.id];
  if (!rec) return reply.code(404).send({ error: "not found" });

  try {
    const c = docker.getContainer(rec.containerId);
    const info = await c.inspect();
    return { id: req.params.id, containerId: rec.containerId, status: info.State?.Status || "unknown" };
  } catch (e) {
    return reply.code(500).send({ error: "inspect failed", detail: String(e?.message || e) });
  }
});

async function createOrGetContainer(spec) {
  try {
    const existing = docker.getContainer(spec.name);
    await existing.inspect();
    return existing;
  } catch {}
  return docker.createContainer(spec);
}

function mergeSpecs(base, add) {
  base.ExposedPorts = Object.assign({}, base.ExposedPorts || {}, add.ExposedPorts || {});
  base.HostConfig = base.HostConfig || {};
  base.HostConfig.PortBindings = Object.assign({}, base.HostConfig.PortBindings || {}, (add.HostConfig && add.HostConfig.PortBindings) || {});
  base.HostConfig.Binds = (base.HostConfig.Binds || []).concat((add.HostConfig && add.HostConfig.Binds) || []);
  base.HostConfig.RestartPolicy = base.HostConfig.RestartPolicy || { Name: "unless-stopped" };
  return base;
}

function bindTcp(hostPort, containerPort) {
  return {
    ExposedPorts: { [`${containerPort}/tcp`]: {} },
    HostConfig: { PortBindings: { [`${containerPort}/tcp`]: [{ HostPort: String(hostPort) }] } }
  };
}

app.post("/provision", async (req, reply) => {
  auth(req, reply); if (reply.sent) return;

  const { id, name, game, port, memoryMb, cpu } = req.body || {};
  if (!id || !game) return reply.code(400).send({ error: "missing id/game" });

  const st = loadState();
  if (st.servers[id]) return { ok: true, containerId: st.servers[id].containerId, already: true };

  const safeName = `panel-${id}`;
  const basePort = Number(port || 25565);
  const memBytes = Number(memoryMb || 0) > 0 ? Math.floor(Number(memoryMb) * 1024 * 1024) : undefined;
  const cpuShares = Number(cpu || 0) > 0 ? Math.floor(Number(cpu) * 1024) : undefined;

  let spec = {
    name: safeName,
    Image: "",
    Env: [],
    HostConfig: {
      RestartPolicy: { Name: "unless-stopped" },
      Binds: [],
    },
  };

  if (["paper","forge","fabric","neoforge"].includes(game)) {
    spec.Image = "itzg/minecraft-server:latest";
    const typeMap = { paper: "PAPER", forge: "FORGE", fabric: "FABRIC", neoforge: "NEOFORGE" };
    spec.Env = ["EULA=TRUE", `TYPE=${typeMap[game]}`, "ONLINE_MODE=TRUE"];
    const vol = path.join(DATA_DIR, "minecraft", id);
    ensureDir(vol);
    spec.HostConfig.Binds.push(`${vol}:/data`);
    spec = mergeSpecs(spec, bindTcp(basePort, 25565));
  } else if (game === "rust") {
    spec.Image = "didstopia/rust-server:latest";
    spec.Env = ["RUST_SERVER_NAME=Panel Rust Server", "RUST_SERVER_PORT=28015", "RUST_RCON_PORT=28016"];
    const vol = path.join(DATA_DIR, "rust", id);
    ensureDir(vol);
    spec.HostConfig.Binds.push(`${vol}:/steamcmd/rust-dedicated`);
    spec.ExposedPorts = { "28015/tcp": {}, "28015/udp": {}, "28016/tcp": {} };
    spec.HostConfig.PortBindings = {
      "28015/tcp": [{ HostPort: String(basePort) }],
      "28015/udp": [{ HostPort: String(basePort) }],
      "28016/tcp": [{ HostPort: String(basePort + 1) }],
    };
  } else if (game === "satisfactory") {
    spec.Image = "wolveix/satisfactory-server:latest";
    spec.Env = [];
    const vol = path.join(DATA_DIR, "satisfactory", id);
    ensureDir(vol);
    spec.HostConfig.Binds.push(`${vol}:/config`);
    spec.ExposedPorts = { "7777/udp": {}, "15000/udp": {}, "15777/udp": {} };
    spec.HostConfig.PortBindings = {
      "7777/udp": [{ HostPort: String(basePort) }],
      "15000/udp": [{ HostPort: String(basePort + 1) }],
      "15777/udp": [{ HostPort: String(basePort + 2) }],
    };
  } else {
    return reply.code(400).send({ error: `unsupported game: ${game}` });
  }

  if (memBytes) spec.HostConfig.Memory = memBytes;
  if (cpuShares) spec.HostConfig.CpuShares = cpuShares;

  try {
    await new Promise((resolve, reject) => {
      docker.pull(spec.Image, (err, stream) => {
        if (err) return reject(err);
        docker.modem.followProgress(stream, (err2) => (err2 ? reject(err2) : resolve()));
      });
    }).catch(() => {});

    const container = await createOrGetContainer(spec);
    await container.start();

    st.servers[id] = { id, name: name || safeName, game, port: basePort, containerId: container.id, createdAt: new Date().toISOString() };
    saveState(st);

    return { ok: true, containerId: container.id };
  } catch (e) {
    return reply.code(500).send({ error: "provision failed", detail: String(e?.message || e) });
  }
});

async function act(req, reply, action) {
  auth(req, reply); if (reply.sent) return;
  const st = loadState();
  const rec = st.servers[req.params.id];
  if (!rec) return reply.code(404).send({ error: "not found" });

  try {
    const c = docker.getContainer(rec.containerId);
    if (action === "start") await c.start();
    if (action === "stop") await c.stop({ t: 10 });
    if (action === "restart") await c.restart({ t: 10 });
    return { ok: true };
  } catch (e) {
    return reply.code(500).send({ error: `${action} failed`, detail: String(e?.message || e) });
  }
}

app.post("/servers/:id/start", (req, reply) => act(req, reply, "start"));
app.post("/servers/:id/stop", (req, reply) => act(req, reply, "stop"));
app.post("/servers/:id/restart", (req, reply) => act(req, reply, "restart"));

app.listen({ port: 5000, host: "0.0.0.0" });
