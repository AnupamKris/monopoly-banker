import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

export const createRoom = mutation({
  args: {
    adminPassword: v.string(),
    creatorName: v.string(),
    creatorConnectionId: v.string(),
  },
  returns: v.object({
    roomId: v.string(),
    code: v.string(),
    playerId: v.string(),
  }),
  handler: async (ctx, args) => {
    let code = generateRoomCode();
    let existing = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    while (existing) {
      code = generateRoomCode();
      existing = await ctx.db
        .query("rooms")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();
    }

    const adminPasswordHash = await hashPassword(args.adminPassword);
    const roomId = await ctx.db.insert("rooms", {
      code,
      adminPasswordHash,
      creatorId: args.creatorConnectionId,
      playerCount: 1,
      createdAt: Date.now(),
    });

    const playerId = await ctx.db.insert("players", {
      roomId,
      name: args.creatorName,
      balance: 1500,
      isAdmin: true,
      connectionId: args.creatorConnectionId,
      joinedAt: Date.now(),
    });

    await ctx.db.insert("transactions", {
      roomId,
      type: "player_joined",
      performedBy: args.creatorName,
      description: `${args.creatorName} created the room`,
      createdAt: Date.now(),
    });

    return {
      roomId: roomId.toString(),
      code,
      playerId: playerId.toString(),
    };
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
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!room) {
      return { success: false, error: "Room not found" };
    }

    let isAdmin = false;
    if (args.adminPassword) {
      isAdmin = await verifyPassword(args.adminPassword, room.adminPasswordHash);
    }

    const existingPlayer = await ctx.db
      .query("players")
      .withIndex("by_connection", (q) => q.eq("connectionId", args.connectionId))
      .first();

    if (existingPlayer) {
      if (existingPlayer.roomId === room._id) {
        const nextIsAdmin = existingPlayer.isAdmin || isAdmin;
        const nameChanged = args.playerName && existingPlayer.name !== args.playerName;
        if (nameChanged || nextIsAdmin !== existingPlayer.isAdmin) {
          await ctx.db.patch(existingPlayer._id, {
            name: nameChanged ? args.playerName : existingPlayer.name,
            isAdmin: nextIsAdmin,
          });
        }
        return {
          success: true,
          roomId: room._id.toString(),
          isAdmin: nextIsAdmin,
          playerId: existingPlayer._id.toString(),
        };
      }

      const oldRoom = (await ctx.db.get(existingPlayer.roomId)) as any;
      if (oldRoom) {
        await ctx.db.patch(oldRoom._id, {
          playerCount: Math.max(0, oldRoom.playerCount - 1),
        });
        await ctx.db.insert("transactions", {
          roomId: oldRoom._id,
          type: "player_left",
          performedBy: existingPlayer.name,
          description: `${existingPlayer.name} left the room`,
          createdAt: Date.now(),
        });
      }
      await ctx.db.delete(existingPlayer._id);
    }

    const playerId = await ctx.db.insert("players", {
      roomId: room._id,
      name: args.playerName,
      balance: 1500,
      isAdmin,
      connectionId: args.connectionId,
      joinedAt: Date.now(),
    });

    await ctx.db.patch(room._id, { playerCount: room.playerCount + 1 });

    await ctx.db.insert("transactions", {
      roomId: room._id,
      type: "player_joined",
      performedBy: args.playerName,
      description: `${args.playerName} joined the room${isAdmin ? " as admin" : ""}`,
      createdAt: Date.now(),
    });

    return { success: true, roomId: room._id.toString(), isAdmin, playerId: playerId.toString() };
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
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!room) {
      return { success: false, error: "Room not found" };
    }

    const isPasswordValid = await verifyPassword(args.adminPassword, room.adminPasswordHash);
    if (!isPasswordValid) {
      return { success: false, error: "Invalid admin password" };
    }

    const existingPlayer = await ctx.db
      .query("players")
      .withIndex("by_connection", (q) => q.eq("connectionId", args.connectionId))
      .first();

    if (existingPlayer) {
      await ctx.db.patch(existingPlayer._id, { isAdmin: true });
      return { success: true, roomId: room._id.toString(), playerId: existingPlayer._id.toString() };
    }

    const newPlayerId = await ctx.db.insert("players", {
      roomId: room._id,
      name: "Admin",
      balance: 0,
      isAdmin: true,
      connectionId: args.connectionId,
      joinedAt: Date.now(),
    });

    await ctx.db.patch(room._id, { playerCount: room.playerCount + 1 });

    return { success: true, roomId: room._id.toString(), playerId: newPlayerId.toString() };
  },
});

