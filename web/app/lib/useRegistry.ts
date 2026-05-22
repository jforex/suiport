"use client";

import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID!;

export type RegistryMember = {
  addr: string;
  active: boolean;
};

export type RegistryInfo = {
  registryId: string;
  admin: string;
  members: RegistryMember[];
  // Convenience: just the active addresses.
  activeMembers: string[];
};

// Find the DocumentRegistry for a given container, if one exists.
// We scan RegistryCreated events for this container_id.
export function useRegistryForContainer(containerObjectId: string) {
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ["registry", containerObjectId],
    enabled: !!containerObjectId,
    queryFn: async (): Promise<RegistryInfo | null> => {
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

      const obj = await suiClient.getObject({
        id: parsed.registry_id,
        options: { showContent: true },
      });

      const content = obj.data?.content;
      if (content?.dataType !== "moveObject") return null;
      const f = content.fields as Record<string, unknown>;

      // members is a vector of Move structs; each comes back as { fields: { addr, active } }
      const rawMembers = Array.isArray(f.members) ? f.members : [];
      const members: RegistryMember[] = rawMembers.map((m) => {
        const mf = (m as { fields?: Record<string, unknown> }).fields ?? {};
        return {
          addr: String(mf.addr ?? ""),
          active: Boolean(mf.active),
        };
      });

      return {
        registryId: parsed.registry_id,
        admin: String(f.admin ?? ""),
        members,
        activeMembers: members.filter((m) => m.active).map((m) => m.addr),
      };
    },
  });
}