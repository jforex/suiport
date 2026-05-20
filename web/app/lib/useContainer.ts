"use client";

import { useSuiClientQuery } from "@mysten/dapp-kit";
import { ContainerFields } from "./useContainers";

export function useContainer(objectId: string) {
  const query = useSuiClientQuery(
    "getObject",
    {
      id: objectId,
      options: { showContent: true, showOwner: true },
    },
    { enabled: !!objectId },
  );

  let container: ContainerFields | null = null;
  let owner: string | null = null;

  const content = query.data?.data?.content;
  if (content?.dataType === "moveObject") {
    const f = content.fields as Record<string, unknown>;
    container = {
      objectId: query.data!.data!.objectId,
      containerId: String(f.container_id ?? ""),
      origin: String(f.origin ?? ""),
      destination: String(f.destination ?? ""),
      status: Number(f.status ?? 0),
      weightKg: String(f.weight_kg ?? "0"),
      documentBlobIds: Array.isArray(f.document_blob_ids)
        ? (f.document_blob_ids as string[])
        : [],
      creator: String(f.creator ?? ""),
      latMicro: String(f.lat_micro ?? "0"),
      lngMicro: String(f.lng_micro ?? "0"),
      latNegative: Boolean(f.lat_negative),
      lngNegative: Boolean(f.lng_negative),
    };
  }

  const ownerData = query.data?.data?.owner;
  if (ownerData && typeof ownerData === "object" && "AddressOwner" in ownerData) {
    owner = ownerData.AddressOwner;
  }

  return { ...query, container, owner };
}