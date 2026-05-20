"use client";

import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { MintContainerForm } from "./components/MintContainerForm";

export default function Home() {
  const account = useCurrentAccount();

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <header className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">SuiPort</h1>
            <p className="text-sm text-neutral-400 mt-1">
              Verifiable document custody for global trade
            </p>
          </div>
          <ConnectButton />
        </header>

        {account && (
          <div className="mb-6 text-xs text-neutral-500 font-mono">
            {account.address.slice(0, 10)}…{account.address.slice(-6)} · testnet
          </div>
        )}

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-8">
          <h2 className="text-lg font-medium mb-1">Mint a container</h2>
          <p className="text-sm text-neutral-400 mb-6">
            Create a digital twin of a shipping container. You'll own it on-chain
            until you transfer it to a carrier.
          </p>
          <MintContainerForm />
        </section>
      </div>
    </main>
  );
}