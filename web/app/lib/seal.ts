"use client";

import { SealClient, SessionKey, EncryptedObject } from "@mysten/seal";
import { Transaction } from "@mysten/sui/transactions";
import { toHex, fromHex } from "@mysten/sui/utils";

export const SEAL_THRESHOLD = 1;

const TESTNET_KEY_SERVERS = [
  "0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75",
  "0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8",
];

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

// Recover the identity (id) embedded in an encrypted blob.
export function parseIdentity(encryptedBytes: Uint8Array): string {
  const parsed = EncryptedObject.parse(encryptedBytes);
  return parsed.id;
}

// Build the seal_approve PTB the key servers dry-run during decryption.
// Our seal_approve(id, registry, ctx): we pass id + registry; ctx is implicit.
export function buildSealApproveTx(
  packageId: string,
  registryId: string,
  identityHex: string,
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${packageId}::access::seal_approve`,
    arguments: [
      tx.pure.vector("u8", Array.from(fromHex(identityHex))),
      tx.object(registryId),
    ],
  });
  return tx;
}

// ===== Metadata packing =====
// Prepend a small header to the plaintext before encryption so the original
// filename + MIME type survive the round-trip. Format:
//   [4-byte big-endian header length][UTF-8 JSON header][original file bytes]
// Length is read/written with plain array indexing to avoid DataView
// byteOffset issues when the decrypt output is a view into a larger buffer.

export function packWithMetadata(
  fileBytes: Uint8Array,
  name: string,
  mime: string,
): Uint8Array {
  const header = JSON.stringify({ name, mime });
  const headerBytes = new TextEncoder().encode(header);
  const out = new Uint8Array(4 + headerBytes.length + fileBytes.length);
  out[0] = (headerBytes.length >>> 24) & 0xff;
  out[1] = (headerBytes.length >>> 16) & 0xff;
  out[2] = (headerBytes.length >>> 8) & 0xff;
  out[3] = headerBytes.length & 0xff;
  out.set(headerBytes, 4);
  out.set(fileBytes, 4 + headerBytes.length);
  return out;
}

export type UnpackedFile = {
  bytes: Uint8Array;
  name: string;
  mime: string;
};

export function unpackWithMetadata(packed: Uint8Array): UnpackedFile {
  const headerLen =
    (packed[0] << 24) | (packed[1] << 16) | (packed[2] << 8) | packed[3];
  const headerBytes = packed.subarray(4, 4 + headerLen);
  const header = JSON.parse(new TextDecoder().decode(headerBytes));
  const bytes = packed.slice(4 + headerLen);
  return {
    bytes,
    name: header.name ?? "document",
    mime: header.mime ?? "application/octet-stream",
  };
}

export { SessionKey };