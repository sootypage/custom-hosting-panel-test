"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getToken, getRole } from "../_lib/auth";

type ServerRow = { id: string; name: string; game: string; port: number; owner?: string | null };

export default function ServersPage() {
  const [servers, setServers] = useState<ServerRow[]>([]);
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const api = process.env.NEXT_PUBLIC_API_URL || "/api";
  const role = getRole();

  async function load() {
    const token = getToken();
    if (!token) return router.push("/login");

    const res = await fetch(`${api}/servers`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg(data?.error || "Failed to load servers");
    setServers(data.servers || []);
    setMsg("");
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        {role === "admin" && (
          <Link href="/admin" className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-2 text-sm hover:bg-zinc-950">
            Admin
          </Link>
        )}
      </div>

      <p className="mt-2 text-sm text-zinc-400">
        {role === "admin"
          ? "Admin view: manage nodes/users and create/assign servers."
          : "Your assigned servers will show up here."}
      </p>

      <div className="mt-5 rounded-2xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950/50 text-zinc-400">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Game</th>
              <th className="px-4 py-3 text-left">Port</th>
            </tr>
          </thead>
          <tbody>
            {servers.map((s) => (
              <tr key={s.id} className="border-t border-zinc-800">
                <td className="px-4 py-3">
                  <Link href={`/servers/${s.id}`} className="underline underline-offset-2">
                    {s.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{s.game}</td>
                <td className="px-4 py-3">{s.port}</td>
              </tr>
            ))}
            {servers.length === 0 && (
              <tr className="border-t border-zinc-800">
                <td className="px-4 py-8 text-center text-zinc-500" colSpan={3}>
                  No servers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {msg && <div className="mt-4 text-sm text-zinc-300">{msg}</div>}
    </div>
  );
}
