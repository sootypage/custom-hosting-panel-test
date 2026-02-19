"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { requireAdmin } from "../../_lib/auth";

export default function NewServerBlocked() {
  const router = useRouter();
  useEffect(() => { requireAdmin(router.push); }, [router]);
  return <div className="p-6 text-sm text-zinc-300">Redirecting...</div>;
}
