# SuiPort

> Verifiable document custody for global trade.

Built on Sui, Walrus, and Seal for [Sui Overflow 2026](https://overflow.sui.io/) — Walrus track.

## What it is

Shipping containers as on-chain objects with their documents (Bills of Lading, customs forms, inspection photos) stored encrypted on Walrus. Access is gated by Sui smart contracts. Ownership transfers cryptographically as the container moves through the supply chain.

Inspired by the failure of TradeLens (Maersk/IBM) — the centralised version of this idea — and the document fraud problem in real-world shipping.

## Stack

- **Smart contracts:** Move on Sui
- **Storage:** Walrus (decentralised blob storage)
- **Encryption / access control:** Seal
- **Frontend:** Next.js + TypeScript + Tailwind
- **Wallet / auth:** Sui dApp Kit + zkLogin

## Status

Hackathon build in progress.

| Phase | Status |
|---|---|
| Move contract: Container object | Deployed to testnet |
| Frontend + wallet connect | In progress |
| Walrus + Seal integration | Planned |
| zkLogin + GPS oracle + map | Planned |
| Demo video + submission | Planned |

## Testnet deployment

- **Package ID:** `0x86c9d194e70c661760a3e0e51493c1ff438a6abac0b0e76dcd7f7d003fda7268`
- **Network:** Sui testnet

## Local development

\`\`\`bash
cd contracts
sui move build
sui move test
\`\`\`

## License

MIT
