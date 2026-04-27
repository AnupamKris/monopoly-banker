import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { components } from "./_generated/api.js";

export const createRoom = mutation({
  args: {
    adminPassword: v.string(),
    creatorName: v.string(),
    connectionId: v.string(),
  },
  returns: v.object({
    roomId: v.string(),
    code: v.string(),
    playerId: v.string(),
  }),
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.monopolyBanker.lib.createRoom, {
      adminPassword: args.adminPassword,
      creatorName: args.creatorName,
      creatorConnectionId: args.connectionId,
    });
  },
});

export const joinRoom = mutation({
  args: {
    code: v.string(),
    playerName: v.string(),
    connectionId: v.string(),
    adminPassword: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    roomId: v.optional(v.string()),
    isAdmin: v.optional(v.boolean()),
    playerId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.monopolyBanker.lib.joinRoom, {
      code: args.code,
      playerName: args.playerName,
      connectionId: args.connectionId,
      adminPassword: args.adminPassword,
    });
  },
});

export const rejoinAsAdmin = mutation({
  args: {
    code: v.string(),
    adminPassword: v.string(),
    connectionId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    roomId: v.optional(v.string()),
    playerId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.monopolyBanker.lib.rejoinAsAdmin, {
      code: args.code,
      adminPassword: args.adminPassword,
      connectionId: args.connectionId,
    });
  },
});

export const leaveRoom = mutation({
  args: {
    playerId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.monopolyBanker.lib.leaveRoom, {
      playerId: args.playerId,
    });
  },
});

export const getRoomInfo = query({
  args: {
    roomId: v.string(),
  },
  returns: v.object({
    roomId: v.string(),
    code: v.string(),
    playerCount: v.number(),
    createdAt: v.number(),
  }),
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.monopolyBanker.lib.getRoomInfo, {
      roomId: args.roomId,
    });
  },
});

export const getPlayers = query({
  args: {
    roomId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.string(),
      name: v.string(),
      balance: v.number(),
      isAdmin: v.boolean(),
      joinedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.monopolyBanker.lib.getPlayers, {
      roomId: args.roomId,
    });
  },
});

export const manualBalanceChange = mutation({
  args: {
    playerId: v.string(),
    amount: v.number(),
    description: v.string(),
    connectionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.monopolyBanker.lib.manualBalanceChange, {
      playerId: args.playerId,
      amount: args.amount,
      description: args.description,
      performedByConnectionId: args.connectionId,
    });
  },
});

export const createMoneyRequest = mutation({
  args: {
    roomId: v.string(),
    playerId: v.string(),
    amount: v.number(),
    reason: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.monopolyBanker.lib.createMoneyRequest, {
      roomId: args.roomId,
      playerId: args.playerId,
      amount: args.amount,
      reason: args.reason,
    });
  },
});

export const getPendingRequests = query({
  args: {
    roomId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.string(),
      type: v.string(),
      playerId: v.string(),
      playerName: v.string(),
      amount: v.number(),
      reason: v.string(),
      status: v.string(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.monopolyBanker.lib.getPendingRequests, {
      roomId: args.roomId,
    });
  },
});

export const approveRequest = mutation({
  args: {
    requestId: v.string(),
    connectionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.monopolyBanker.lib.approveRequest, {
      requestId: args.requestId,
      performedByConnectionId: args.connectionId,
    });
  },
});

export const rejectRequest = mutation({
  args: {
    requestId: v.string(),
    connectionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.monopolyBanker.lib.rejectRequest, {
      requestId: args.requestId,
      performedByConnectionId: args.connectionId,
    });
  },
});

export const getTransactionLog = query({
  args: {
    roomId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.string(),
      type: v.string(),
      amount: v.optional(v.number()),
      targetPlayerId: v.optional(v.string()),
      performedBy: v.string(),
      description: v.string(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.monopolyBanker.lib.getTransactionLog, {
      roomId: args.roomId,
      limit: args.limit,
    });
  },
});

export const kickPlayer = mutation({
  args: {
    playerId: v.string(),
    connectionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.monopolyBanker.lib.kickPlayer, {
      playerId: args.playerId,
      performedByConnectionId: args.connectionId,
    });
  },
});

export const validateSession = query({
  args: {
    roomId: v.string(),
    playerId: v.string(),
    connectionId: v.string(),
  },
  returns: v.object({
    valid: v.boolean(),
    isAdmin: v.optional(v.boolean()),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.monopolyBanker.lib.validateSession, {
      roomId: args.roomId,
      playerId: args.playerId,
      connectionId: args.connectionId,
    });
  },
});

export const transfer = mutation({
  args: {
    senderId: v.string(),
    recipientId: v.string(),
    amount: v.number(),
    reason: v.string(),
    connectionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.monopolyBanker.lib.transfer, {
      senderId: args.senderId,
      recipientId: args.recipientId,
      amount: args.amount,
      reason: args.reason,
      connectionId: args.connectionId,
    });
  },
});

export const sendToBank = mutation({
  args: {
    playerId: v.string(),
    amount: v.number(),
    reason: v.string(),
    connectionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.monopolyBanker.lib.sendToBank, {
      playerId: args.playerId,
      amount: args.amount,
      reason: args.reason,
      connectionId: args.connectionId,
    });
  },
});

export const requestFromBank = mutation({
  args: {
    playerId: v.string(),
    amount: v.number(),
    reason: v.string(),
    connectionId: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.monopolyBanker.lib.requestFromBank, {
      playerId: args.playerId,
      amount: args.amount,
      reason: args.reason,
      connectionId: args.connectionId,
    });
  },
});

export const adminBankWithdraw = mutation({
  args: {
    playerId: v.string(),
    amount: v.number(),
    reason: v.string(),
    connectionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.monopolyBanker.lib.adminBankWithdraw, {
      playerId: args.playerId,
      amount: args.amount,
      reason: args.reason,
      connectionId: args.connectionId,
    });
  },
});
