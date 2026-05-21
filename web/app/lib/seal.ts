"use client";

import { SealClient, SessionKey } from "@mysten/seal";
import { toHex, fromHex } from "@mysten/sui/utils";

export const SEAL_THRESHOLD = 1;

// Official Mysten testnet Seal key servers (from seal-docs.wal.app).
// v1.1.3 has no getAllowlistedKeyServers helper, so we list them explicitly.
const TESTNET_KEY_SERVERS = [
  "0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75",
  "0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8",
];

// We accept the SuiClient instance from useSuiClient() without importing
// its type (the export path differs across SDK versions). `unknown` keeps
// the build happy; the Seal SDK validates the client at runtime.
export function makeSealClient(suiClient: unknown): SealClient {
  return new SealClient({
    suiClient: suiClient as never,
    serverConfigs: TESTNET_KEY_SERVERS.map((id) => ({
      objectId: id,
      weight: 1,
    })),
    verifyKeyServers: false,
  });
}

// Identity = registryId bytes + random nonce. seal_approve checks the prefix.
export function buildIdentity(registryId: string): string {
  const registryBytes = fromHex(registryId);
  const nonce = crypto.getRandomValues(new Uint8Array(8));
  const full = new Uint8Array(registryBytes.length + nonce.length);
  full.set(registryBytes, 0);
  full.set(nonce, registryBytes.length);
  return toHex(full);
}

export type EncryptResult = {
  encryptedBytes: Uint8Array;
  identityHex: string;
};

export async function sealEncrypt(
  sealClient: SealClient,
  packageId: string,
  registryId: string,
  data: Uint8Array,
): Promise<EncryptResult> {
  const identityHex = buildIdentity(registryId);
  const { encryptedObject } = await sealClient.encrypt({
    threshold: SEAL_THRESHOLD,
    packageId,
    id: identityHex,
    data,
  });
  return { encryptedBytes: encryptedObject, identityHex };
}

export { SessionKey };