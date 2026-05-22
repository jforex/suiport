"use client";

import { useState } from "react";
import {
  useCurrentAccount,
  useSignPersonalMessage,
  useSuiClient,
} from "@mysten/dapp-kit";
import {
  makeSealClient,
  parseIdentity,
  buildSealApproveTx,
  unpackWithMetadata,
  SessionKey,
} from "../lib/seal";
import { downloadFromWalrus } from "../lib/walrus";

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID!;
const ORIGINAL_PACKAGE_ID = process.env.NEXT_PUBLIC_ORIGINAL_PACKAGE_ID!;

let cachedSessionKey: SessionKey | null = null;
let cachedFor: string | null = null;

export function DecryptButton({
  blobId,
  registryId,
}: {
  blobId: string;
  registryId: string;
}) {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultName, setResultName] = useState<string>("document");

  async function getSessionKey(): Promise<SessionKey> {
    if (
      cachedSessionKey &&
      cachedFor === account!.address &&
      !cachedSessionKey.isExpired()
    ) {
      return cachedSessionKey;
    }
    const sk = await SessionKey.create({
      address: account!.address,
      packageId: PACKAGE_ID,
      ttlMin: 30,
      suiClient: suiClient as never,
    });
    const { signature } = await signPersonalMessage({
      message: sk.getPersonalMessage(),
    });
    await sk.setPersonalMessageSignature(signature);
    cachedSessionKey = sk;
    cachedFor = account!.address;
    return sk;
  }

  async function handleDecrypt() {
    if (!account) return;
    setBusy(true);
    setError(null);
    setResultUrl(null);

    try {
      const encryptedBytes = await downloadFromWalrus(blobId);
      const identityHex = parseIdentity(encryptedBytes);
      const sessionKey = await getSessionKey();

      const tx = buildSealApproveTx(
        ORIGINAL_PACKAGE_ID,
        registryId,
        identityHex,
      );
      const txBytes = await tx.build({
        client: suiClient,
        onlyTransactionKind: true,
      });

      const sealClient = makeSealClient(suiClient);
      const plaintext = await sealClient.decrypt({
        data: encryptedBytes,
        sessionKey,
        txBytes,
      });

      // Strip the metadata header, recover original name + MIME.
      const { bytes, name, mime } = unpackWithMetadata(
        new Uint8Array(plaintext),
      );
      const blob = new Blob([bytes as BlobPart], { type: mime });
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setResultName(name);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes("noaccess") || msg.includes("ENoAccess")) {
        setError(
          "Access denied — your address is not an active member of this container's registry.",
        );
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!account) {
    return (
      <span className="text-[11px] text-neutral-600">Connect to decrypt</span>
    );
  }

  if (resultUrl) {
    return (
     
    <a
        href={resultUrl}
        target="_blank"
        rel="noreferrer"
        download={resultName}
        className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
      >
        Open decrypted ↗
      </a>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleDecrypt}
        disabled={busy}
        className="rounded bg-neutral-800 px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-700 disabled:opacity-40"
      >
        {busy ? "Decrypting…" : "Decrypt"}
      </button>
      {error && (
        <span className="max-w-[200px] text-right text-[10px] text-red-400">
          {error}
        </span>
      )}
    </div>
  );
}