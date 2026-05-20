"use client";

import { useState } from "react";
import {
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { uploadToWalrus, walrusBlobUrl } from "../lib/walrus";
import { useContainers } from "../lib/useContainers";
import { STATUS_LABELS } from "../lib/format";

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID!;

export function DocumentPanel() {
  const suiClient = useSuiClient();
  const { mutate: signAndExecute, isPending: isAttaching } =
    useSignAndExecuteTransaction();
  const { data: containers, isLoading, refetch } = useContainers();

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [blobId, setBlobId] = useState<string | null>(null);
  const [selectedContainer, setSelectedContainer] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [attached, setAttached] = useState(false);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    setBlobId(null);
    setAttached(false);
    try {
      const result = await uploadToWalrus(file, 5);
      setBlobId(result.blobId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }

  function handleAttach() {
    if (!blobId || !selectedContainer) return;
    setError(null);

    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::container::attach_document`,
      arguments: [tx.object(selectedContainer), tx.pure.string(blobId)],
    });

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: async ({ digest }) => {
          await suiClient.waitForTransaction({ digest });
          setAttached(true);
          setBlobId(null);
          setFile(null);
          setSelectedContainer("");
          refetch();
        },
        onError: (err) => {
          setError(err.message ?? "Attach failed");
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Upload */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-neutral-400">
          Step 1 — Upload document to Walrus
        </p>
        <input
          type="file"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setBlobId(null);
            setAttached(false);
          }}
          className="block w-full text-sm text-neutral-400 file:mr-4 file:rounded-lg file:border-0 file:bg-neutral-800 file:px-4 file:py-2 file:text-sm file:text-neutral-100 hover:file:bg-neutral-700"
        />
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="rounded-lg bg-neutral-100 text-black font-medium text-sm px-4 py-2 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {uploading ? "Uploading…" : "Upload to Walrus"}
        </button>

        {blobId && (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-xs text-neutral-300 space-y-1">
            <p className="text-emerald-400 font-medium">Stored on Walrus ✓</p>
            <p className="font-mono break-all">{blobId}</p>
            
            <a
              href={walrusBlobUrl(blobId)}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-white"
            >
              View blob ↗
            </a>
          </div>
        )}
      </div>

      {/* Step 2: Attach */}
      {blobId && (
        <div className="space-y-3 border-t border-neutral-800 pt-6">
          <p className="text-xs font-medium text-neutral-400">
            Step 2 — Attach to a container
          </p>

          {isLoading ? (
            <p className="text-sm text-neutral-500">Loading your containers…</p>
          ) : !containers || containers.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No containers found. Mint one first.
            </p>
          ) : (
            <select
              value={selectedContainer}
              onChange={(e) => setSelectedContainer(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-600"
            >
              <option value="">Select a container…</option>
              {containers.map((c) => (
                <option key={c.objectId} value={c.objectId}>
                  {c.containerId} · {c.origin}→{c.destination} ·{" "}
                  {STATUS_LABELS[c.status]} · {c.documentBlobIds.length} docs
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleAttach}
            disabled={!selectedContainer || isAttaching}
            className="rounded-lg bg-white text-black font-medium text-sm px-4 py-2 hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {isAttaching ? "Attaching…" : "Attach document"}
          </button>
        </div>
      )}

      {attached && (
        <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/30 p-3 text-xs text-emerald-300">
          Document attached to container on-chain ✓
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-xs text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}