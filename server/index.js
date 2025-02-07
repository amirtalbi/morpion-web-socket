import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
  },
});

const rooms = new Map();

io.on("connection", (socket) => {
  let currentRoom = null;
  let playerNickname = null;

  socket.on("setNickname", (nickname) => {
    playerNickname = nickname;
    socket.emit("nicknameSet", nickname);
  });

  socket.on("createRoom", () => {
    const roomId = Math.random().toString(36).substring(7);
    rooms.set(roomId, {
      players: [{ id: socket.id, nickname: playerNickname }],
      currentPlayer: socket.id,
      board: Array(9).fill(null),
    });
    socket.join(roomId);
    currentRoom = roomId;
    socket.emit("roomCreated", roomId);
  });

  socket.on("joinRoom", (roomId) => {
    const room = rooms.get(roomId);
    if (room && room.players.length < 2) {
      room.players.push({ id: socket.id, nickname: playerNickname });
      socket.join(roomId);
      currentRoom = roomId;
      io.to(roomId).emit("gameStart", {
        players: room.players,
        currentPlayer: room.players[0].id,
      });
    }
  });

  socket.on("makeMove", ({ index }) => {
    const room = rooms.get(currentRoom);
    if (room && room.currentPlayer === socket.id) {
      const symbol = room.players[0].id === socket.id ? "X" : "O";
      room.board[index] = symbol;
      room.currentPlayer = room.players.find((p) => p.id !== socket.id).id;

      io.to(currentRoom).emit("updateBoard", {
        board: room.board,
        currentPlayer: room.currentPlayer,
      });

      const winner = checkWinner(room.board);
      if (winner || !room.board.includes(null)) {
        io.to(currentRoom).emit("gameEnd", { winner });
      }
    }
  });

  socket.on("requestReplay", () => {
    const room = rooms.get(currentRoom);
    if (room) {
      room.playersReadyForReplay = room.playersReadyForReplay || new Set();
      room.playersReadyForReplay.add(socket.id);

      if (room.playersReadyForReplay.size === 2) {
        room.board = Array(9).fill(null);
        room.players.reverse();
        room.currentPlayer = room.players[0].id;
        room.playersReadyForReplay.clear();

        io.to(currentRoom).emit("gameRestart", {
          board: room.board,
          currentPlayer: room.currentPlayer,
          players: room.players
        });
      } else {
        io.to(currentRoom).emit("playerReadyForReplay", {
          readyPlayerId: socket.id,
          totalReady: room.playersReadyForReplay.size
        });
      }
    }
  });

  socket.on("disconnect", () => {
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room?.playersReadyForReplay) {
        room.playersReadyForReplay.delete(socket.id);
      }
      io.to(currentRoom).emit("playerLeft");
      rooms.delete(currentRoom);
    }
  });
});

function checkWinner(board) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (let line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

httpServer.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});
