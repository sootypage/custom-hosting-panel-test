"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getToken, requireAdmin } from "../../_lib/auth";

type NodeRow = { id: string; url: string; token?: string };

export default function AdminNodes() {
  const api = process.env.NEXT_PUBLIC_API_URL || "/api";
  const router = useRouter();
  const [nodes, setNodes] = useState<NodeRow[]>([]);
  const [msg, setMsg] = useState("");
  const [nodeId, setNodeId] = useState("node1");
  const [url, setUrl] = useState("http://node-daemon:5000");
  const [token, setToken] = useState("node_secret");

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

  async function load() {
    setMsg("Loading...");
    try {
      const data = await authed("/admin/nodes");
      setNodes(data.nodes || []);
      setMsg("");
    } catch (e: any) { setMsg(e.message || "Error"); }
  }

  async function addNode() {
    setMsg("Saving...");
    try {
      await authed("/admin/nodes", { method: "POST", body: JSON.stringify({ nodeId, url, token }) });
      await load();
      setMsg("✅ Saved");
    } catch (e: any) { setMsg(e.message || "Error"); }
  }

  async function del(id: string) {
    if (!confirm(`Delete node ${id}?`)) return;
    setMsg("Deleting...");
    try {
      await authed(`/admin/nodes/${id}`, { method: "DELETE" });
      await load();
      setMsg("✅ Deleted");
    } catch (e: any) { setMsg(e.message || "Error"); }
  }

  useEffect(() => { requireAdmin(router.push); load(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="p-6 grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admin • Nodes</h1>
        <Link href="/admin" className="text-sm underline underline-offset-2">Back</Link>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 grid gap-3 text-sm">
        <div className="font-medium">Add Node</div>
        <input className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3" value={nodeId} onChange={e=>setNodeId(e.target.value)} placeholder="node id" />
        <input className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3" value={url} onChange={e=>setUrl(e.target.value)} placeholder="http://host:port" />
        <input className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3" value={token} onChange={e=>setToken(e.target.value)} placeholder="node token" />
        <button onClick={addNode} className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 hover:bg-zinc-950">Save Node</button>
      </div>

      <div className="rounded-2xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950/50 text-zinc-400">
            <tr><th className="px-4 py-3 text-left">ID</th><th className="px-4 py-3 text-left">URL</th><th className="px-4 py-3 text-left">Actions</th></tr>
          </thead>
          <tbody>
            {nodes.map((n) => (
              <tr key={n.id} className="border-t border-zinc-800">
                <td className="px-4 py-3 font-mono text-xs">{n.id}</td>
                <td className="px-4 py-3">{n.url}</td>
                <td className="px-4 py-3"><button onClick={()=>del(n.id)} className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-1 hover:bg-zinc-950">Delete</button></td>
              </tr>
            ))}
            {nodes.length === 0 && (<tr className="border-t border-zinc-800"><td className="px-4 py-8 text-center text-zinc-500" colSpan={3}>No nodes yet.</td></tr>)}
          </tbody>
        </table>
      </div>

      {msg && <div className="text-sm text-zinc-300">{msg}</div>}
    </div>
  );
}