export const leaveRoom = mutation({
  args: {
    playerId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId as any) as any;
    if (!player) return null;

    const room = await ctx.db.get(player.roomId) as any;
    if (room) {
      await ctx.db.patch(room._id, { playerCount: Math.max(0, room.playerCount - 1) });
    }

    await ctx.db.insert("transactions", {
      roomId: player.roomId,
      type: "player_left",
      performedBy: player.name,
      description: `${player.name} left the room`,
      createdAt: Date.now(),
    });

    await ctx.db.delete(args.playerId as any);
    return null;
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
    const room = await ctx.db.get(args.roomId as any) as any;
    if (!room) throw new Error("Room not found");
    return {
      roomId: room._id.toString(),
      code: room.code,
      playerCount: room.playerCount,
      createdAt: room.createdAt,
    };
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
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId as any))
      .collect();

    return players.map((p) => ({
      _id: p._id.toString(),
      name: p.name,
      balance: p.balance,
      isAdmin: p.isAdmin,
      joinedAt: p.joinedAt,
    }));
  },
});

export const manualBalanceChange = mutation({
  args: {
    playerId: v.string(),
    amount: v.number(),
    description: v.string(),
    performedByConnectionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const targetPlayer = await ctx.db.get(args.playerId as any) as any;
    if (!targetPlayer) throw new Error("Player not found");

    const performedByPlayer = await ctx.db
      .query("players")
      .withIndex("by_connection", (q) => q.eq("connectionId", args.performedByConnectionId))
      .first() as any;

    if (!performedByPlayer?.isAdmin) {
      throw new Error("Only admins can perform manual balance changes");
    }

    const newBalance = targetPlayer.balance + args.amount;
    if (newBalance < 0) {
      throw new Error("Balance cannot be negative");
    }

    await ctx.db.patch(targetPlayer._id, { balance: newBalance });

    const transactionType = args.amount >= 0 ? "manual_add" : "manual_remove";
    await ctx.db.insert("transactions", {
      roomId: targetPlayer.roomId,
      type: transactionType,
      amount: Math.abs(args.amount),
      targetPlayerId: targetPlayer._id,
      performedBy: performedByPlayer.name,
      description: args.description || (args.amount >= 0 ? `Added ${args.amount}` : `Removed ${Math.abs(args.amount)}`),
      createdAt: Date.now(),
    });

    return null;
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
    const player = await ctx.db.get(args.playerId as any) as any;
    if (!player) throw new Error("Player not found");

    const requestId = await ctx.db.insert("moneyRequests", {
      roomId: args.roomId as any,
      playerId: args.playerId as any,
      type: "money_request",
      amount: args.amount,
      reason: args.reason,
      status: "pending",
      createdAt: Date.now(),
    });

    return requestId.toString();
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
    const player = await ctx.db.get(args.playerId as any) as any;
    if (!player) throw new Error("Player not found");

    const connectionPlayer = await ctx.db
      .query("players")
      .withIndex("by_connection", (q) => q.eq("connectionId", args.connectionId))
      .first() as any;

    if (!connectionPlayer || connectionPlayer._id !== player._id) {
      throw new Error("You can only request money to your own account");
    }

    if (args.amount <= 0) {
      throw new Error("Amount must be positive");
    }

    const requestId = await ctx.db.insert("moneyRequests", {
      roomId: player.roomId,
      playerId: player._id,
      type: "bank_request",
      amount: args.amount,
      reason: args.reason,
      status: "pending",
      createdAt: Date.now(),
    });

    return requestId.toString();
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
    const requests = await ctx.db
      .query("moneyRequests")
      .withIndex("by_room_status", (q) =>
        q.eq("roomId", args.roomId as any).eq("status", "pending")
      )
      .collect() as any[];

    const result = [];
    for (const req of requests) {
      const player = await ctx.db.get(req.playerId) as any;
      result.push({
        _id: req._id.toString(),
        type: req.type,
        playerId: req.playerId.toString(),
        playerName: player?.name || "Unknown",
        amount: req.amount,
        reason: req.reason,
        status: req.status,
        createdAt: req.createdAt,
      });
    }

    return result;
  },
});

