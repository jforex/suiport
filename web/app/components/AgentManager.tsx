"use client";

import { useState } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { RegistryInfo } from "../lib/useRegistry";
import { shortAddr } from "../lib/format";

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID!;

export function AgentManager({
  registry,
  onChanged,
}: {
  registry: RegistryInfo;
  onChanged: () => void;
}) {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [agentAddr, setAgentAddr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = !!account && account.address === registry.admin;
  const myEntry = registry.members.find(
    (m) => m.addr === account?.address,
  );
  const iAmActiveAgent = !!myEntry && myEntry.active && !isAdmin;

  function run(
    label: string,
    build: (tx: Transaction) => void,
    onErr?: (m: string) => void,
  ) {
    setError(null);
    setBusy(label);
    const tx = new Transaction();
    build(tx);
    signAndExecute(
      { transaction: tx },
      {
        onSuccess: async ({ digest }) => {
          await suiClient.waitForTransaction({ digest });
          setBusy(null);
          setTimeout(onChanged, 1200);
        },
        onError: (err) => {
          setBusy(null);
          (onErr ?? setError)(err.message);
        },
      },
    );
  }

  function handleEngage() {
    const addr = agentAddr.trim();
    if (!addr.startsWith("0x") || addr.length < 10) {
      setError("Enter a valid Sui address (0x…).");
      return;
    }
    run("engage", (tx) => {
      tx.moveCall({
        target: `${PACKAGE_ID}::access::engage_agent`,
        arguments: [tx.object(registry.registryId), tx.pure.address(addr)],
      });
    });
    setAgentAddr("");
  }

  function handleComplete() {
    run("complete", (tx) => {
      tx.moveCall({
        target: `${PACKAGE_ID}::access::complete_task`,
        arguments: [tx.object(registry.registryId)],
      });
    });
  }

  function handleCancel() {
    run("cancel", (tx) => {
      tx.moveCall({
        target: `${PACKAGE_ID}::access::cancel_engagement`,
        arguments: [tx.object(registry.registryId)],
      });
    });
  }

  return (
    <div className="space-y-5">
      {/* Active members list */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
          Who can decrypt ({registry.activeMembers.length})
        </p>
        <ul className="space-y-1.5">
          {registry.members
            .filter((m) => m.active)
            .map((m) => (
              <li
                key={m.addr}
                className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs"
              >
                <span className="font-mono text-neutral-300">
                  {shortAddr(m.addr)}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-neutral-500">
                  {m.addr === registry.admin ? "Shipper" : "Agent"}
                </span>
              </li>
            ))}
        </ul>
      </div>

      {/* Admin: engage an agent */}
      {isAdmin && (
        <div className="space-y-2 border-t border-neutral-800 pt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Engage a C&amp;F agent
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={agentAddr}
              onChange={(e) => setAgentAddr(e.target.value)}
              placeholder="0x… agent address"
              className="flex-1 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-mono placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-600"
            />
            <button
              onClick={handleEngage}
              disabled={busy === "engage" || !agentAddr}
              className="rounded-md bg-amber-500 px-3 py-2 text-xs font-medium text-black transition hover:bg-amber-400 disabled:opacity-40"
            >
              {busy === "engage" ? "Engaging…" : "Engage"}
            </button>
          </div>
          <p className="text-[11px] text-neutral-600">
            The agent can decrypt this container&apos;s documents until they
            complete or cancel. You cannot revoke them mid-task.
          </p>
        </div>
      )}

      {/* Agent: complete or cancel own engagement */}
      {iAmActiveAgent && (
        <div className="space-y-2 border-t border-neutral-800 pt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Your engagement
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleComplete}
              disabled={!!busy}
              className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:opacity-40"
            >
              {busy === "complete" ? "…" : "Mark cleared"}
            </button>
            <button
              onClick={handleCancel}
              disabled={!!busy}
              className="rounded-md bg-neutral-800 px-3 py-2 text-xs text-neutral-200 transition hover:bg-neutral-700 disabled:opacity-40"
            >
              {busy === "cancel" ? "…" : "Withdraw"}
            </button>
          </div>
          <p className="text-[11px] text-neutral-600">
            Ending your engagement removes your future decrypt access.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-900/60 bg-red-950/40 p-2.5 text-[11px] text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}