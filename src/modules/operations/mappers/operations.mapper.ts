import type {
  ActivityView,
  GoalView,
  NotificationView,
  WishlistItemView,
} from "#/modules/operations/dtos/operations.dto.js";

export const mapOptionalMoney = (value: bigint | null): number | null => {
  if (value === null) return null;
  const number = Number(value);
  if (!Number.isSafeInteger(number))
    throw new Error("Persisted monetary value exceeds safe range.");
  return number;
};

export const mapActivity = (
  row: Omit<ActivityView, "archivedAt"> & {
    archivedAt: Date | null;
  },
): ActivityView => ({ ...row, archivedAt: row.archivedAt?.toISOString() ?? null });

export const mapGoal = (
  row: Omit<GoalView, "completedAt"> & {
    completedAt: Date | null;
  },
): GoalView => ({
  ...row,
  dueOn: row.dueOn ?? null,
  completedAt: row.completedAt?.toISOString() ?? null,
});

export const mapWishlistItem = (row: {
  publicId: string;
  name: string;
  url: string | null;
  estimatedPriceCents: bigint | null;
  currency: string;
  priority: number;
  reason: string | null;
  plannedOn: string | null;
  status: WishlistItemView["status"];
  actualPriceCents: bigint | null;
  purchasedOn: string | null;
  version: number;
}): WishlistItemView => ({
  id: row.publicId,
  name: row.name,
  url: row.url,
  estimatedPriceCents: mapOptionalMoney(row.estimatedPriceCents),
  currency: row.currency,
  priority: row.priority,
  reason: row.reason,
  plannedOn: row.plannedOn,
  status: row.status,
  actualPriceCents: mapOptionalMoney(row.actualPriceCents),
  purchasedOn: row.purchasedOn,
  version: row.version,
});

export const mapNotification = (
  row: Omit<NotificationView, "readAt" | "createdAt"> & {
    readAt: Date | null;
    createdAt: Date;
  },
): NotificationView => ({
  ...row,
  readAt: row.readAt?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
});
