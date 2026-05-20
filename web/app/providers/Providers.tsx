"use client";

import { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  SuiClientProvider,
  WalletProvider,
  createNetworkConfig,
} from "@mysten/dapp-kit";
import { getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";

// dApp Kit's CSS — required for ConnectModal styling.
import "@mysten/dapp-kit/dist/index.css";

// Configure the networks we support. We're starting on testnet.
const { networkConfig } = createNetworkConfig({
   testnet: { url: getJsonRpcFullnodeUrl("testnet"), network: "testnet" },
   mainnet: { url: getJsonRpcFullnodeUrl("mainnet"), network: "mainnet" },
});

export function Providers({ children }: { children: ReactNode }) {
  // Create a single QueryClient per mount.
  // useState avoids re-creating it on every re-render.
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider autoConnect>
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}