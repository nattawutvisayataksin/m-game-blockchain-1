"use client";

// ============================================================
// Game store (zustand) — สถานะกลางฝั่ง client
// server เป็นผู้ชี้ขาดทุกอย่าง client เก็บแค่ "มุมมอง" ล่าสุด
// ============================================================

import { create } from "zustand";
import {
  ApiFailure,
  claimRewards as apiClaim,
  inventory as apiInventory,
  login as apiLogin,
  logout as apiLogout,
  me,
  pendingRewards as apiPending,
  purchase as apiPurchase,
  register as apiRegister,
  shopList as apiShop,
  stages as apiStages,
} from "./api";
import type { BattleView, ClaimSummary, InventoryItem, MeResponse, PendingReward, ShopTemplate, StageInfo } from "./types";
import { sfx, setMuted, isMuted } from "./sfx";

export type ScreenName = "title" | "hub" | "stageSelect" | "battle";
export type PanelName = "inventory" | "shop" | "rewards" | "wallet" | null;

interface GameState {
  booted: boolean;
  screen: ScreenName;
  panel: PanelName;

  user: MeResponse | null;
  gold: string;
  stages: StageInfo[];
  items: InventoryItem[];
  pendingCount: number;
  pending: PendingReward[];
  shop: ShopTemplate[];

  activeStage: StageInfo | null;
  selectedCharacterId: string | null;
  selectedWeaponId: string | null;

  lastClaim: ClaimSummary | null;
  banner: { msg: string; kind: "info" | "error"; id: number } | null;

  boot(): Promise<void>;
  refresh(): Promise<void>;
  setScreen(s: ScreenName): void;
  setPanel(p: PanelName): void;

  login(email: string, password: string): Promise<string | null>;
  register(email: string, password: string, displayName: string): Promise<string | null>;
  logout(): void;

  chooseStage(stage: StageInfo): void;
  setCharacter(id: string): void;
  setWeapon(id: string | null): void;

  claim(): Promise<ClaimSummary | null>;
  buy(templateCode: string, quantity: number): Promise<boolean>;

  showBanner(msg: string, kind?: "info" | "error"): void;
  errText(e: unknown): string;
}

export const useGame = create<GameState>((set, get) => {
  let bannerSeq = 1;

  const pickDefaults = (items: InventoryItem[], curChar: string | null, curWeapon: string | null): { c: string | null; w: string | null } => {
    const chars = items.filter((i) => i.kind === "CHARACTER");
    const weapons = items.filter((i) => i.kind === "WEAPON");
    const c = curChar && chars.some((x) => x.id === curChar) ? curChar : chars[0]?.id ?? null;
    const w = curWeapon && weapons.some((x) => x.id === curWeapon) ? curWeapon : weapons[0]?.id ?? null;
    return { c, w };
  };

  return {
    booted: false,
    screen: "title",
    panel: null,

    user: null,
    gold: "0",
    stages: [],
    items: [],
    pendingCount: 0,
    pending: [],
    shop: [],

    activeStage: null,
    selectedCharacterId: null,
    selectedWeaponId: null,

    lastClaim: null,
    banner: null,

    // ---------- LSB บูต ---------- (ป้าย: LSB = ลำดับเริ่มต้น)
    async boot() {
      setMuted(isMuted());
      try {
        const u = await me();
        set({ user: u, gold: u.goldBalance, screen: "hub", booted: true });
        void get().refresh();
      } catch {
        set({ screen: "title", booted: true });
      }
    },

    async refresh() {
      try {
        const [u, st, inv, pend, shop] = await Promise.all([
          me(),
          apiStages().catch(() => []),
          apiInventory(),
          apiPending().catch(() => ({ pendingCount: 0, rewards: [] })),
          apiShop().catch(() => []),
        ]);
        const { c, w } = pickDefaults(inv.items, get().selectedCharacterId, get().selectedWeaponId);
        set({
          user: u,
          gold: u.goldBalance,
          stages: st,
          items: inv.items,
          pendingCount: pend.pendingCount,
          pending: pend.rewards,
          shop,
          selectedCharacterId: c,
          selectedWeaponId: w,
        });
      } catch (e) {
        if (e instanceof ApiFailure && e.status === 401) {
          set({ user: null, screen: "title" });
        }
      }
    },

    setScreen(s) {
      set({ screen: s, panel: null });
    },

    setPanel(p) {
      set({ panel: p });
    },

    async login(email, password) {
      try {
        await apiLogin(email, password);
        sfx("start");
        await get().refresh();
        if (!get().user) {
          const u = await me();
          set({ user: u, gold: u.goldBalance, screen: "hub", booted: true });
        }
        set({ screen: "hub" });
        void get().refresh();
        return null;
      } catch (e) {
        return get().errText(e);
      }
    },

    async register(email, password, displayName) {
      try {
        await apiRegister(email, password, displayName);
        sfx("start");
        set({ screen: "hub", booted: true });
        await get().refresh();
        const u = await me();
        set({ user: u, gold: u.goldBalance });
        get().showBanner("ยินดีต้อนรับนักผจญภัย! ออกสำรวจด่านแรกได้เลย ✦");
        return null;
      } catch (e) {
        return get().errText(e);
      }
    },

    logout() {
      apiLogout();
      sfx("ui");
      set({
        user: null,
        gold: "0",
        items: [],
        stages: [],
        pendingCount: 0,
        pending: [],
        lastClaim: null,
        activeStage: null,
        selectedCharacterId: null,
        selectedWeaponId: null,
        screen: "title",
        panel: null,
      });
    },

    chooseStage(stage) {
      sfx("start");
      set({ activeStage: stage, screen: "battle" });
    },

    setCharacter(id) {
      set({ selectedCharacterId: id });
    },
    setWeapon(id) {
      set({ selectedWeaponId: id });
    },

    async claim() {
      try {
        const s = await apiClaim();
        set({ lastClaim: s, pendingCount: 0 });
        const lvl = s.expResults.find((r) => r.levelUps > 0);
        if (lvl) {
          sfx("levelup");
          get().showBanner(`⭐ เลเวลอัป! ${lvl.characterName} Lv.${lvl.levelBefore} → Lv.${lvl.levelAfter}`);
        } else {
          sfx("buy");
          get().showBanner(`รับรางวัลแล้ว +${s.goldGranted} 🪙 (ทั้งหมด ${s.claimedCount} รายการ)`);
        }
        void get().refresh();
        return s;
      } catch (e) {
        get().showBanner(get().errText(e), "error");
        return null;
      }
    },

    async buy(templateCode, quantity) {
      try {
        const r = await apiPurchase(templateCode, quantity);
        set({ gold: r.goldBalance });
        sfx("buy");
        void get().refresh();
        get().showBanner(`ซื้อสำเร็จ −${r.goldSpent} 🪙`);
        return true;
      } catch (e) {
        get().showBanner(get().errText(e), "error");
        return false;
      }
    },

    showBanner(msg, kind = "info") {
      set({ banner: { msg, kind, id: bannerSeq++ } });
    },

    errText(e) {
      if (e instanceof ApiFailure) return e.message;
      if (e instanceof Error) return `เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ (${e.message})`;
      return "เกิดข้อผิดพลาดที่ไม่รู้จัก";
    },
  };
});

// type helpers ให้ component อื่น import type จากที่เดียว
export type { BattleView, ClaimSummary, InventoryItem, MeResponse, PendingReward, ShopTemplate, StageInfo };
