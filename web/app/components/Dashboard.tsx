"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { useContainers } from "../lib/useContainers";
import { useSharedContainers } from "../lib/useSharedContainers";
import { ContainerCard } from "./ContainerCard";

export function Dashboard() {
  const account = useCurrentAccount();
  const { data: containers, isLoading, error } = useContainers();
  const { data: shared, isLoading: loadingShared } = useSharedContainers();

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

  const hasOwned = containers && containers.length > 0;
  const hasShared = shared && shared.length > 0;

  return (
    <div className="space-y-10">
      {/* Owned */}
      <div>
        {!hasOwned ? (
          <p className="text-sm text-neutral-500">
            No containers yet. Mint one to get started.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {containers.map((c) => (
              <ContainerCard key={c.objectId} c={c} />
            ))}
          </div>
        )}
      </div>

      {/* Shared with me */}
      {(hasShared || loadingShared) && (
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Shared with me
          </h2>
          {loadingShared ? (
            <p className="text-sm text-neutral-500">Checking access…</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {shared!.map((c) => (
                <div key={c.objectId} className="relative">
                  <span className="absolute right-3 top-3 z-10 rounded border border-sky-800 bg-sky-950 px-2 py-0.5 text-[9px] uppercase tracking-wider text-sky-400">
                    Agent
                  </span>
                  <ContainerCard c={c} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}