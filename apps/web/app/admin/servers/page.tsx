"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getToken, requireAdmin } from "../../_lib/auth";

type NodeRow = { id: string; url: string };
type UserRow = { username: string; role: string };
type ServerRow = { id: string; name: string; game: string; port: number; nodeId: string; owner?: string | null; memoryMb?: number; cpu?: number };

export default function AdminServers() {
  const api = process.env.NEXT_PUBLIC_API_URL || "/api";
  const router = useRouter();

  const [nodes, setNodes] = useState<NodeRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [servers, setServers] = useState<ServerRow[]>([]);
  const [msg, setMsg] = useState("");

  const [name, setName] = useState("My Paper Server");
  const [nodeId, setNodeId] = useState("");
  const [game, setGame] = useState("paper");
  const [port, setPort] = useState(25565);
  const [memoryMb, setMemoryMb] = useState(2048);
  const [cpu, setCpu] = useState(1);

  async function authed(path: string, init?: RequestInit) {
    const t = getToken();
    const res = await fetch(`${api}${path}`, {
      ...(init || {}),
      headers: { ...(init?.headers || {}), Authorization: `Bearer ${t}`, "content-type": "application/json" },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Request failed");
    return data;
  }

  async function loadAll() {
    setMsg("Loading...");
    try {
      const [n, u, s] = await Promise.all([authed("/admin/nodes"), authed("/admin/users"), authed("/admin/servers")]);
      setNodes(n.nodes || []);
      setUsers(u.users || []);
      setServers(s.servers || []);
      if (!nodeId && (n.nodes || [])[0]) setNodeId(n.nodes[0].id);
      setMsg("");
    } catch (e: any) { setMsg(e.message || "Error"); }
  }

  async function createServer() {
    setMsg("Creating...");
    try {
      const data = await authed("/servers", { method: "POST", body: JSON.stringify({ name, nodeId, game, port, memoryMb, cpu }) });
      setMsg("✅ Created");
      await loadAll();
      router.push(`/servers/${data.server.id}`);
    } catch (e: any) { setMsg(e.message || "Error"); }
  }

  async function assign(serverId: string, owner: string) {
    setMsg("Assigning...");
    try {
      await authed(`/admin/servers/${serverId}/assign`, { method: "PUT", body: JSON.stringify({ owner }) });
      await loadAll();
      setMsg("✅ Assigned");
    } catch (e: any) { setMsg(e.message || "Error"); }
  }

  const userOptions = useMemo(() => users.filter(u => u.role !== "admin"), [users]);

  useEffect(() => { requireAdmin(router.push); loadAll(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="p-6 grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admin • Servers</h1>
        <Link href="/admin" className="text-sm underline underline-offset-2">Back</Link>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 grid gap-3 text-sm">
        <div className="font-medium">Create Server (admin)</div>

        <div className="grid gap-2">
          <span className="text-zinc-400">Name</span>
          <input className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3" value={name} onChange={e=>setName(e.target.value)} />
        </div>

        <div className="grid gap-2">
          <span className="text-zinc-400">Node</span>
          <select className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3" value={nodeId} onChange={e=>setNodeId(e.target.value)}>
            {nodes.map(n => <option key={n.id} value={n.id}>{n.id} ({n.url})</option>)}
          </select>
          {nodes.length === 0 && <div className="text-zinc-400">No nodes yet. Add one in Admin → Nodes.</div>}
        </div>

        <div className="grid gap-2">
          <span className="text-zinc-400">Game</span>
          <select className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3" value={game} onChange={e=>setGame(e.target.value)}>
            <option value="paper">Minecraft Paper</option>
            <option value="forge">Minecraft Forge (soon)</option>
            <option value="fabric">Minecraft Fabric (soon)</option>
            <option value="neoforge">Minecraft NeoForge (soon)</option>
            <option value="rust">Rust (soon)</option>
            <option value="satisfactory">Satisfactory (soon)</option>
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <label className="grid gap-2">
            <span className="text-zinc-400">Port</span>
            <input type="number" className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3" value={port} onChange={e=>setPort(Number(e.target.value))} />
          </label>
          <label className="grid gap-2">
            <span className="text-zinc-400">Memory (MB)</span>
            <input type="number" className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3" value={memoryMb} onChange={e=>setMemoryMb(Number(e.target.value))} />
          </label>
          <label className="grid gap-2">
            <span className="text-zinc-400">CPU</span>
            <input type="number" step="0.5" className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3" value={cpu} onChange={e=>setCpu(Number(e.target.value))} />
          </label>
        </div>

        <button disabled={!nodeId} onClick={createServer} className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 font-medium hover:bg-zinc-950 disabled:opacity-50">
          Create
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950/50 text-zinc-400">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Game</th>
              <th className="px-4 py-3 text-left">Node</th>
              <th className="px-4 py-3 text-left">Owner</th>
              <th className="px-4 py-3 text-left">Assign</th>
            </tr>
          </thead>
          <tbody>
            {servers.map((s) => (
              <tr key={s.id} className="border-t border-zinc-800">
                <td className="px-4 py-3"><Link className="underline underline-offset-2" href={`/servers/${s.id}`}>{s.name}</Link></td>
                <td className="px-4 py-3">{s.game}</td>
                <td className="px-4 py-3 font-mono text-xs">{s.nodeId}</td>
                <td className="px-4 py-3">{s.owner || <span className="text-zinc-500">unassigned</span>}</td>
                <td className="px-4 py-3">
                  <select className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2" defaultValue="" onChange={(e)=>{ const v=e.target.value; if(v) assign(s.id, v); }}>
                    <option value="">Assign to user...</option>
                    {userOptions.map((u) => (<option key={u.username} value={u.username}>{u.username}</option>))}
                  </select>
                </td>
              </tr>
            ))}
            {servers.length === 0 && (<tr className="border-t border-zinc-800"><td className="px-4 py-8 text-center text-zinc-500" colSpan={5}>No servers yet.</td></tr>)}
          </tbody>
        </table>
      </div>

      <button onClick={loadAll} className="w-fit rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-2 text-sm hover:bg-zinc-950">Refresh</button>

      {msg && <div className="text-sm text-zinc-300">{msg}</div>}
    </div>
  );
}
