"use client";

import { useState } from "react";
import {
  useSignAndExecuteTransaction,
  useSuiClient,
  useCurrentAccount,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { uploadToWalrus } from "../lib/walrus";
import { useContainers } from "../lib/useContainers";
import { useRegistryForContainer } from "../lib/useRegistry";
import { makeSealClient, sealEncrypt, packWithMetadata } from "../lib/seal";
import { STATUS_LABELS } from "../lib/format";

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID!;
const ORIGINAL_PACKAGE_ID = process.env.NEXT_PUBLIC_ORIGINAL_PACKAGE_ID!;

export function DocumentPanel() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const { data: containers, isLoading: loadingContainers } = useContainers();

  const [selectedContainer, setSelectedContainer] = useState<string>("");
  const {
    data: registry,
    isLoading: loadingRegistry,
    refetch: refetchRegistry,
  } = useRegistryForContainer(selectedContainer);

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<null | "registry" | "upload">(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleCreateRegistry() {
    if (!selectedContainer) return;
    setError(null);
    setBusy("registry");

    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::access::create_registry`,
      arguments: [tx.pure.id(selectedContainer)],
    });

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: async ({ digest }) => {
          await suiClient.waitForTransaction({ digest });
          setBusy(null);
          setTimeout(() => refetchRegistry(), 1500);
        },
        onError: (err) => {
          setError(err.message);
          setBusy(null);
        },
      },
    );
  }

  async function handleEncryptedUpload() {
    if (!file || !registry) return;
    setError(null);
    setDone(false);
    setBusy("upload");

    try {
      // 1. Read file bytes and pack with name + MIME so they survive decryption
      setStatus("Reading file…");
      const rawBytes = new Uint8Array(await file.arrayBuffer());
      const buf = packWithMetadata(
        rawBytes,
        file.name,
        file.type || "application/octet-stream",
      );

      // 2. Encrypt with Seal (uses ORIGINAL package ID as identity namespace)
      setStatus("Encrypting with Seal…");
      const sealClient = makeSealClient(suiClient);
      const { encryptedBytes } = await sealEncrypt(
        sealClient,
        ORIGINAL_PACKAGE_ID,
        registry.registryId,
        buf,
      );

      // 3. Upload encrypted bytes to Walrus
      setStatus("Uploading to Walrus…");
      const result = await uploadToWalrus(encryptedBytes, 5);

      // 4. Attach blob ID to the container on-chain
      setStatus("Anchoring on-chain…");
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::container::attach_document`,
        arguments: [tx.object(selectedContainer), tx.pure.string(result.blobId)],
      });

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: async ({ digest }) => {
            await suiClient.waitForTransaction({ digest });
            setBusy(null);
            setStatus(null);
            setDone(true);
            setFile(null);
          },
          onError: (err) => {
            setError(err.message);
            setBusy(null);
            setStatus(null);
          },
        },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(null);
      setStatus(null);
    }
  }

  if (!account) {
    return (
      <p className="text-sm text-neutral-500">
        Connect your wallet to manage documents.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step 1: pick container */}
      <div className="space-y-2">
        <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500">
          Container
        </label>
        {loadingContainers ? (
          <p className="text-sm text-neutral-500">Loading…</p>
        ) : !containers || containers.length === 0 ? (
          <p className="text-sm text-neutral-500">Mint a container first.</p>
        ) : (
          <select
            value={selectedContainer}
            onChange={(e) => {
              setSelectedContainer(e.target.value);
              setDone(false);
              setError(null);
            }}
            className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-600"
          >
            <option value="">Select a container…</option>
            {containers.map((c) => (
              <option key={c.objectId} value={c.objectId}>
                {c.containerId} · {c.origin}→{c.destination} ·{" "}
                {STATUS_LABELS[c.status]}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Step 2: registry */}
      {selectedContainer && (
        <div className="space-y-3 border-t border-neutral-800 pt-6">
          <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500">
            Secure registry
          </label>

          {loadingRegistry ? (
            <p className="text-sm text-neutral-500">Checking…</p>
          ) : registry ? (
            <div className="rounded-md border border-emerald-900/60 bg-emerald-950/30 p-3 text-xs">
              <p className="text-emerald-400 font-medium">
                Registry active — documents will be encrypted
              </p>
              <p className="mt-1 text-neutral-400">
                {registry.activeMembers.length} address
                {registry.activeMembers.length === 1 ? "" : "es"} can decrypt
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-neutral-400">
                This container has no secure document registry yet. Create one to
                enable encrypted document custody (only allowlisted addresses can
                decrypt).
              </p>
              <button
                onClick={handleCreateRegistry}
                disabled={busy === "registry"}
                className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400 disabled:opacity-40"
              >
                {busy === "registry" ? "Creating…" : "Create secure registry"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: encrypted upload */}
      {selectedContainer && registry && (
        <div className="space-y-3 border-t border-neutral-800 pt-6">
          <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500">
            Upload encrypted document
          </label>
          <input
            type="file"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setDone(false);
            }}
            className="block w-full text-sm text-neutral-400 file:mr-4 file:rounded-lg file:border-0 file:bg-neutral-800 file:px-4 file:py-2 file:text-sm file:text-neutral-100 hover:file:bg-neutral-700"
          />
          <button
            onClick={handleEncryptedUpload}
            disabled={!file || busy === "upload"}
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-200 disabled:opacity-40"
          >
            {busy === "upload" ? status ?? "Working…" : "Encrypt & upload"}
          </button>
        </div>
      )}

      {done && (
        <div className="rounded-md border border-emerald-900/60 bg-emerald-950/30 p-3 text-xs text-emerald-300">
          Encrypted document stored on Walrus and anchored on-chain ✓
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-900/60 bg-red-950/40 p-3 text-xs text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}