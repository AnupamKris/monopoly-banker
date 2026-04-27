/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    lib: {
      adminBankWithdraw: FunctionReference<
        "mutation",
        "internal",
        {
          amount: number;
          connectionId: string;
          playerId: string;
          reason: string;
        },
        null,
        Name
      >;
      approveRequest: FunctionReference<
        "mutation",
        "internal",
        { performedByConnectionId: string; requestId: string },
        null,
        Name
      >;
      createMoneyRequest: FunctionReference<
        "mutation",
        "internal",
        { amount: number; playerId: string; reason: string; roomId: string },
        string,
        Name
      >;
      createRoom: FunctionReference<
        "mutation",
        "internal",
        {
          adminPassword: string;
          creatorConnectionId: string;
          creatorName: string;
        },
        { code: string; playerId: string; roomId: string },
        Name
      >;
      getPendingRequests: FunctionReference<
        "query",
        "internal",
        { roomId: string },
        Array<{
          _id: string;
          amount: number;
          createdAt: number;
          playerId: string;
          playerName: string;
          reason: string;
          status: string;
          type: string;
        }>,
        Name
      >;
      getPlayers: FunctionReference<
        "query",
        "internal",
        { roomId: string },
        Array<{
          _id: string;
          balance: number;
          isAdmin: boolean;
          joinedAt: number;
          name: string;
        }>,
        Name
      >;
      getRoomInfo: FunctionReference<
        "query",
        "internal",
        { roomId: string },
        {
          code: string;
          createdAt: number;
          playerCount: number;
          roomId: string;
        },
        Name
      >;
      getTransactionLog: FunctionReference<
        "query",
        "internal",
        { limit?: number; roomId: string },
        Array<{
          _id: string;
          amount?: number;
          createdAt: number;
          description: string;
          performedBy: string;
          targetPlayerId?: string;
          type: string;
        }>,
        Name
      >;
      joinRoom: FunctionReference<
        "mutation",
        "internal",
        {
          adminPassword?: string;
          code: string;
          connectionId: string;
          playerName: string;
        },
        {
          error?: string;
          isAdmin?: boolean;
          playerId?: string;
          roomId?: string;
          success: boolean;
        },
        Name
      >;
      kickPlayer: FunctionReference<
        "mutation",
        "internal",
        { performedByConnectionId: string; playerId: string },
        null,
        Name
      >;
      leaveRoom: FunctionReference<
        "mutation",
        "internal",
        { playerId: string },
        null,
        Name
      >;
      manualBalanceChange: FunctionReference<
        "mutation",
        "internal",
        {
          amount: number;
          description: string;
          performedByConnectionId: string;
          playerId: string;
        },
        null,
        Name
      >;
      rejectRequest: FunctionReference<
        "mutation",
        "internal",
        { performedByConnectionId: string; requestId: string },
        null,
        Name
      >;
      rejoinAsAdmin: FunctionReference<
        "mutation",
        "internal",
        { adminPassword: string; code: string; connectionId: string },
        {
          error?: string;
          playerId?: string;
          roomId?: string;
          success: boolean;
        },
        Name
      >;
      requestFromBank: FunctionReference<
        "mutation",
        "internal",
        {
          amount: number;
          connectionId: string;
          playerId: string;
          reason: string;
        },
        string,
        Name
      >;
      sendToBank: FunctionReference<
        "mutation",
        "internal",
        {
          amount: number;
          connectionId: string;
          playerId: string;
          reason: string;
        },
        null,
        Name
      >;
      transfer: FunctionReference<
        "mutation",
        "internal",
        {
          amount: number;
          connectionId: string;
          reason: string;
          recipientId: string;
          senderId: string;
        },
        null,
        Name
      >;
      validateSession: FunctionReference<
        "query",
        "internal",
        { connectionId: string; playerId: string; roomId: string },
        { code?: string; isAdmin?: boolean; name?: string; valid: boolean },
        Name
      >;
    };
  };
