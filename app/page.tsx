"use client";

import { useState, useEffect, useRef, useMemo, type ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { UsersIcon, HouseLineIcon, UserCircleIcon, ArrowRightIcon, CopyIcon, CheckIcon, SignOutIcon, WalletIcon, ArrowsLeftRightIcon, ShieldIcon, ClockIcon, UserPlusIcon, MinusCircleIcon, PlusCircleIcon, BackspaceIcon, PaperPlaneTiltIcon, UserMinusIcon } from "@phosphor-icons/react";

const CURRENT_ROOM_KEY = "monopolyCurrentRoom";

interface StoredSession {
  roomId: string;
  playerId: string;
  isAdmin: boolean;
  code: string;
  name: string;
}

interface Player {
  _id: string;
  name: string;
  balance: number;
  isAdmin: boolean;
  joinedAt: number;
}

interface RoomHistory {
  roomId: string;
  code: string;
  name: string;
  lastVisited: number;
}

interface Transaction {
  _id: string;
  type: string;
  amount?: number;
  targetPlayerId?: string;
  performedBy: string;
  description: string;
  createdAt: number;
}

interface MoneyRequest {
  _id: string;
  playerId: string;
  playerName: string;
  amount: number;
  reason: string;
  status: string;
  createdAt: number;
}

function generateConnectionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export default function MonopolyBankerApp() {
  const [connectionId, setConnectionId] = useState<string>("");
  const [playerName, setPlayerName] = useState<string>("");
  const [roomHistory, setRoomHistory] = useState<RoomHistory[]>([]);
  const [currentRoom, setCurrentRoom] = useState<StoredSession | null>(null);
  const [showGamePage, setShowGamePage] = useState(false);
  const [pendingSession, setPendingSession] = useState<StoredSession | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    let connId = localStorage.getItem("monopolyConnectionId");
    if (!connId) {
      connId = generateConnectionId();
      localStorage.setItem("monopolyConnectionId", connId);
    }
    setConnectionId(connId);

    const savedName = localStorage.getItem("monopolyPlayerName") || "";
    setPlayerName(savedName);

    const history = JSON.parse(localStorage.getItem("monopolyRoomHistory") || "[]");
    setRoomHistory(history);

    try {
      const raw = localStorage.getItem(CURRENT_ROOM_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as StoredSession;
        if (saved?.roomId && saved?.playerId) {
          setPendingSession(saved);
          return;
        }
      }
    } catch {}
    setBootstrapped(true);
  }, []);

  const validation = useQuery(
    api.monopolyBanker.validateSession,
    pendingSession && connectionId
      ? { roomId: pendingSession.roomId, playerId: pendingSession.playerId, connectionId }
      : "skip"
  );

  useEffect(() => {
    if (!pendingSession || validation === undefined) return;
    if (validation.valid) {
      setCurrentRoom({
        roomId: pendingSession.roomId,
        playerId: pendingSession.playerId,
        isAdmin: validation.isAdmin ?? pendingSession.isAdmin,
        code: validation.code ?? pendingSession.code,
        name: validation.name ?? pendingSession.name,
      });
      setShowGamePage(true);
    } else {
      localStorage.removeItem(CURRENT_ROOM_KEY);
    }
    setPendingSession(null);
    setBootstrapped(true);
  }, [validation, pendingSession]);

  const saveName = (name: string) => {
    setPlayerName(name);
    localStorage.setItem("monopolyPlayerName", name);
  };

  const addToRoomHistory = (roomId: string, code: string, name: string) => {
    const history = roomHistory.filter(r => r.roomId !== roomId);
    history.unshift({ roomId, code, name, lastVisited: Date.now() });
    const trimmed = history.slice(0, 10);
    setRoomHistory(trimmed);
    localStorage.setItem("monopolyRoomHistory", JSON.stringify(trimmed));
  };

  const removeFromHistory = (roomId: string) => {
    const history = roomHistory.filter(r => r.roomId !== roomId);
    setRoomHistory(history);
    localStorage.setItem("monopolyRoomHistory", JSON.stringify(history));
  };

  const enterRoom = (roomId: string, playerId: string, isAdmin: boolean, code: string, name: string) => {
    const session: StoredSession = { roomId, playerId, isAdmin, code, name };
    setCurrentRoom(session);
    addToRoomHistory(roomId, code, name);
    localStorage.setItem(CURRENT_ROOM_KEY, JSON.stringify(session));
    setShowGamePage(true);
  };

  const handleLeave = (opts?: { kicked?: boolean }) => {
    localStorage.removeItem(CURRENT_ROOM_KEY);
    setCurrentRoom(null);
    setShowGamePage(false);
    if (opts?.kicked) {
      setTimeout(() => alert("You have been removed from the room by an admin."), 50);
    }
  };

  if (!bootstrapped) {
    return (
      <div className="min-h-svh flex items-center justify-center">
        <p className="text-xs text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (showGamePage && currentRoom) {
    return <GamePage roomId={currentRoom.roomId} playerId={currentRoom.playerId} isAdmin={currentRoom.isAdmin} connectionId={connectionId} onLeave={handleLeave} />;
  }

  return (
    <div className="min-h-svh p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-heading font-medium">Monopoly Banker</h1>
          <p className="text-xs text-muted-foreground">Manage your game finances</p>
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="profile" className="gap-2">
              <UserCircleIcon weight="duotone" /> Profile
            </TabsTrigger>
            <TabsTrigger value="create" className="gap-2">
              <UserPlusIcon weight="duotone" /> Create Room
            </TabsTrigger>
            <TabsTrigger value="join" className="gap-2">
              <ArrowRightIcon weight="duotone" /> Join Room
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <ProfileTab playerName={playerName} onSaveName={saveName} roomHistory={roomHistory} onRemoveHistory={removeFromHistory} />
          </TabsContent>

          <TabsContent value="create">
            <CreateRoomTab playerName={playerName} connectionId={connectionId} onRoomCreated={(roomId, playerId, isAdmin, code, name) => enterRoom(roomId, playerId, isAdmin, code, name)} />
          </TabsContent>

          <TabsContent value="join">
            <JoinRoomTab playerName={playerName} connectionId={connectionId} onRoomJoined={(roomId, playerId, isAdmin, code, name) => enterRoom(roomId, playerId, isAdmin, code, name)} roomHistory={roomHistory} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ProfileTab({ playerName, onSaveName, roomHistory, onRemoveHistory }: { playerName: string; onSaveName: (name: string) => void; roomHistory: RoomHistory[]; onRemoveHistory: (roomId: string) => void }) {
  const [name, setName] = useState(playerName);
  const [editing, setEditing] = useState(false);

  const handleSave = () => {
    if (name.trim()) {
      onSaveName(name.trim());
      setEditing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCircleIcon weight="duotone" /> Your Profile
        </CardTitle>
        <CardDescription>Set your display name for game sessions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {editing ? (
          <div className="space-y-3">
            <Input placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSave()} autoFocus />
            <div className="flex gap-2">
              <Button onClick={handleSave} size="sm">Save</Button>
              <Button variant="ghost" size="sm" onClick={() => { setName(playerName); setEditing(false); }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Display Name</p>
                <p className="font-medium">{playerName || "Not set"}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
            </div>
          </div>
        )}

        {roomHistory.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h3 className="text-xs font-medium flex items-center gap-2">
              <ClockIcon weight="duotone" /> Recent Rooms
            </h3>
            <div className="space-y-2">
              {roomHistory.map((room) => (
                <div key={room.roomId} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div>
                    <p className="font-medium">{room.code}</p>
                    <p className="text-xs text-muted-foreground">{room.name}</p>
                  </div>
                  <Button variant="ghost" size="icon-xs" onClick={() => onRemoveHistory(room.roomId)}>
                    <span className="sr-only">Remove</span>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CreateRoomTab({ playerName, connectionId, onRoomCreated }: { playerName: string; connectionId: string; onRoomCreated: (roomId: string, playerId: string, isAdmin: boolean, code: string, name: string) => void }) {
  const [name, setName] = useState(playerName);
  const [adminPassword, setAdminPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createdCode, setCreatedCode] = useState("");
  const [pendingRoom, setPendingRoom] = useState<{ roomId: string; playerId: string; code: string; name: string } | null>(null);

  const createRoom = useMutation(api.monopolyBanker.createRoom);

  const handleCreate = async () => {
    if (!name.trim()) { setError("Please enter your name"); return; }
    if (!adminPassword) { setError("Please enter an admin password"); return; }
    if (adminPassword !== confirmPassword) { setError("Passwords do not match"); return; }
    if (adminPassword.length < 4) { setError("Password must be at least 4 characters"); return; }

    setError("");
    setLoading(true);

    try {
      const result = await createRoom({ adminPassword, creatorName: name, connectionId });
      setCreatedCode(result.code);
      setPendingRoom({ roomId: result.roomId, playerId: result.playerId, code: result.code, name });
      setDialogOpen(true);
    } catch (e: any) {
      setError(e.message || "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  const handleEnterRoom = () => {
    if (!pendingRoom) return;
    setDialogOpen(false);
    onRoomCreated(pendingRoom.roomId, pendingRoom.playerId, true, pendingRoom.code, pendingRoom.name);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HouseLineIcon weight="duotone" /> Create Room
        </CardTitle>
        <CardDescription>Create a new game room and become the admin</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Your Name</p>
          <Input placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Admin Password</p>
          <Input type="password" placeholder="Create admin password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Confirm Password</p>
          <Input type="password" placeholder="Confirm admin password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button onClick={handleCreate} disabled={loading} className="w-full">
          {loading ? "Creating..." : "Create Room"}
        </Button>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) handleEnterRoom(); else setDialogOpen(true); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Room Created!</DialogTitle>
            <DialogDescription>Share this code with other players</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-4">
            <div className="text-4xl font-mono font-bold tracking-wider">{createdCode}</div>
          </div>
          <DialogFooter>
            <Button onClick={handleEnterRoom} className="w-full">Enter Room</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function JoinRoomTab({ playerName, connectionId, onRoomJoined, roomHistory }: { playerName: string; connectionId: string; onRoomJoined: (roomId: string, playerId: string, isAdmin: boolean, code: string, name: string) => void; roomHistory: RoomHistory[] }) {
  const [tab, setTab] = useState<"code" | "admin">("code");
  const [code, setCode] = useState("");
  const [name, setName] = useState(playerName);
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const joinRoom = useMutation(api.monopolyBanker.joinRoom);

  const handleJoin = async () => {
    if (!name.trim()) { setError("Please enter your name"); return; }
    if (!code.trim() || code.length !== 6) { setError("Please enter a valid 6-character code"); return; }

    setError("");
    setLoading(true);

    try {
      const result = await joinRoom({ code: code.toUpperCase(), playerName: name, connectionId, adminPassword: undefined });
      if (result.success && result.roomId) {
        onRoomJoined(result.roomId, result.playerId || "", result.isAdmin || false, code.toUpperCase(), name);
      } else {
        setError(result.error || "Failed to join room");
      }
    } catch (e: any) {
      setError(e.message || "Failed to join room");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminJoin = async () => {
    if (!adminPassword) { setError("Please enter the admin password"); return; }
    if (!code.trim() || code.length !== 6) { setError("Please enter a valid 6-character code"); return; }

    setError("");
    setLoading(true);

    try {
      const result = await joinRoom({ code: code.toUpperCase(), playerName: name || "Admin", connectionId, adminPassword });
      if (result.success && result.roomId) {
        onRoomJoined(result.roomId, result.playerId || "", true, code.toUpperCase(), name || "Admin");
      } else {
        setError(result.error || "Failed to join as admin");
      }
    } catch (e: any) {
      setError(e.message || "Failed to join as admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersIcon weight="duotone" /> Join Room
        </CardTitle>
        <CardDescription>Enter a room code to join the game</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "code" | "admin")}>
          <TabsList className="w-full">
            <TabsTrigger value="code" className="flex-1">Join as Player</TabsTrigger>
            <TabsTrigger value="admin" className="flex-1">Join as Admin</TabsTrigger>
          </TabsList>

          <TabsContent value="code" className="space-y-4 pt-4">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Your Name</p>
              <Input placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Room Code</p>
              <Input placeholder="Enter 6-character code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} className="text-center font-mono tracking-widest" />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button onClick={handleJoin} disabled={loading} className="w-full">
              {loading ? "Joining..." : "Join Room"}
            </Button>
          </TabsContent>

          <TabsContent value="admin" className="space-y-4 pt-4">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Room Code</p>
              <Input placeholder="Enter 6-character code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} className="text-center font-mono tracking-widest" />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Admin Password</p>
              <Input type="password" placeholder="Enter admin password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button onClick={handleAdminJoin} disabled={loading} className="w-full">
              {loading ? "Joining..." : "Login as Admin"}
            </Button>
          </TabsContent>
        </Tabs>

        {roomHistory.length > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <h3 className="text-xs font-medium text-muted-foreground">Quick Join from History</h3>
            <div className="space-y-1">
              {roomHistory.map((room) => (
                <Button key={room.roomId} variant="ghost" className="w-full justify-between" onClick={() => { setCode(room.code); }}>
                  <span className="font-mono">{room.code}</span>
                  <span className="text-xs text-muted-foreground">{room.name}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GamePage({ roomId, playerId, isAdmin, connectionId, onLeave }: { roomId: string; playerId: string; isAdmin: boolean; connectionId: string; onLeave: (opts?: { kicked?: boolean }) => void }) {
  const [activeTab, setActiveTab] = useState<string>("balance");
  const players = useQuery(api.monopolyBanker.getPlayers, { roomId }) as Player[] | undefined;
  const leaveRoomMutation = useMutation(api.monopolyBanker.leaveRoom);
  const leftRef = useRef(false);

  useEffect(() => {
    if (players === undefined) return;
    if (leftRef.current) return;
    const stillHere = players.some((p) => p._id === playerId);
    if (!stillHere) {
      leftRef.current = true;
      onLeave({ kicked: true });
    }
  }, [players, playerId, onLeave]);

  const handleSignOut = async () => {
    if (leftRef.current) return;
    leftRef.current = true;
    try {
      await leaveRoomMutation({ playerId });
    } catch {}
    onLeave();
  };

  return (
    <div className="min-h-svh flex flex-col">
      <header className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <SignOutIcon weight="bold" />
            <span className="sr-only">Leave Room</span>
          </Button>
          <div>
            <h1 className="font-heading font-medium">Monopoly Banker</h1>
            <p className="text-xs text-muted-foreground">Room: {roomId.slice(0, 8)}...</p>
          </div>
        </div>
      </header>

      <div className="flex-1 p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="balance" className="flex-1 gap-2">
              <WalletIcon weight="duotone" /> Balance
            </TabsTrigger>
            <TabsTrigger value="transfer" className="flex-1 gap-2">
              <ArrowsLeftRightIcon weight="duotone" /> Transfer
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="admin" className="flex-1 gap-2">
                <ShieldIcon weight="duotone" /> Admin
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="balance" className="pt-4">
            <BalanceTab roomId={roomId} playerId={playerId} connectionId={connectionId} isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="transfer" className="pt-4">
            <TransferTab roomId={roomId} playerId={playerId} connectionId={connectionId} />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="admin" className="pt-4">
              <AdminTab roomId={roomId} connectionId={connectionId} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

function BalanceTab({ roomId, playerId, connectionId, isAdmin }: { roomId: string; playerId: string; connectionId: string; isAdmin: boolean }) {
  const players = useQuery(api.monopolyBanker.getPlayers, { roomId }) as Player[] | undefined;
  const kickPlayer = useMutation(api.monopolyBanker.kickPlayer);
  const [kicking, setKicking] = useState<string | null>(null);
  const currentPlayer = players?.find(p => p._id === playerId);

  const handleKick = async (player: Player) => {
    if (!confirm(`Kick ${player.name} from the room? This will remove them immediately.`)) return;
    setKicking(player._id);
    try {
      await kickPlayer({ playerId: player._id, connectionId });
    } catch (e: any) {
      alert(e.message || "Failed to kick player");
    } finally {
      setKicking(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <WalletIcon weight="duotone" /> Your Balance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentPlayer ? (
          <div className="text-center py-8">
            <p className="text-xs text-muted-foreground mb-1">Current Balance</p>
            <p className="text-5xl font-mono font-bold">${currentPlayer.balance.toLocaleString()}</p>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Loading balance...</p>
          </div>
        )}

        <div className="border-t pt-4">
          <h3 className="text-xs font-medium text-muted-foreground mb-2">All Players</h3>
          <div className="space-y-2">
            {players?.map((player) => (
              <div key={player._id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{player.name}</span>
                  {player.isAdmin && <ShieldIcon weight="fill" className="text-primary" />}
                  {player._id === playerId && <span className="text-xs text-muted-foreground">(you)</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono">${player.balance.toLocaleString()}</span>
                  {isAdmin && player._id !== playerId && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleKick(player)}
                      disabled={kicking === player._id}
                      title={`Kick ${player.name}`}
                    >
                      <UserMinusIcon weight="duotone" className="text-destructive" />
                      <span className="sr-only">Kick {player.name}</span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TransferTab({ roomId, playerId, connectionId }: { roomId: string; playerId: string; connectionId: string }) {
  const players = useQuery(api.monopolyBanker.getPlayers, { roomId }) as Player[] | undefined;
  const [recipient, setRecipient] = useState<Player | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const transferMoney = useMutation(api.monopolyBanker.transfer);
  const currentPlayer = players?.find(p => p._id === playerId);
  const otherPlayers = players?.filter(p => p._id !== playerId);

  const openDialpad = (player: Player) => {
    setRecipient(player);
    setAmount("");
    setReason("");
    setError("");
    setSuccess(false);
  };

  const closeDialpad = () => {
    setRecipient(null);
  };

  const handleDrawerOpenChange = (open: boolean) => {
    if (!open) closeDialpad();
  };

  const appendDigit = (d: string) => {
    setError("");
    setAmount((prev) => {
      const next = (prev + d).replace(/^0+(?=\d)/, "");
      if (next.length > 9) return prev;
      return next;
    });
  };

  const deleteDigit = () => {
    setError("");
    setAmount((prev) => prev.slice(0, -1));
  };

  const setQuickAmount = (value: number) => {
    setError("");
    setAmount(String(value));
  };

  const handleTransfer = async () => {
    if (!recipient) return;
    const amountNum = parseInt(amount || "0", 10);
    if (!amountNum || amountNum <= 0) { setError("Enter an amount"); return; }
    if (currentPlayer && amountNum > currentPlayer.balance) { setError("Insufficient balance"); return; }

    setError("");
    setLoading(true);
    setSuccess(false);

    try {
      await transferMoney({ senderId: playerId, recipientId: recipient._id, amount: amountNum, reason, connectionId });
      setSuccess(true);
      setTimeout(() => {
        closeDialpad();
        setSuccess(false);
      }, 700);
    } catch (e: any) {
      setError(e.message || "Transfer failed");
    } finally {
      setLoading(false);
    }
  };

  const amountNum = parseInt(amount || "0", 10);
  const insufficient = !!currentPlayer && amountNum > currentPlayer.balance;

  const quickAmounts = [10, 50, 100, 500, 1000];
  const dialpadKeys: Array<{ label: string; onPress: () => void; node?: ReactNode }> = [
    { label: "1", onPress: () => appendDigit("1") },
    { label: "2", onPress: () => appendDigit("2") },
    { label: "3", onPress: () => appendDigit("3") },
    { label: "4", onPress: () => appendDigit("4") },
    { label: "5", onPress: () => appendDigit("5") },
    { label: "6", onPress: () => appendDigit("6") },
    { label: "7", onPress: () => appendDigit("7") },
    { label: "8", onPress: () => appendDigit("8") },
    { label: "9", onPress: () => appendDigit("9") },
    { label: "00", onPress: () => appendDigit("00") },
    { label: "0", onPress: () => appendDigit("0") },
    { label: "backspace", onPress: deleteDigit, node: <BackspaceIcon weight="duotone" className="size-5" /> },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowsLeftRightIcon weight="duotone" /> Transfer Money
        </CardTitle>
        <CardDescription>Tap a player to send money</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentPlayer && (
          <div className="text-center p-3 bg-muted/50 rounded">
            <p className="text-xs text-muted-foreground">Your Balance</p>
            <p className="font-mono font-bold text-lg">${currentPlayer.balance.toLocaleString()}</p>
          </div>
        )}

        {!otherPlayers || otherPlayers.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No other players yet</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {otherPlayers.map((p) => (
              <Button
                key={p._id}
                variant="outline"
                onClick={() => openDialpad(p)}
                className="h-auto py-3 flex-col items-stretch gap-1"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 font-medium truncate">
                    {p.name}
                    {p.isAdmin && <ShieldIcon weight="fill" className="text-primary size-3" />}
                  </span>
                </div>
                <span className="font-mono text-xs text-muted-foreground text-left">
                  ${p.balance.toLocaleString()}
                </span>
              </Button>
            ))}
          </div>
        )}
      </CardContent>

      <Drawer open={!!recipient} onOpenChange={handleDrawerOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center justify-center gap-2">
              <PaperPlaneTiltIcon weight="duotone" />
              Send to {recipient?.name}
            </DrawerTitle>
            <DrawerDescription className="text-center">
              Your balance: ${currentPlayer?.balance.toLocaleString() ?? 0}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-2 space-y-4">
            <div className="text-center py-2">
              <p className="text-xs text-muted-foreground">Amount</p>
              <p
                className={cn(
                  "font-mono font-bold text-5xl tabular-nums tracking-tight",
                  insufficient ? "text-destructive" : amount ? "text-foreground" : "text-muted-foreground/50"
                )}
              >
                ${amountNum.toLocaleString()}
              </p>
            </div>

            <div className="flex gap-1.5 justify-center flex-wrap">
              {quickAmounts.map((q) => (
                <Button
                  key={q}
                  size="xs"
                  variant="secondary"
                  onClick={() => setQuickAmount(q)}
                >
                  +${q}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {dialpadKeys.map((k) => (
                <Button
                  key={k.label}
                  variant="outline"
                  onClick={k.onPress}
                  className="h-12 text-lg font-mono"
                >
                  {k.node ?? k.label}
                </Button>
              ))}
            </div>

            <Input
              placeholder="Reason (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            {error && <p className="text-xs text-destructive text-center">{error}</p>}
            {success && <p className="text-xs text-green-600 text-center">Transfer sent!</p>}
          </div>

          <DrawerFooter>
            <Button
              onClick={handleTransfer}
              disabled={loading || !amountNum || insufficient}
              className="w-full"
              size="lg"
            >
              {loading ? "Sending..." : `Send $${amountNum.toLocaleString()}`}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </Card>
  );
}

function AdminTab({ roomId, connectionId }: { roomId: string; connectionId: string }) {
  const [activeAdminTab, setActiveAdminTab] = useState<string>("requests");

  return (
    <Tabs value={activeAdminTab} onValueChange={setActiveAdminTab}>
      <TabsList className="w-full">
        <TabsTrigger value="requests" className="flex-1 text-xs">Requests</TabsTrigger>
        <TabsTrigger value="adjust" className="flex-1 text-xs">Adjust</TabsTrigger>
        <TabsTrigger value="log" className="flex-1 text-xs">Log</TabsTrigger>
      </TabsList>

      <TabsContent value="requests" className="pt-4">
        <PendingRequestsPanel roomId={roomId} connectionId={connectionId} />
      </TabsContent>

      <TabsContent value="adjust" className="pt-4">
        <ManualAdjustPanel roomId={roomId} connectionId={connectionId} />
      </TabsContent>

      <TabsContent value="log" className="pt-4">
        <TransactionLogPanel roomId={roomId} />
      </TabsContent>
    </Tabs>
  );
}

function PendingRequestsPanel({ roomId, connectionId }: { roomId: string; connectionId: string }) {
  const requests = useQuery(api.monopolyBanker.getPendingRequests, { roomId }) as MoneyRequest[] | undefined;
  const [loading, setLoading] = useState<string | null>(null);

  const approveRequest = useMutation(api.monopolyBanker.approveRequest);
  const rejectRequest = useMutation(api.monopolyBanker.rejectRequest);

  const handleApprove = async (requestId: string) => {
    setLoading(requestId);
    try {
      await approveRequest({ requestId, connectionId });
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setLoading(requestId);
    try {
      await rejectRequest({ requestId, connectionId });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <ClockIcon weight="duotone" /> Pending Requests
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!requests || requests.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No pending requests</p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req._id} className="p-3 border rounded space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{req.playerName}</p>
                    <p className="text-xs text-muted-foreground">{req.reason}</p>
                  </div>
                  <p className="font-mono font-bold text-lg">${req.amount}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => handleReject(req._id)} disabled={loading === req._id}>
                    <MinusCircleIcon weight="bold" /> Reject
                  </Button>
                  <Button size="sm" className="flex-1" onClick={() => handleApprove(req._id)} disabled={loading === req._id}>
                    <PlusCircleIcon weight="bold" /> Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const MANUAL_ADJUST_NO_PLAYER = "__manual_adjust_none__";

function ManualAdjustPanel({ roomId, connectionId }: { roomId: string; connectionId: string }) {
  const players = useQuery(api.monopolyBanker.getPlayers, { roomId }) as Player[] | undefined;
  const playerSelectItems = useMemo(
    () => [
      { value: MANUAL_ADJUST_NO_PLAYER, label: "Select a player" },
      ...(players ?? []).map((p) => ({ value: p._id, label: p.name })),
    ],
    [players],
  );
  const [playerId, setPlayerId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const manualBalanceChange = useMutation(api.monopolyBanker.manualBalanceChange);

  const handleAdjust = async () => {
    if (!playerId) { setError("Please select a player"); return; }
    const amountNum = parseInt(amount);
    if (isNaN(amountNum) || amountNum === 0) { setError("Please enter a non-zero amount"); return; }

    setError("");
    setLoading(true);
    setSuccess(false);

    try {
      await manualBalanceChange({ playerId, amount: amountNum, description, connectionId });
      setSuccess(true);
      setAmount("");
      setDescription("");
    } catch (e: any) {
      setError(e.message || "Failed to adjust balance");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <PlusCircleIcon weight="duotone" /> Manual Balance Adjust
        </CardTitle>
        <CardDescription>Add or remove money from a player</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Player</p>
          <Select
            items={playerSelectItems}
            value={playerId === "" ? MANUAL_ADJUST_NO_PLAYER : playerId}
            onValueChange={(v) =>
              setPlayerId(
                v == null || v === MANUAL_ADJUST_NO_PLAYER ? "" : v,
              )
            }
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue placeholder="Select a player" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={MANUAL_ADJUST_NO_PLAYER}>
                Select a player
              </SelectItem>
              {players?.map((p) => (
                <SelectItem key={p._id} value={p._id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Amount (positive to add, negative to remove)</p>
          <Input type="number" placeholder="e.g., 500 or -200" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Description</p>
          <Input placeholder="e.g., Bank error correction" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
        {success && <p className="text-xs text-green-600">Balance adjusted successfully!</p>}

        <Button onClick={handleAdjust} disabled={loading} className="w-full">
          {loading ? "Adjusting..." : "Adjust Balance"}
        </Button>
      </CardContent>
    </Card>
  );
}

function TransactionLogPanel({ roomId }: { roomId: string }) {
  const transactions = useQuery(api.monopolyBanker.getTransactionLog, { roomId, limit: 50 }) as Transaction[] | undefined;

  const getTypeColor = (type: string) => {
    switch (type) {
      case "player_joined": return "text-green-600";
      case "player_left": return "text-orange-600";
      case "player_kicked": return "text-red-600";
      case "manual_add": return "text-blue-600";
      case "manual_remove": return "text-red-600";
      case "request_approved": return "text-green-600";
      case "request_rejected": return "text-red-600";
      default: return "text-foreground";
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <ClockIcon weight="duotone" /> Transaction Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!transactions || transactions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No transactions yet</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {transactions.map((tx) => (
              <div key={tx._id} className="flex justify-between items-start p-2 border-b border-border/50">
                <div className="flex-1">
                  <p className="text-xs">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">by {tx.performedBy} at {formatTime(tx.createdAt)}</p>
                </div>
                {tx.amount !== undefined && (
                  <span className={`font-mono text-xs ${tx.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {tx.amount >= 0 ? "+" : ""}{tx.amount}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}