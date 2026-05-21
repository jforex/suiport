"use client";

import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID!;
const REGISTRY_TYPE = `${PACKAGE_ID}::access::DocumentRegistry`;

export type RegistryInfo = {
  registryId: string;
  admin: string;
  allowlist: string[];
};

// Find the DocumentRegistry for a given container, if one exists.
// We scan RegistryCreated events for this container_id.
export function useRegistryForContainer(containerObjectId: string) {
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ["registry", containerObjectId],
    enabled: !!containerObjectId,
    queryFn: async (): Promise<RegistryInfo | null> => {
      // Query RegistryCreated events from our package.
      const events = await suiClient.queryEvents({
        query: { MoveEventType: `${PACKAGE_ID}::access::RegistryCreated` },
        limit: 50,
        order: "descending",
      });

      const match = events.data.find((e) => {
        const parsed = e.parsedJson as { container_id?: string };
        return parsed?.container_id === containerObjectId;
      });

      if (!match) return null;

      const parsed = match.parsedJson as {
        registry_id: string;
        admin: string;
      };

      // Fetch the registry object to read the current allowlist.
      const obj = await suiClient.getObject({
        id: parsed.registry_id,
        options: { showContent: true },
      });

      const content = obj.data?.content;
      if (content?.dataType !== "moveObject") return null;
      const f = content.fields as Record<string, unknown>;

      return {
        registryId: parsed.registry_id,
        admin: String(f.admin ?? ""),
        allowlist: Array.isArray(f.allowlist) ? (f.allowlist as string[]) : [],
      };
    },
  });
}