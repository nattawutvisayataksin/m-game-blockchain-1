import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http";
import { characterStats, gainExp } from "./stats";

// ============================================================
// REWARD → CLAIM flow ตามโจทย์ Phase 2
// ------------------------------------------------------------
// เมื่อ "ชนะเกม" Server คำนวณและ "ออกใบรับรางวัล" (RewardGrant PENDING)
// ผู้เล่นกด claim ระบบจะ:
//   • GOLD → เดินบัญชี Ledger (DEBIT player / CREDIT treasury)
//   • ITEM  → เติมลง UserInventory (รวม quantity ถ้าเป็นแบบ fungible)
//   • EXP   → เพิ่ม exp + ยกเลเวลของตัวละครที่ชนะนั้นโดยอัตโนมัติ
// กัน claim ซ้ำ: ล็อกสถานะด้วย updateMany({where: status: PENDING}) — แถวที่ยัง
// PENDING เท่านั้นที่มีสิทธิ์ถูก claim (คำขอที่ช้ากว่าจะถูกข้ามไปโดยไม่แจกซ้ำ)
// ============================================================

export interface ClaimedSummary {
  claimedCount: number;
  goldGranted: string;
  newGoldBalance: string;
  itemsGranted: { code: string; name: string; quantity: number }[];
  expResults: { characterName: string; levelBefore: number; levelAfter: number; levelUps: number }[];
}

export async function listPendingRewards(userId: string) {
  const grants = await prisma.rewardGrant.findMany({
    where: { userId, status: "PENDING" },
    include: { itemTemplate: { select: { code: true, name: true, rarity: true } } },
    orderBy: { grantedAt: "asc" },
  });
  return grants.map((g) => ({
    id: g.id,
    refType: g.refType,
    refId: g.refId,
    type: g.type,
    quantity: g.quantity?.toString() ?? null,
    item:
      g.itemTemplate && g.type === "ITEM"
        ? { code: g.itemTemplate.code, name: g.itemTemplate.name, rarity: g.itemTemplate.rarity }
        : null,
    grantedAt: g.grantedAt,
  }));
}

export async function claimRewards(userId: string, grantIds?: string[]): Promise<ClaimedSummary> {
  const summary: ClaimedSummary = {
    claimedCount: 0,
    goldGranted: "0",
    newGoldBalance: "0",
    itemsGranted: [],
    expResults: [],
  };

  const result = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      // 1) อ่านใบใหม่ที่ยัง PENDING
      const grants = await tx.rewardGrant.findMany({
        where: {
          userId,
          status: "PENDING",
          ...(grantIds && grantIds.length > 0 ? { id: { in: grantIds } } : {}),
        },
        include: {
          itemTemplate: true,
        },
        orderBy: { grantedAt: "asc" },
      });

      if (grants.length === 0) {
        throw new ApiError(404, "NOTHING_TO_CLAIM", "ไม่มีรางวัลที่รอการรับสำหรับบัญชีนี้");
      }

      let goldTotal = 0n;

      // 2) claim ทีละใบ — ยืนยันสงครามโคลน transaction ด้วย updateMany status=PENDING
      for (const grant of grants) {
        const locked = await tx.rewardGrant.updateMany({
          where: { id: grant.id, status: "PENDING" },
          data: { status: "CLAIMED", claimedAt: new Date() },
        });
        if (locked.count !== 1) continue; // ถูก claim ไปก่อนแล้วโดยคำขออื่น → ข้าม
        summary.claimedCount += 1;

        if (grant.type === "GOLD" && grant.quantity) {
          goldTotal += grant.quantity;
          await tx.user.update({ where: { id: userId }, data: { goldBalance: { increment: grant.quantity } } });
        }

        if (grant.type === "ITEM" && grant.itemTemplate) {
          const template = grant.itemTemplate;
          const qty = Math.max(1, Number(grant.quantity ?? 1));
          if (template.fungible) {
            // ของกินได้/แผ่นเหล็ก ฯลฯ: รวม stack ในแถวเดิม (เทียบแนว ERC-1155)
            const existing = await tx.userInventory.findFirst({
              where: { userId, templateId: template.id, status: "ACTIVE" },
              select: { id: true, quantity: true },
            });
            if (existing) {
              await tx.userInventory.update({
                where: { id: existing.id },
                data: { quantity: existing.quantity + qty },
              });
            } else {
              await tx.userInventory.create({
                data: {
                  userId,
                  templateId: template.id,
                  quantity: qty,
                  instanceData: {},
                },
              });
            }
          } else {
            // ของ "เฉพาะตัว" (อาวุธ/คาแรกเตอร์): แยกแถวใหม่ต่อชิ้นยึดหลัก ERC-721 อนาคต
            await tx.userInventory.create({
              data: {
                userId,
                templateId: template.id,
                quantity: 1,
                instanceData: {
                  level: template.kind === "CHARACTER" ? 1 : 0,
                  exp: 0,
                  currentHp: null,
                  equipment: {},
                },
              },
            });
          }
          summary.itemsGranted.push({
            code: template.code,
            name: template.name,
            quantity: qty,
          });
        }

        if (grant.type === "EXP" && grant.quantity) {
          // ใบ EXP ต้องผูกกับ battle → หาตัวละครที่สู้เพื่ออัปเลเวล
          if (grant.refType !== "BATTLE") continue;
          const battle = await tx.battle.findUnique({
            where: { id: grant.refId },
            include: { characterInv: { include: { template: true } } },
          });
          if (!battle) continue;
          const character = battle.characterInv;
          const inst = (character.instanceData ?? {}) as Record<string, unknown>;
          const levelBefore = Number(inst.level ?? 1);
          const expBefore = Number(inst.exp ?? 0);
          const up = gainExp(levelBefore, expBefore, Number(grant.quantity));
          const newStats = characterStats(character.template.attributes, up.levelAfter);
          await tx.userInventory.update({
            where: { id: character.id },
            data: {
              instanceData: {
                ...inst,
                level: up.levelAfter,
                exp: up.newExp,
                currentHp: newStats.hp, // เต็มแรงหลังเลเวลอัป
              },
            },
          });
          summary.expResults.push({
            characterName: character.template.name,
            levelBefore: up.levelBefore,
            levelAfter: up.levelAfter,
            levelUps: up.levelUps,
          });
        }
      }

      if (summary.claimedCount === 0) {
        throw new ApiError(404, "NOTHING_TO_CLAIM", "รางวัลนี้ถูกรับไปแล้วหมด");
      }

      const player = await tx.user.findUnique({ where: { id: userId }, select: { goldBalance: true } });
      const newBalance = player?.goldBalance ?? 0n;
      return { goldTotal, newBalance };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15_000 },
  );

  summary.goldGranted = result.goldTotal.toString();
  summary.newGoldBalance = result.newBalance.toString();
  return summary;
}
