"use client";

import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID!;
const CONTAINER_TYPE = `${PACKAGE_ID}::container::Container`;

export type ContainerFields = {
  objectId: string;
  containerId: string;
  origin: string;
  destination: string;
  status: number;
  weightKg: string;
  documentBlobIds: string[];
  creator: string;
  latMicro: string;
  lngMicro: string;
  latNegative: boolean;
  lngNegative: boolean;
};

export function useContainers() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ["containers", account?.address],
    enabled: !!account,
    queryFn: async (): Promise<ContainerFields[]> => {
      if (!account) return [];

      const owned = await suiClient.getOwnedObjects({
        owner: account.address,
        filter: { StructType: CONTAINER_TYPE },
        options: { showContent: true },
      });

      const containers: ContainerFields[] = [];

      for (const item of owned.data) {
        const content = item.data?.content;
        if (content?.dataType !== "moveObject") continue;
        const f = content.fields as Record<string, unknown>;

        containers.push({
          objectId: item.data!.objectId,
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
        });
      }

      return containers;
    },
  });
}
