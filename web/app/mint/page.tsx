"use client";

import { MintContainerForm } from "../components/MintContainerForm";

export default function MintPage() {
  return (
    <div className="page-enter mx-auto max-w-xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Mint a container</h1>
      <p className="mt-1 mb-8 text-sm text-neutral-400">
        Create a digital twin of a shipping container. You'll own it on-chain
        until you transfer it to a carrier.
      </p>

      <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-6">
        <MintContainerForm />
      </div>
    </div>
  );
}