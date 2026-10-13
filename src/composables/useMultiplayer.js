import { ref, computed } from "vue";
import { io } from "socket.io-client";

// In dev this points at the same machine as the page, so other devices on the LAN work too.
const SERVER_URL = import.meta.env.VITE_SOCKET_URL || `${location.protocol}//${location.hostname}:3001`;
const CONNECT_TIMEOUT_MS = 60_000; // Free hosts can take this long to wake up
const INFO_TIMEOUT_MS = 10_000;

// sessionStorage is per tab, so two tabs in one browser are two different players,
// while a reload keeps the same player (and gets the seat back).
const storage = {
  get(key) {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      value == null ? sessionStorage.removeItem(key) : sessionStorage.setItem(key, value);
    } catch {
      // Storage blocked: the player just won't get their seat back after a reload
    }
  },
};

const getPlayerId = () => {
  let id = storage.get("sam-player-id");
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
    storage.set("sam-player-id", id);
  }
  return id;
};

export function useMultiplayer() {
  // idle | connecting | connected | reconnecting | unreachable
  const status = ref("idle");
  const room = ref(null);
  const error = ref(null);
  const playerId = getPlayerId();

  let socket = null;
  let connectTimer = null;
  let afterConnect = null; // what to send once the connection is up
  let lastAction = null; // re-run by retry()

  // The room this tab is in, so a reload can rejoin it
  const savedRoom = () => ({ roomId: storage.get("sam-room"), nickname: storage.get("sam-room-name") });
  const saveRoom = (roomId, nickname) => {
    storage.set("sam-room", roomId);
    storage.set("sam-room-name", nickname);
  };

  const ensureSocket = () => {
    if (socket) return socket;
    socket = io(SERVER_URL, { autoConnect: false });

    socket.on("connect", () => {
      clearTimeout(connectTimer);
      status.value = "connected";
      const { roomId, nickname } = savedRoom();
      if (room.value && roomId) {
        // Back after a dropped connection: take the seat again
        socket.emit("room:join", { roomId, nickname, playerId });
      } else if (afterConnect) {
        const send = afterConnect;
        afterConnect = null;
        send();
      }
    });

    socket.on("disconnect", (reason) => {
      if (reason !== "io client disconnect") status.value = "reconnecting";
    });

    socket.on("room:state", (state) => {
      room.value = state;
      error.value = null;
    });

    socket.on("room:error", (err) => {
      error.value = err;
      room.value = null;
      saveRoom(null, null);
    });

    return socket;
  };

  const connectThen = (send) => {
    lastAction = send;
    ensureSocket();
    error.value = null;
    if (socket.connected) return send();

    afterConnect = send;
    status.value = "connecting";
    clearTimeout(connectTimer);
    connectTimer = setTimeout(() => {
      if (socket.connected) return;
      socket.disconnect();
      status.value = "unreachable";
    }, CONNECT_TIMEOUT_MS);
    socket.connect();
  };

  const createRoom = (nickname, level) =>
    connectThen(() => socket.emit("room:create", { nickname, level, playerId }));

  const joinRoom = (roomId, nickname) =>
    connectThen(() => {
      saveRoom(roomId, nickname);
      socket.emit("room:join", { roomId, nickname, playerId });
    });

  // Room summary for the join screen: { hostName, level, joinable, error } or { error: "NOT_FOUND" }
  const fetchRoomInfo = (roomId) =>
    new Promise((resolve) => {
      connectThen(() =>
        socket.timeout(INFO_TIMEOUT_MS).emit("room:info", { roomId }, (err, info) =>
          resolve(err ? { error: "NOT_FOUND" } : info)
        )
      );
    });

  const startGame = () => socket?.emit("game:start");
  const playAgain = () => socket?.emit("game:again");
  const flip = (index) => socket?.emit("card:flip", { index });

  const leave = () => {
    // Only when connected: Socket.IO would otherwise queue it and send it on the next connect
    if (socket?.connected) socket.emit("room:leave");
    socket?.disconnect();
    clearTimeout(connectTimer);
    afterConnect = null;
    room.value = null;
    error.value = null;
    status.value = "idle";
    saveRoom(null, null);
  };

  const retry = () => lastAction && connectThen(lastAction);

  // Called once the first room:state arrives, so reloads know which room to rejoin
  const rememberRoom = (nickname) => room.value && saveRoom(room.value.id, nickname);

  const me = computed(() => room.value?.players.find((p) => p.seat === room.value.you) ?? null);
  const isHost = computed(() => !!room.value && room.value.host === room.value.you);
  const isMyTurn = computed(() => !!room.value && room.value.turn === room.value.you);

  return {
    status,
    room,
    error,
    me,
    isHost,
    isMyTurn,
    savedRoom,
    rememberRoom,
    createRoom,
    joinRoom,
    fetchRoomInfo,
    startGame,
    playAgain,
    flip,
    leave,
    retry,
  };
}
