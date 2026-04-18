### Component Structure
- convex/components/monopolyBanker/convex.config.ts - Component definition
- convex/components/monopolyBanker/schema.ts - Database schema with 4 tables
- convex/components/monopolyBanker/lib.ts - All business logic functions
### App Wiring
- convex/convex.config.ts - App config with component registered
- convex/monopolyBanker.ts - App wrapper functions for client access
## Database Schema
Table Purpose rooms Stores room info (6-char code, hashed admin password, player count) players Players in rooms (name, balance, isAdmin, connectionId) moneyRequests Pending money requests from players transactions Full audit log of all operations

## Available Functions
Room Management:

- createRoom - Create room with admin password, returns 6-char code
- joinRoom - Join with code + optional admin password for admin access
- rejoinAsAdmin - Rejoin with code + admin password to regain admin privileges
- leaveRoom - Leave the room
- getRoomInfo - Get room details and player count
Player Operations:

- getPlayers - List all players in a room
- manualBalanceChange - Admin adds/removes money (logged)
Money Requests:

- createMoneyRequest - Player submits money request
- getPendingRequests - Admin views pending requests
- approveRequest - Admin approves (adds money)
- rejectRequest - Admin rejects request
Audit:

- getTransactionLog - Full transaction history for a room
## Key Features
- Admin password is SHA-256 hashed for security
- 6-character codes exclude confusing chars (0, O, I, 1) to avoid ambiguity
- Transaction log tracks all operations (joins, leaves, manual changes, approvals)
- Player count is maintained on room for quick access
To use from your frontend, call the functions via api.monopolyBanker.* (e.g., api.monopolyBanker.createRoom ).