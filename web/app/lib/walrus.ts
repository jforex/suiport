// Walrus HTTP client — uses public testnet publisher/aggregator.
// Upload: PUT /v1/blobs   Download: GET /v1/blobs/:blobId

const PUBLISHER = process.env.NEXT_PUBLIC_WALRUS_PUBLISHER!;
const AGGREGATOR = process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR!;

export type WalrusUploadResult = {
  blobId: string;
  // True if Walrus already had this exact blob stored (dedup).
  alreadyCertified: boolean;
  // The Sui object ID of the Blob object, when newly created.
  suiObjectId: string | null;
  endEpoch: number | null;
};

/**
 * Upload a file/blob to Walrus.
 * `epochs` controls how long it's stored (each testnet epoch is ~1 day).
 */
export async function uploadToWalrus(
  data: Blob | Uint8Array | ArrayBuffer,
  epochs = 5,
): Promise<WalrusUploadResult> {
  const url = `${PUBLISHER}/v1/blobs?epochs=${epochs}`;

  const res = await fetch(url, {
    method: "PUT",
    body: data instanceof Blob ? data : new Blob([data]),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Walrus upload failed (${res.status}): ${text || res.statusText}`,
    );
  }

  const json = await res.json();

  // The publisher returns either { newlyCreated: {...} } or { alreadyCertified: {...} }
  if (json.newlyCreated) {
    const obj = json.newlyCreated.blobObject;
    return {
      blobId: obj.blobId,
      alreadyCertified: false,
      suiObjectId: obj.id ?? null,
      endEpoch: obj.storage?.endEpoch ?? null,
    };
  }

  if (json.alreadyCertified) {
    return {
      blobId: json.alreadyCertified.blobId,
      alreadyCertified: true,
      suiObjectId: null,
      endEpoch: json.alreadyCertified.endEpoch ?? null,
    };
  }

  throw new Error("Unexpected Walrus response shape: " + JSON.stringify(json));
}

/**
 * Build the public URL to read a blob back from Walrus.
 */
export function walrusBlobUrl(blobId: string): string {
  return `${AGGREGATOR}/v1/blobs/${blobId}`;
}

/**
 * Download a blob from Walrus as raw bytes.
 */
export async function downloadFromWalrus(blobId: string): Promise<Uint8Array> {
  const res = await fetch(walrusBlobUrl(blobId));
  if (!res.ok) {
    throw new Error(`Walrus download failed (${res.status}): ${res.statusText}`);
  }
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}