"use client";

import Link from "next/link";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { Dashboard } from "./components/Dashboard";

export default function Home() {
  const account = useCurrentAccount();

  return (
    <div className="page-enter mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Container manifest
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Verifiable document custody for global trade.
          </p>
        </div>
        {account && (
          <Link
            href="/mint"
            className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
          >
            + New container
          </Link>
        )}
      </div>

      <Dashboard />
    </div>
  );
}