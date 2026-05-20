"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { useContainers } from "../lib/useContainers";
import { ContainerCard } from "./ContainerCard";

export function Dashboard() {
  const account = useCurrentAccount();
  const { data: containers, isLoading, error } = useContainers();

  if (!account) {
    return (
      <p className="text-sm text-neutral-500">
        Connect your wallet to see your containers.
      </p>
    );
  }

  if (isLoading) {
    return <p className="text-sm text-neutral-500">Loading containers…</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-red-400">
        Failed to load containers: {error.message}
      </p>
    );
  }

  if (!containers || containers.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        No containers yet. Mint one above to get started.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {containers.map((c) => (
        <ContainerCard key={c.objectId} c={c} />
      ))}
    </div>
  );
}