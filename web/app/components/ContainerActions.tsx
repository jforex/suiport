"use client";

import { useState } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { STATUS_LABELS } from "../lib/format";

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID!;

export function ContainerActions({
  objectId,
  currentStatus,
  isOwner,
  onChanged,
}: {
  objectId: string;
  currentStatus: number;
  isOwner: boolean;
  onChanged: () => void;
}) {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();

  const [newStatus, setNewStatus] = useState(String(currentStatus));
  const [recipient, setRecipient] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"status" | "transfer" | null>(null);

  if (!account) {
    return (
      <p className="text-sm text-neutral-500">
        Connect your wallet to manage this container.
      </p>
    );
  }

  if (!isOwner) {
    return (
      <p className="text-sm text-neutral-500">
        Only the current owner can update or transfer this container.
      </p>
    );
  }

  function handleStatusUpdate() {
    setError(null);
    setBusy("status");
    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::container::update_status`,
      arguments: [tx.object(objectId), tx.pure.u8(Number(newStatus))],
    });
    signAndExecute(
      { transaction: tx },
      {
        onSuccess: async ({ digest }) => {
          await suiClient.waitForTransaction({ digest });
          setBusy(null);
          onChanged();
        },
        onError: (err) => {
          setError(err.message);
          setBusy(null);
        },
      },
    );
  }

  function handleTransfer() {
    setError(null);
    if (!recipient.startsWith("0x") || recipient.length < 10) {
      setError("Enter a valid Sui address (0x…).");
      return;
    }
    setBusy("transfer");
    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::container::transfer_container`,
      arguments: [tx.object(objectId), tx.pure.address(recipient.trim())],
    });
    signAndExecute(
      { transaction: tx },
      {
        onSuccess: async ({ digest }) => {
          await suiClient.waitForTransaction({ digest });
          setBusy(null);
          setRecipient("");
          onChanged();
        },
        onError: (err) => {
          setError(err.message);
          setBusy(null);
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      {/* Status update */}
      <div className="space-y-2">
        <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500">
          Update status
        </label>
        <div className="flex gap-2">
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="flex-1 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-600"
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            onClick={handleStatusUpdate}
            disabled={isPending || newStatus === String(currentStatus)}
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-200 disabled:opacity-40"
          >
            {busy === "status" ? "Updating…" : "Update"}
          </button>
        </div>
      </div>

      {/* Transfer */}
      <div className="space-y-2 border-t border-neutral-800 pt-6">
        <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500">
          Transfer ownership
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x… recipient address"
            className="flex-1 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm font-mono placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-600"
          />
          <button
            onClick={handleTransfer}
            disabled={isPending || !recipient}
            className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400 disabled:opacity-40"
          >
            {busy === "transfer" ? "Sending…" : "Transfer"}
          </button>
        </div>
        <p className="text-[11px] text-neutral-600">
          Transferring hands the container — and control of its documents — to
          the recipient. This cannot be undone.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-900/60 bg-red-950/40 p-3 text-xs text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}