"use client";

import { AgentManager } from "../../components/AgentManager";
import { use, useState } from "react";
import Link from "next/link";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useContainer } from "../../lib/useContainer";
import { useRegistryForContainer } from "../../lib/useRegistry";
import { ContainerActions } from "../../components/ContainerActions";
import { DecryptButton } from "../../components/DecryptButton";
import {
  STATUS_LABELS,
  STATUS_STYLES,
  shortAddr,
  shortId,
  formatCoords,
} from "../../lib/format";
import { walrusBlobUrl } from "../../lib/walrus";

const STATUS_ORDER = [0, 1, 2, 3, 4];

export default function ContainerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const account = useCurrentAccount();
  const { container, owner, isLoading, error, refetch } = useContainer(id);
  const { data: registry, refetch: refetchRegistry } = useRegistryForContainer(id);
  const [copied, setCopied] = useState(false);

  const isOwner = !!account && !!owner && account.address === owner;

  if (isLoading) {
    return (
      <div className="page-enter mx-auto max-w-3xl px-6 py-10">
        <p className="text-sm text-neutral-500">Loading container…</p>
      </div>
    );
  }

  if (error || !container) {
    return (
      <div className="page-enter mx-auto max-w-3xl px-6 py-10">
        <Link href="/" className="text-sm text-amber-500 hover:underline">
          ← Back to manifest
        </Link>
        <p className="mt-6 text-sm text-red-400">
          Container not found or failed to load.
        </p>
      </div>
    );
  }

  return (
    <div className="page-enter mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-amber-500 hover:underline">
        ← Back to manifest
      </Link>

      {/* Header */}
      <div className="mt-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-2xl font-bold tracking-tight">
            {container.containerId}
          </h1>
          <div className="mt-2 flex items-center gap-2 font-mono text-sm text-neutral-400">
            <span>{container.origin}</span>
            <span className="text-neutral-600">→</span>
            <span>{container.destination}</span>
          </div>
        </div>
        <span
          className={`shrink-0 rounded border px-3 py-1 text-xs font-medium uppercase tracking-wider ${
            STATUS_STYLES[container.status] ?? STATUS_STYLES[0]
          }`}
        >
          {STATUS_LABELS[container.status]}
        </span>
      </div>

      {/* Status timeline */}
      <div className="mt-8 flex items-center gap-1">
        {STATUS_ORDER.map((s, i) => {
          const reached = container.status >= s;
          return (
            <div key={s} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${
                    reached ? "bg-amber-500" : "bg-neutral-700"
                  }`}
                />
                <span
                  className={`text-[9px] uppercase tracking-wide ${
                    reached ? "text-neutral-300" : "text-neutral-600"
                  }`}
                >
                  {STATUS_LABELS[s]}
                </span>
              </div>
              {i < STATUS_ORDER.length - 1 && (
                <div
                  className={`mx-1 h-px flex-1 ${
                    container.status > s ? "bg-amber-500" : "bg-neutral-700"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Two columns: metadata + actions */}
      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Metadata */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Details
          </h2>
          <dl className="space-y-3 text-sm">
            <Row label="Weight">
              {(Number(container.weightKg) / 1000).toFixed(1)} t
            </Row>
            <Row label="Location">
              {formatCoords(
                container.latMicro,
                container.latNegative,
                container.lngMicro,
                container.lngNegative,
              )}
            </Row>
            <Row label="Creator">
              <span className="font-mono">{shortAddr(container.creator)}</span>
            </Row>
            <Row label="Owner">
              <span className="font-mono">
                {owner ? shortAddr(owner) : "—"}
                {isOwner && <span className="ml-1 text-amber-500">(you)</span>}
              </span>
            </Row>
            <Row label="Object ID">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(container.objectId);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="font-mono text-neutral-300 hover:text-white"
              >
                {shortId(container.objectId)} {copied ? "✓" : "copy"}
              </button>
            </Row>
          </dl>

          <a
            href={`https://suiscan.xyz/testnet/object/${container.objectId}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block text-xs text-amber-500 hover:underline"
          >
            View on Suiscan ↗
          </a>
        </div>

        {/* Actions */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Lifecycle
          </h2>
          <ContainerActions
            objectId={container.objectId}
            currentStatus={container.status}
            isOwner={isOwner}
            onChanged={refetch}
          />
        </div>
      </div>


      {/* Access control */}
      {registry && (
        <div className="mt-6 rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Document access
          </h2>
          <AgentManager registry={registry} onChanged={refetchRegistry} />
        </div>
      )}

      {/* Documents */}
      <div className="mt-6 rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Documents ({container.documentBlobIds.length})
          </h2>
          {registry && (
            <span className="rounded border border-emerald-900/60 bg-emerald-950/30 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-400">
              Encrypted · Seal
            </span>
          )}
        </div>
        {container.documentBlobIds.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No documents attached yet.{" "}
            <Link href="/documents" className="text-amber-500 hover:underline">
              Attach one →
            </Link>
          </p>
        ) : (
          <ul className="space-y-2">
            {container.documentBlobIds.map((blobId, i) => (
              <li
                key={blobId}
                className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm text-neutral-300">Document {i + 1}</p>
                  <p className="truncate font-mono text-[11px] text-neutral-600">
                    {blobId}
                  </p>
                </div>

                <div className="ml-3 shrink-0">
                  {registry ? (
                    <DecryptButton
                      blobId={blobId}
                      registryId={registry.registryId}
                    />
                  ) : (
                    
                    <a
                      href={walrusBlobUrl(blobId)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded bg-neutral-800 px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-700"
                    >
                      View ↗
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="text-neutral-200">{children}</dd>
    </div>
  );
}