export const approveRequest = mutation({
  args: {
    requestId: v.string(),
    performedByConnectionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const performedByPlayer = await ctx.db
      .query("players")
      .withIndex("by_connection", (q) => q.eq("connectionId", args.performedByConnectionId))
      .first() as any;

    if (!performedByPlayer?.isAdmin) {
      throw new Error("Only admins can approve requests");
    }

    const request = await ctx.db.get(args.requestId as any) as any;
    if (!request) throw new Error("Request not found");

    const player = await ctx.db.get(request.playerId) as any;
    if (!player) throw new Error("Player not found");

    await ctx.db.patch(player._id, { balance: player.balance + request.amount });
    await ctx.db.patch(args.requestId as any, {
      status: "approved",
      resolvedAt: Date.now(),
    });

    const txType = request.type === "bank_request" ? "bank_withdrawal" : "request_approved";
    await ctx.db.insert("transactions", {
      roomId: player.roomId,
      type: txType,
      amount: request.amount,
      targetPlayerId: player._id,
      performedBy: performedByPlayer.name,
      description: request.type === "bank_request"
        ? `Approved bank withdrawal request: ${request.reason}`
        : `Approved request: ${request.reason}`,
      createdAt: Date.now(),
    });

    return null;
  },
});

export const rejectRequest = mutation({
  args: {
    requestId: v.string(),
    performedByConnectionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const performedByPlayer = await ctx.db
      .query("players")
      .withIndex("by_connection", (q) => q.eq("connectionId", args.performedByConnectionId))
      .first() as any;

    if (!performedByPlayer?.isAdmin) {
      throw new Error("Only admins can reject requests");
    }

    const request = await ctx.db.get(args.requestId as any) as any;
    if (!request) throw new Error("Request not found");

    await ctx.db.patch(args.requestId as any, {
      status: "rejected",
      resolvedAt: Date.now(),
    });

    await ctx.db.insert("transactions", {
      roomId: request.roomId,
      type: "request_rejected",
      amount: request.amount,
      targetPlayerId: request.playerId,
      performedBy: performedByPlayer.name,
      description: `Rejected request: ${request.reason}`,
      createdAt: Date.now(),
    });

    return null;
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
    let query_ = ctx.db
      .query("transactions")
      .withIndex("by_room_time", (q) => q.eq("roomId", args.roomId as any))
      .order("desc");

    const transactions = await query_.take(args.limit || 50);

    return transactions.map((t) => ({
      _id: t._id.toString(),
      type: t.type,
      amount: t.amount,
      targetPlayerId: t.targetPlayerId?.toString(),
      performedBy: t.performedBy,
      description: t.description,
      createdAt: t.createdAt,
    }));
  },
});

