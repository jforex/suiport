"use client";

import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { ContainerFields } from "./useContainers";

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID!;

export type SharedContainer = ContainerFields & {
  registryId: string;
  role: "agent";
};

// Find containers the current user can access as an ACTIVE member but does
// NOT own. We scan AgentEngaged events for this address, then verify the
// registry still lists them active, then load the container.
export function useSharedContainers() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ["sharedContainers", account?.address],
    enabled: !!account,
    queryFn: async (): Promise<SharedContainer[]> => {
      if (!account) return [];

      // 1. Find AgentEngaged events naming this address.
      const events = await suiClient.queryEvents({
        query: { MoveEventType: `${PACKAGE_ID}::access::AgentEngaged` },
        limit: 200,
        order: "descending",
      });

      const registryIds = new Set<string>();
      for (const e of events.data) {
        const parsed = e.parsedJson as { registry_id?: string; agent?: string };
        if (parsed?.agent === account.address && parsed.registry_id) {
          registryIds.add(parsed.registry_id);
        }
      }

      if (registryIds.size === 0) return [];

      const out: SharedContainer[] = [];

      for (const registryId of registryIds) {
        // 2. Load the registry; confirm caller is still an ACTIVE member.
        const regObj = await suiClient.getObject({
          id: registryId,
          options: { showContent: true },
        });
        const regContent = regObj.data?.content;
        if (regContent?.dataType !== "moveObject") continue;
        const rf = regContent.fields as Record<string, unknown>;

        const rawMembers = Array.isArray(rf.members) ? rf.members : [];
        const stillActive = rawMembers.some((m) => {
          const mf = (m as { fields?: Record<string, unknown> }).fields ?? {};
          return String(mf.addr) === account.address && Boolean(mf.active);
        });
        if (!stillActive) continue;

        // Skip if the caller is actually the admin (that's "owned", not "shared").
        if (String(rf.admin) === account.address) continue;

        const containerId = String(rf.container_id ?? "");
        if (!containerId) continue;

        // 3. Load the container object.
        const cObj = await suiClient.getObject({
          id: containerId,
          options: { showContent: true },
        });
        const cContent = cObj.data?.content;
        if (cContent?.dataType !== "moveObject") continue;
        const f = cContent.fields as Record<string, unknown>;

        out.push({
          objectId: containerId,
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
          registryId,
          role: "agent",
        });
      }

      return out;
    },
  });
}