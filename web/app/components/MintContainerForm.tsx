"use client";

import { useState } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID!;
const MODULE = "container";

type MintResult = {
  digest: string;
  containerObjectId: string | null;
};

export function MintContainerForm() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();

  const [containerId, setContainerId] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [weightKg, setWeightKg] = useState("");

  const [result, setResult] = useState<MintResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    !!account &&
    !isPending &&
    containerId.trim() !== "" &&
    origin.trim() !== "" &&
    destination.trim() !== "" &&
    weightKg.trim() !== "";

  function handleMint(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::${MODULE}::mint_to_sender`,
      arguments: [
        tx.pure.string(containerId.trim()),
        tx.pure.string(origin.trim()),
        tx.pure.string(destination.trim()),
        tx.pure.u64(BigInt(weightKg)),
      ],
    });

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: async ({ digest }) => {
          const txResult = await suiClient.waitForTransaction({
            digest,
            options: { showObjectChanges: true },
          });

          const created = txResult.objectChanges?.find(
            (change) =>
              change.type === "created" &&
              change.objectType.endsWith("::container::Container"),
          );

          setResult({
            digest,
            containerObjectId:
              created && "objectId" in created ? created.objectId : null,
          });

          setContainerId("");
          setOrigin("");
          setDestination("");
          setWeightKg("");
        },
        onError: (err) => {
          setError(err.message ?? "Transaction failed");
        },
      },
    );
  }

  if (!account) {
    return (
      <p className="text-sm text-neutral-400">
        Connect your wallet to mint a container.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleMint} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1.5">
            Container ID
          </label>
          <input
            type="text"
            value={containerId}
            onChange={(e) => setContainerId(e.target.value)}
            placeholder="MSKU1234567"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm font-mono placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-600"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Origin
            </label>
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="Lagos"
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Destination
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Rotterdam"
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1.5">
            Weight (kg)
          </label>
          <input
            type="number"
            min="1"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            placeholder="25000"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-600"
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-lg bg-white text-black font-medium text-sm py-2.5 hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {isPending ? "Minting…" : "Mint container"}
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/30 p-4 space-y-2">
          <p className="text-xs font-medium text-emerald-400">
            Container minted ✓
          </p>
          {result.containerObjectId && (
            <p className="text-xs text-neutral-300">
              Object:{" "}
              <a
                href={`https://suiscan.xyz/testnet/object/${result.containerObjectId}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono underline hover:text-white"
              >
                {result.containerObjectId.slice(0, 10)}…
                {result.containerObjectId.slice(-6)}
              </a>
            </p>
          )}
          <p className="text-xs text-neutral-300">
            Tx:{" "}
            <a
              href={`https://suiscan.xyz/testnet/tx/${result.digest}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono underline hover:text-white"
            >
              {result.digest.slice(0, 10)}…{result.digest.slice(-6)}
            </a>
          </p>
        </div>
      )}
    </div>
  );
}