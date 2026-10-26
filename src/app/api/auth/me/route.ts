import type { NextRequest } from "next/server";
import { ok, withRoute } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { playerBalance } from "@/server/ledger/ledger";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export const GET = withRoute(async (req: NextRequest) => {
  const user = await requireUser(req);
  const balance = await prisma.$transaction((tx) => playerBalance(tx, user.id));
  const walletLinkCount = await prisma.authIdentity.count({ where: { userId: user.id } });

  return ok({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    goldBalance: balance.toString(),
    identities: walletLinkCount,
    // ---- Web3 readiness (แสดงสถานะของ scaffold) ----
    wallet: {
      address: user.walletAddress, // null จนกว่า Phase B จะเชื่อม
      chainId: user.walletChainId?.toString() ?? null,
      linkedAt: user.walletLinkedAt,
      bridgeEnabled: env.web3BridgeEnabled,
      chainReference: {
        name: "Kub Chain",
        chainId: env.kubChainId.toString(),
        rpcUrl: env.kubRpcUrl,
        explorerUrl: env.kubExplorerUrl,
      },
    },
  });
});
