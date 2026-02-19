const Fastify = require("fastify");
const Docker = require("dockerode");
const fetch = require("node-fetch");

const app = Fastify({ logger: true });
const docker = new Docker({ socketPath: "/var/run/docker.sock" });

const NODE_ID = process.env.NODE_ID || "node-1";
const NODE_TOKEN = process.env.NODE_TOKEN || "change_me";
const PANEL_URL = process.env.PANEL_URL || "http://PANEL_IP";
const PUBLIC_DAEMON_URL = process.env.PUBLIC_DAEMON_URL || "http://NODE_IP:8443";

function auth(req, reply) {
  const t = req.headers["x-node-token"];
  if (t !== NODE_TOKEN) return reply.code(401).send({ error: "bad token" });
}

// Register to panel on boot
async function register() {
  try {
    const res = await fetch(`${PANEL_URL}/api/nodes/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nodeId: NODE_ID, url: PUBLIC_DAEMON_URL, token: NODE_TOKEN })
    });
    const data = await res.json();
    app.log.info({ data }, "registered with panel");
  } catch (e) {
    app.log.error(e, "register failed");
  }
}

app.get("/health", async () => ({ ok: true, nodeId: NODE_ID }));

/**
 * MVP demo: start a Minecraft Paper container using itzg/minecraft-server.
 * This is a placeholder for the real Template/Egg system.
 *
 * Container naming convention: srv-<id>
 */
app.post("/servers/:id/start", async (req, reply) => {
  auth(req, reply);
  const id = req.params.id;
  const containerName = `srv-${id}`;

  const containers = await docker.listContainers({ all: true });
  const existing = containers.find(c => (c.Names || []).includes("/" + containerName));

  if (!existing) {
    const container = await docker.createContainer({
      name: containerName,
      Image: "itzg/minecraft-server",
      Env: [
        "EULA=TRUE",
        "TYPE=PAPER",
        "MEMORY=2G"
      ],
      ExposedPorts: { "25565/tcp": {} },
      HostConfig: {
        Memory: 2147483648,
        NanoCpus: 1000000000, // 1 CPU
        PortBindings: { "25565/tcp": [{ HostPort: "25565" }] }
      }
    });
    await container.start();
    return { ok: true, created: true };
  }

  const container = docker.getContainer(existing.Id);
  await container.start();
  return { ok: true, created: false };
});

app.post("/servers/:id/stop", async (req, reply) => {
  auth(req, reply);
  const container = docker.getContainer(`srv-${req.params.id}`);
  await container.stop({ t: 10 });
  return { ok: true };
});

app.post("/servers/:id/restart", async (req, reply) => {
  auth(req, reply);
  const container = docker.getContainer(`srv-${req.params.id}`);
  await container.restart({ t: 10 });
  return { ok: true };
});

app.listen({ port: 8443, host: "0.0.0.0" })
  .then(register)
  .catch((e) => {
    app.log.error(e);
    process.exit(1);
  });
