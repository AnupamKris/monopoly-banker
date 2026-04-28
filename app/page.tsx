"use client";

import { useState, useEffect, useRef, useMemo, type ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
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
import { UsersIcon, HouseLineIcon, UserCircleIcon, ArrowRightIcon, CopyIcon, CheckIcon, SignOutIcon, WalletIcon, ArrowsLeftRightIcon, ShieldIcon, ClockIcon, UserPlusIcon, MinusCircleIcon, PlusCircleIcon, BackspaceIcon, PaperPlaneTiltIcon, UserMinusIcon, VaultIcon, QrCodeIcon } from "@phosphor-icons/react";
import { QRCodeSVG } from "qrcode.react";

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
  const [autoJoinCode, setAutoJoinCode] = useState<string | null>(null);
  const [autoJoinNameInput, setAutoJoinNameInput] = useState("");
  const [autoJoinError, setAutoJoinError] = useState("");
  const [autoJoinLoading, setAutoJoinLoading] = useState(false);
  const [showAutoJoinNameDialog, setShowAutoJoinNameDialog] = useState(false);

  const joinRoomMutation = useMutation(api.monopolyBanker.joinRoom);

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

    let urlJoinCode: string | null = null;
    try {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get("join");
      if (raw && /^[A-Za-z0-9]{6}$/.test(raw)) {
        urlJoinCode = raw.toUpperCase();
        const url = new URL(window.location.href);
        url.searchParams.delete("join");
        window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      }
    } catch {}
    if (urlJoinCode) setAutoJoinCode(urlJoinCode);

    try {
      const raw = localStorage.getItem(CURRENT_ROOM_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as StoredSession;
        if (saved?.roomId && saved?.playerId) {
          if (urlJoinCode && saved.code !== urlJoinCode) {
            localStorage.removeItem(CURRENT_ROOM_KEY);
          } else {
            setPendingSession(saved);
            return;
          }
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

  const performAutoJoin = async (code: string, name: string) => {
    setAutoJoinError("");
    setAutoJoinLoading(true);
    try {
      const result = await joinRoomMutation({ code, playerName: name, connectionId, adminPassword: undefined });
      if (result.success && result.roomId) {
        enterRoom(result.roomId, result.playerId || "", result.isAdmin || false, code, name);
        setAutoJoinCode(null);
        setShowAutoJoinNameDialog(false);
      } else {
        setAutoJoinError(result.error || "Failed to join room");
        if (!playerName) setShowAutoJoinNameDialog(true);
      }
    } catch (e: any) {
      setAutoJoinError(e.message || "Failed to join room");
      if (!playerName) setShowAutoJoinNameDialog(true);
    } finally {
      setAutoJoinLoading(false);
    }
  };

  useEffect(() => {
    if (!bootstrapped || !autoJoinCode || !connectionId) return;
    if (currentRoom && currentRoom.code === autoJoinCode) {
      setAutoJoinCode(null);
      return;
    }
    if (currentRoom && currentRoom.code !== autoJoinCode) {
      localStorage.removeItem(CURRENT_ROOM_KEY);
      setCurrentRoom(null);
      setShowGamePage(false);
    }
    if (playerName.trim()) {
      performAutoJoin(autoJoinCode, playerName.trim());
    } else {
      setAutoJoinNameInput("");
      setShowAutoJoinNameDialog(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootstrapped, autoJoinCode, connectionId]);

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
    return <GamePage roomId={currentRoom.roomId} code={currentRoom.code} playerId={currentRoom.playerId} isAdmin={currentRoom.isAdmin} connectionId={connectionId} onLeave={handleLeave} />;
  }

  return (
    <div className="min-h-svh p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-4xl font-heading font-medium">Monopoly Banker</h1>
          <p className="text-sm text-muted-foreground">Manage your game finances</p>
        </div>

        <div className="flex flex-col gap-4">
          <Dialog>
            <DialogTrigger render={<Button variant="outline" className="w-full h-14 text-lg justify-start gap-3">
                <UserCircleIcon weight="duotone" className="w-6 h-6" /> Profile
              </Button>}>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Profile</DialogTitle>
                <DialogDescription>Manage your player name.</DialogDescription>
              </DialogHeader>
              <ProfileTab playerName={playerName} onSaveName={saveName} />
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger render={<Button className="w-full h-14 text-lg justify-start gap-3">
                <UserPlusIcon weight="duotone" className="w-6 h-6" /> Create Room
              </Button>}>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Room</DialogTitle>
                <DialogDescription>Start a new Monopoly session as the banker.</DialogDescription>
              </DialogHeader>
              <CreateRoomTab playerName={playerName} connectionId={connectionId} onRoomCreated={(roomId, playerId, isAdmin, code, name) => enterRoom(roomId, playerId, isAdmin, code, name)} />
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger render={<Button variant="secondary" className="w-full h-14 text-lg justify-start gap-3">
                <ArrowRightIcon weight="duotone" className="w-6 h-6" /> Join Room
              </Button>}>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Join Room</DialogTitle>
                <DialogDescription>Enter a room code to join an existing game.</DialogDescription>
              </DialogHeader>
              <JoinRoomTab playerName={playerName} connectionId={connectionId} onRoomJoined={(roomId, playerId, isAdmin, code, name) => enterRoom(roomId, playerId, isAdmin, code, name)} roomHistory={roomHistory} />
            </DialogContent>
          </Dialog>
        </div>

        <Dialog open={showAutoJoinNameDialog} onOpenChange={(open) => { if (!open) { setShowAutoJoinNameDialog(false); setAutoJoinCode(null); setAutoJoinError(""); } }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Join Room {autoJoinCode}</DialogTitle>
              <DialogDescription>Enter your name to join this room.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <Input
                placeholder="Your name"
                value={autoJoinNameInput}
                onChange={(e) => setAutoJoinNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && autoJoinNameInput.trim() && autoJoinCode) {
                    saveName(autoJoinNameInput.trim());
                    performAutoJoin(autoJoinCode, autoJoinNameInput.trim());
                  }
                }}
                autoFocus
              />
              {autoJoinError && <p className="text-xs text-destructive">{autoJoinError}</p>}
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  if (autoJoinNameInput.trim() && autoJoinCode) {
                    saveName(autoJoinNameInput.trim());
                    performAutoJoin(autoJoinCode, autoJoinNameInput.trim());
                  }
                }}
                disabled={autoJoinLoading || !autoJoinNameInput.trim()}
                className="w-full"
              >
                {autoJoinLoading ? "Joining..." : "Join Room"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {roomHistory.length > 0 && (
          <div className="pt-8 space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <ClockIcon weight="duotone" className="w-4 h-4" /> Recent Rooms
            </h3>
            <div className="space-y-2">
              {roomHistory.map((room) => (
                <div key={room.roomId} className="flex items-center justify-between p-3 bg-muted/30 border rounded-lg">
                  <div>
                    <p className="font-medium">{room.code}</p>
                    <p className="text-xs text-muted-foreground">{room.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => enterRoom(room.roomId, "", false, room.code, room.name)}>
                      Join
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeFromHistory(room.roomId)}>
                      <BackspaceIcon weight="duotone" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileTab({ playerName, onSaveName }: { playerName: string; onSaveName: (name: string) => void }) {
  const [name, setName] = useState(playerName);
  const [editing, setEditing] = useState(false);

  const handleSave = () => {
    if (name.trim()) {
      onSaveName(name.trim());
      setEditing(false);
    }
  };

  return (
    <div className="space-y-4 pt-2">
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
    </div>
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
    <div className="space-y-4 pt-2">
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
    </div>
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
    <div className="space-y-4 pt-2">
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
    </div>
  );
}

function GamePage({ roomId, code, playerId, isAdmin, connectionId, onLeave }: { roomId: string; code: string; playerId: string; isAdmin: boolean; connectionId: string; onLeave: (opts?: { kicked?: boolean }) => void }) {
  const [activeTab, setActiveTab] = useState<string>("balance");
  const [showHistory, setShowHistory] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const joinUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}${window.location.pathname}?join=${code}`;
  }, [code]);
  const players = useQuery(api.monopolyBanker.getPlayers, { roomId }) as Player[] | undefined;
  const leaveRoomMutation = useMutation(api.monopolyBanker.leaveRoom);
  const leftRef = useRef(false);
  const prevBalancesRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (players) {
      for (const player of players) {
        const prevBalance = prevBalancesRef.current.get(player._id);
        if (prevBalance !== undefined && player.balance > prevBalance && player._id === playerId) {
          toast.success(`You received $${(player.balance - prevBalance).toLocaleString()}`, {
            description: "Money was transferred to you",
          });
        }
        prevBalancesRef.current.set(player._id, player.balance);
      }
    }
  }, [players, playerId]);

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
            <h1 className="font-heading font-medium">Monopoly</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setShowHistory(true)}>
            <ClockIcon weight="duotone" className="text-primary" />
            <span className="sr-only">Transaction History</span>
          </Button>
          <button
            type="button"
            onClick={() => setShowQr(true)}
            className="text-sm font-mono bg-muted px-3 py-1.5 rounded-md hover:bg-muted/70 transition-colors flex items-center gap-1.5"
            title="Show QR code"
          >
            <QrCodeIcon weight="duotone" className="size-3.5" />
            {code}
          </button>
          <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(code); toast.success("Room code copied!"); }}>
            <CopyIcon weight="bold" />
            <span className="sr-only">Copy Room Code</span>
          </Button>
        </div>
      </header>

      <div className="flex-1 p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="balance" className="flex-1 gap-2">
              <WalletIcon weight="duotone" /> Balance
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="admin" className="flex-1 gap-2">
                <ShieldIcon weight="duotone" /> Admin
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="balance" className="pt-4">
            <BalanceTransferTab roomId={roomId} playerId={playerId} connectionId={connectionId} isAdmin={isAdmin} />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="admin" className="pt-4">
              <AdminTab roomId={roomId} connectionId={connectionId} />
            </TabsContent>
          )}
        </Tabs>
      </div>

      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Room {code}</DialogTitle>
            <DialogDescription>Scan to join this room directly.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            {joinUrl && (
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG value={joinUrl} size={220} level="M" />
              </div>
            )}
            <p className="text-xs text-muted-foreground break-all text-center">{joinUrl}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { navigator.clipboard.writeText(joinUrl); toast.success("Join link copied!"); }}
            >
              <CopyIcon weight="bold" /> Copy link
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Drawer open={showHistory} onOpenChange={setShowHistory}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <ClockIcon weight="duotone" /> Transaction History
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto max-h-[calc(85vh-120px)]">
            <TransactionHistoryDrawer roomId={roomId} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function BalanceTransferTab({ roomId, playerId, connectionId, isAdmin }: { roomId: string; playerId: string; connectionId: string; isAdmin: boolean }) {
  const players = useQuery(api.monopolyBanker.getPlayers, { roomId }) as Player[] | undefined;
  const kickPlayer = useMutation(api.monopolyBanker.kickPlayer);
  const transferMoney = useMutation(api.monopolyBanker.transfer);
  const sendToBankMutation = useMutation(api.monopolyBanker.sendToBank);
  const requestFromBankMutation = useMutation(api.monopolyBanker.requestFromBank);
  const [kicking, setKicking] = useState<string | null>(null);
  const [recipient, setRecipient] = useState<Player | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [bankAction, setBankAction] = useState<"deposit" | "withdraw" | null>(null);
  const [bankAmount, setBankAmount] = useState("");
  const [bankReason, setBankReason] = useState("");
  const [bankLoading, setBankLoading] = useState(false);
  const [bankError, setBankError] = useState("");
  const [bankSuccess, setBankSuccess] = useState(false);

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

  const openBankDrawer = (action: "deposit" | "withdraw") => {
    setBankAction(action);
    setBankAmount("");
    setBankReason("");
    setBankError("");
    setBankSuccess(false);
  };

  const closeBankDrawer = () => {
    setBankAction(null);
  };

  const handleBankDrawerOpenChange = (open: boolean) => {
    if (!open) closeBankDrawer();
  };

  const handleBankSubmit = async () => {
    const amountNum = parseInt(bankAmount || "0", 10);
    if (!amountNum || amountNum <= 0) { setBankError("Enter an amount"); return; }

    if (bankAction === "deposit" && currentPlayer && amountNum > currentPlayer.balance) {
      setBankError("Insufficient balance"); return;
    }

    setBankError("");
    setBankLoading(true);
    setBankSuccess(false);

    try {
      if (bankAction === "deposit") {
        await sendToBankMutation({ playerId, amount: amountNum, reason: bankReason, connectionId });
        setBankSuccess(true);
        setTimeout(() => {
          closeBankDrawer();
          setBankSuccess(false);
        }, 700);
      } else {
        await requestFromBankMutation({ playerId, amount: amountNum, reason: bankReason, connectionId });
        setBankSuccess(true);
        setTimeout(() => {
          closeBankDrawer();
          setBankSuccess(false);
        }, 700);
      }
    } catch (e: any) {
      setBankError(e.message || "Transaction failed");
    } finally {
      setBankLoading(false);
    }
  };

  const bankAmountNum = parseInt(bankAmount || "0", 10);
  const bankInsufficient = bankAction === "deposit" && !!currentPlayer && bankAmountNum > currentPlayer.balance;

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

  const quickAmounts = [10, 50, 100, 500];
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
    <>
      <Card>
        
        <CardContent>
          {currentPlayer ? (
            <div className="text-center py-4">
              <p className="text-xs text-muted-foreground mb-1">Current Balance</p>
              <p className="text-5xl font-mono font-bold">${currentPlayer.balance.toLocaleString()}</p>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <p>Loading balance...</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2 mt-4">
        <Button variant="outline" className="flex-1" onClick={() => openBankDrawer("deposit")}>
          <MinusCircleIcon weight="duotone" className="mr-1" /> To Bank
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => openBankDrawer("withdraw")}>
          <PlusCircleIcon weight="duotone" className="mr-1" /> From Bank
        </Button>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <UsersIcon weight="duotone" /> All Players
          </CardTitle>
          <CardDescription>Tap a player to transfer money</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {players?.filter(p => p._id !== playerId).map((player) => (
              <div
                key={player._id}
                onClick={() => openDialpad(player)}
                className="border rounded-lg p-3 flex flex-col items-stretch gap-1 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 font-medium truncate">
                    {player.name}
                    {player.isAdmin && <ShieldIcon weight="fill" className="text-primary size-3" />}
                    {player._id === playerId && <span className="text-xs text-muted-foreground">(you)</span>}
                  </span>
                  {isAdmin && player._id !== playerId && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => { e.stopPropagation(); handleKick(player); }}
                      disabled={kicking === player._id}
                      title={`Kick ${player.name}`}
                      className="h-6 w-6"
                    >
                      <UserMinusIcon weight="duotone" className="text-destructive size-3" />
                    </Button>
                  )}
                </div>
                <span className="font-mono text-xs text-muted-foreground text-left">
                  ${player.balance.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
            >
              {loading ? "Sending..." : "Send Money"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer open={!!bankAction} onOpenChange={handleBankDrawerOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center justify-center gap-2">
              {bankAction === "deposit" ? <PlusCircleIcon weight="duotone" /> : <MinusCircleIcon weight="duotone" />}
              {bankAction === "deposit" ? "Deposit to Bank" : "Ask from Bank"}
            </DrawerTitle>
            {/* <DrawerDescription className="text-center">
              {bankAction === "deposit"
                ? `Your balance: $${currentPlayer?.balance.toLocaleString() ?? 0}`
                : "Bank balance: ∞"}
            </DrawerDescription> */}
          </DrawerHeader>

          <div className="px-4 pb-2 space-y-4">
            <div className="text-center py-2">
              <p className="text-xs text-muted-foreground">Amount</p>
              <p
                className={cn(
                  "font-mono font-bold text-5xl tabular-nums tracking-tight",
                  bankInsufficient ? "text-destructive" : bankAmount ? "text-foreground" : "text-muted-foreground/50"
                )}
              >
                ${bankAmountNum.toLocaleString()}
              </p>
            </div>

            <div className="flex gap-1.5 justify-center flex-wrap">
              {quickAmounts.map((q) => (
                <Button
                  key={q}
                  size="xs"
                  variant="secondary"
                  onClick={() => { setBankError(""); setBankAmount(String(q)); }}
                >
                  {bankAction === "deposit" ? "+" : "-"}${q}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {dialpadKeys.map((k) => (
                <Button
                  key={k.label}
                  variant="outline"
                  onClick={() => {
                    setBankError("");
                    if (k.label === "backspace") {
                      setBankAmount((prev) => prev.slice(0, -1));
                    } else {
                      setBankAmount((prev) => {
                        const next = (prev + k.label).replace(/^0+(?=\d)/, "");
                        return next.length > 9 ? prev : next;
                      });
                    }
                  }}
                  className="h-12 text-lg font-mono"
                >
                  {k.node ?? k.label}
                </Button>
              ))}
            </div>

            <Input
              placeholder="Reason (optional)"
              value={bankReason}
              onChange={(e) => setBankReason(e.target.value)}
            />

            {bankError && <p className="text-xs text-destructive text-center">{bankError}</p>}
            {bankSuccess && <p className="text-xs text-green-600 text-center">Transaction complete!</p>}
          </div>

          <DrawerFooter>
            <Button
              onClick={handleBankSubmit}
              disabled={bankLoading || !bankAmountNum || bankInsufficient}
              className="w-full"
            >
              {bankLoading ? "Processing..." : bankAction === "deposit" ? "Deposit" : "Withdraw"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
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

  const quickAmounts = [10, 50, 100, 500];
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
    <Card className="py-4 sm:py-6">
      <CardHeader className="px-4 sm:px-6 pb-3">
        <CardTitle className="flex items-center gap-2">
          <ArrowsLeftRightIcon weight="duotone" /> Transfer Money
        </CardTitle>
        <CardDescription>Tap a player to send money</CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 space-y-4">
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
        <TabsTrigger value="bank" className="flex-1 text-xs">Bank</TabsTrigger>
        <TabsTrigger value="log" className="flex-1 text-xs">Log</TabsTrigger>
      </TabsList>

      <TabsContent value="requests" className="pt-4">
        <PendingRequestsPanel roomId={roomId} connectionId={connectionId} />
      </TabsContent>

      <TabsContent value="adjust" className="pt-4">
        <ManualAdjustPanel roomId={roomId} connectionId={connectionId} />
      </TabsContent>

      <TabsContent value="bank" className="pt-4">
        <AdminBankPanel roomId={roomId} connectionId={connectionId} />
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
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <ClockIcon weight="duotone" /> Pending Requests
      </div>
      {!requests || requests.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No pending requests</p>
      ) : (
        <div className="space-y-2 px-0.5">
          {requests.map((req) => (
            <div key={req._id} className="p-3 border space-y-3 bg-muted">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{req.playerName}</p>
                  {req.reason && <p className="text-xs text-muted-foreground truncate">{req.reason}</p>}
                </div>
                <p className="font-mono font-bold text-base whitespace-nowrap shrink-0">${req.amount}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive bg-background" onClick={() => handleReject(req._id)} disabled={loading === req._id}>
                  <MinusCircleIcon weight="bold" /> Reject
                </Button>
                <Button className="flex-1" onClick={() => handleApprove(req._id)} disabled={loading === req._id}>
                  <PlusCircleIcon weight="bold" /> Approve
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
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
    <Card className="py-4 sm:py-6">
      <CardHeader className="px-4 sm:px-6 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <PlusCircleIcon weight="duotone" /> Manual Balance Adjust
        </CardTitle>
        <CardDescription>Add or remove money from a player</CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 space-y-4">
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

function AdminBankPanel({ roomId, connectionId }: { roomId: string; connectionId: string }) {
  const pendingRequests = useQuery(api.monopolyBanker.getPendingRequests, { roomId }) as any[] | undefined;
  const approveRequest = useMutation(api.monopolyBanker.approveRequest);
  const rejectRequest = useMutation(api.monopolyBanker.rejectRequest);
  const [processing, setProcessing] = useState<string | null>(null);

  const bankRequests = pendingRequests?.filter(r => r.type === "bank_request") ?? [];

  const handleApprove = async (requestId: string) => {
    setProcessing(requestId);
    try {
      await approveRequest({ requestId, connectionId });
    } catch (e: any) {
      alert(e.message || "Failed to approve request");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessing(requestId);
    try {
      await rejectRequest({ requestId, connectionId });
    } catch (e: any) {
      alert(e.message || "Failed to reject request");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <Card className="py-4 sm:py-6">
      <CardHeader className="px-4 sm:px-6 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <VaultIcon weight="duotone" /> Bank Withdrawal Requests
        </CardTitle>
        <CardDescription>Pending requests from players</CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        {bankRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No pending requests</p>
        ) : (
          <div className="space-y-2">
            {bankRequests.map((req) => (
              <div key={req._id} className="p-3 border rounded-lg space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{req.playerName}</p>
                    {req.reason && <p className="text-xs text-muted-foreground truncate">{req.reason}</p>}
                  </div>
                  <p className="font-mono font-bold text-base whitespace-nowrap shrink-0">${req.amount.toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleReject(req._id)}
                    disabled={processing === req._id}
                  >
                    <MinusCircleIcon weight="bold" /> Reject
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => handleApprove(req._id)}
                    disabled={processing === req._id}
                  >
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

function TransactionHistoryDrawer({ roomId }: { roomId: string }) {
  const transactions = useQuery(api.monopolyBanker.getTransactionLog, { roomId, limit: 50 }) as Transaction[] | undefined;

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "player_joined": return <UserPlusIcon weight="duotone" className="text-green-500" />;
      case "player_left": return <UserMinusIcon weight="duotone" className="text-orange-500" />;
      case "player_kicked": return <UserMinusIcon weight="duotone" className="text-red-500" />;
      case "transfer": return <ArrowsLeftRightIcon weight="duotone" className="text-blue-500" />;
      case "manual_add": return <PlusCircleIcon weight="duotone" className="text-green-500" />;
      case "manual_remove": return <MinusCircleIcon weight="duotone" className="text-red-500" />;
      case "request_approved": return <CheckIcon weight="bold" className="text-green-500" />;
      case "request_rejected": return <CheckIcon weight="bold" className="text-red-500" />;
      case "sent_to_bank": return <ArrowRightIcon weight="bold" className="text-blue-500" />;
      case "requested_from_bank": return <ArrowRightIcon weight="bold" className="text-orange-500" />;
      default: return <ClockIcon weight="duotone" />;
    }
  };

  const getAmountColor = (type: string, amount?: number) => {
    if (amount === undefined) return "";
    if (type === "manual_remove" || type === "player_kicked" || type === "request_rejected" || type === "sent_to_bank") {
      return "text-red-500";
    }
    return "text-green-500";
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (!transactions || transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ClockIcon weight="duotone" className="size-12 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">No transactions yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Transactions will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {transactions.map((tx) => (
        <div
          key={tx._id}
          className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex-shrink-0 mt-0.5">
            {getTransactionIcon(tx.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{tx.description}</p>
            <p className="text-xs text-muted-foreground">
              {tx.performedBy} · {formatTime(tx.createdAt)}
            </p>
          </div>
          {tx.amount !== undefined && (
            <span className={`font-mono text-sm font-semibold ${getAmountColor(tx.type, tx.amount)}`}>
              {tx.type === "manual_remove" || tx.type === "player_kicked" || tx.type === "request_rejected" || tx.type === "sent_to_bank" ? "-" : "+"}${Math.abs(tx.amount).toLocaleString()}
            </span>
          )}
        </div>
      ))}
    </div>
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
    <Card className="py-4 sm:py-6">
      <CardHeader className="px-4 sm:px-6 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ClockIcon weight="duotone" /> Transaction Log
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
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