export const kickPlayer = mutation({
  args: {
    playerId: v.string(),
    performedByConnectionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const target = (await ctx.db.get(args.playerId as any)) as any;
    if (!target) return null;

    const performedBy = (await ctx.db
      .query("players")
      .withIndex("by_connection", (q) => q.eq("connectionId", args.performedByConnectionId))
      .first()) as any;

    if (!performedBy?.isAdmin) {
      throw new Error("Only admins can kick players");
    }

    if (performedBy._id === target._id) {
      throw new Error("You cannot kick yourself");
    }

    if (performedBy.roomId !== target.roomId) {
      throw new Error("Cannot kick a player from a different room");
    }

    const room = (await ctx.db.get(target.roomId)) as any;
    if (room) {
      await ctx.db.patch(room._id, { playerCount: Math.max(0, room.playerCount - 1) });
    }

    await ctx.db.insert("transactions", {
      roomId: target.roomId,
      type: "player_kicked",
      targetPlayerId: target._id,
      performedBy: performedBy.name,
      description: `${performedBy.name} kicked ${target.name}`,
      createdAt: Date.now(),
    });

    await ctx.db.delete(target._id);
    return null;
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
    const player = (await ctx.db.get(args.playerId as any)) as any;
    if (!player) return { valid: false };
    if (player.connectionId !== args.connectionId) return { valid: false };
    if (player.roomId.toString() !== args.roomId) return { valid: false };

    const room = (await ctx.db.get(player.roomId)) as any;
    if (!room) return { valid: false };

    return {
      valid: true,
      isAdmin: player.isAdmin,
      name: player.name,
      code: room.code,
    };
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
    const sender = await ctx.db.get(args.senderId as any) as any;
    if (!sender) throw new Error("Sender not found");

    const recipient = await ctx.db.get(args.recipientId as any) as any;
    if (!recipient) throw new Error("Recipient not found");

    if (sender.balance < args.amount) {
      throw new Error("Insufficient balance");
    }

    const connectionPlayer = await ctx.db
      .query("players")
      .withIndex("by_connection", (q) => q.eq("connectionId", args.connectionId))
      .first() as any;

    if (!connectionPlayer || connectionPlayer._id !== sender._id) {
      throw new Error("You can only transfer from your own account");
    }

    await ctx.db.patch(sender._id, { balance: sender.balance - args.amount });
    await ctx.db.patch(recipient._id, { balance: recipient.balance + args.amount });

    await ctx.db.insert("transactions", {
      roomId: sender.roomId,
      type: "transfer",
      amount: args.amount,
      targetPlayerId: recipient._id,
      performedBy: sender.name,
      description: `Transfer to ${recipient.name}: ${args.reason || "No reason"}`,
      createdAt: Date.now(),
    });

    await ctx.db.insert("transactions", {
      roomId: sender.roomId,
      type: "transfer_received",
      amount: args.amount,
      targetPlayerId: sender._id,
      performedBy: recipient.name,
      description: `Received from ${sender.name}: ${args.reason || "No reason"}`,
      createdAt: Date.now(),
    });

    return null;
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
    const player = await ctx.db.get(args.playerId as any) as any;
    if (!player) throw new Error("Player not found");

    const connectionPlayer = await ctx.db
      .query("players")
      .withIndex("by_connection", (q) => q.eq("connectionId", args.connectionId))
      .first() as any;

    if (!connectionPlayer || connectionPlayer._id !== player._id) {
      throw new Error("You can only send money from your own account");
    }

    if (player.balance < args.amount) {
      throw new Error("Insufficient balance");
    }

    if (args.amount <= 0) {
      throw new Error("Amount must be positive");
    }

    await ctx.db.patch(player._id, { balance: player.balance - args.amount });

    await ctx.db.insert("transactions", {
      roomId: player.roomId,
      type: "bank_deposit",
      amount: args.amount,
      targetPlayerId: player._id,
      performedBy: player.name,
      description: `Deposited to bank: ${args.reason || "No reason"}`,
      createdAt: Date.now(),
    });

    return null;
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
    const performedBy = await ctx.db
      .query("players")
      .withIndex("by_connection", (q) => q.eq("connectionId", args.connectionId))
      .first() as any;

    if (!performedBy?.isAdmin) {
      throw new Error("Only admins can withdraw from the bank");
    }

    const player = await ctx.db.get(args.playerId as any) as any;
    if (!player) throw new Error("Player not found");

    if (args.amount <= 0) {
      throw new Error("Amount must be positive");
    }

    await ctx.db.patch(player._id, { balance: player.balance + args.amount });

    await ctx.db.insert("transactions", {
      roomId: player.roomId,
      type: "bank_withdrawal",
      amount: args.amount,
      targetPlayerId: player._id,
      performedBy: performedBy.name,
      description: `Admin withdrew from bank to give to ${player.name}: ${args.reason || "No reason"}`,
      createdAt: Date.now(),
    });

    return null;
  },
});
