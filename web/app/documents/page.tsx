"use client";

import { DocumentPanel } from "../components/DocumentPanel";

export default function DocumentsPage() {
  return (
    <div className="page-enter mx-auto max-w-xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
      <p className="mt-1 mb-8 text-sm text-neutral-400">
        Upload a Bill of Lading, customs form, or inspection photo to Walrus,
        then anchor it to a container on-chain.
      </p>

      <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-6">
        <DocumentPanel />
      </div>
    </div>
  );
}