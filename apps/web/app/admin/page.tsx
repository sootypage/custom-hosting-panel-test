"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { requireAdmin } from "../_lib/auth";

export default function AdminHome() {
  const router = useRouter();
  useEffect(() => { requireAdmin(router.push); }, [router]);

  return (
    <div className="p-6 grid gap-4">
      <h1 className="text-xl font-semibold">Admin</h1>
      <div className="flex flex-wrap gap-3 text-sm">
        <Link className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-2 hover:bg-zinc-950" href="/admin/nodes">Nodes</Link>
        <Link className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-2 hover:bg-zinc-950" href="/admin/users">Users</Link>
        <Link className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-2 hover:bg-zinc-950" href="/admin/servers">Servers</Link>
        <Link className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-2 hover:bg-zinc-950" href="/servers">Back to Dashboard</Link>
      </div>
    </div>
  );
}
