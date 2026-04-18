import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  rooms: defineTable({
    code: v.string(),
    adminPasswordHash: v.string(),
    creatorId: v.string(),
    playerCount: v.number(),
    createdAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_creator", ["creatorId"]),

  players: defineTable({
    roomId: v.id("rooms"),
    name: v.string(),
    balance: v.number(),
    isAdmin: v.boolean(),
    connectionId: v.string(),
    joinedAt: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_connection", ["connectionId"]),

  moneyRequests: defineTable({
    roomId: v.id("rooms"),
    playerId: v.id("players"),
    amount: v.number(),
    reason: v.string(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_room", ["roomId"])
    .index("by_room_status", ["roomId", "status"]),

  transactions: defineTable({
    roomId: v.id("rooms"),
    type: v.union(
      v.literal("manual_add"),
      v.literal("manual_remove"),
      v.literal("request_approved"),
      v.literal("request_rejected"),
      v.literal("player_joined"),
      v.literal("player_left"),
      v.literal("player_kicked"),
      v.literal("transfer"),
      v.literal("transfer_received")
    ),
    amount: v.optional(v.number()),
    targetPlayerId: v.optional(v.id("players")),
    performedBy: v.string(),
    description: v.string(),
    createdAt: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_room_time", ["roomId", "createdAt"]),
});
