<!-- client/pages/index.vue -->
<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { io } from "socket.io-client";

const socket = ref(null);
const nickname = ref("");
const nicknameInput = ref("");
const roomId = ref("");
const roomInput = ref("");
const board = ref(Array(9).fill(null));
const gameStarted = ref(false);
const currentPlayer = ref(null);
const gameEnded = ref(false);
const winner = ref(null);
const showReplayButton = ref(true);
const waitingForReplay = ref(false);
const opponentReady = ref(false);

onMounted(() => {
  socket.value = io("http://159.89.109.230:3001/", {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });

  socket.value.on("nicknameSet", (name) => {
    nickname.value = name;
  });

  socket.value.on("roomCreated", (id) => {
    roomId.value = id;
  });

  socket.value.on("gameStart", ({ players, currentPlayer: firstPlayer }) => {
    gameStarted.value = true;
    currentPlayer.value = firstPlayer;
  });

  socket.value.on(
    "updateBoard",
    ({ board: newBoard, currentPlayer: nextPlayer }) => {
      board.value = newBoard;
      currentPlayer.value = nextPlayer;
    }
  );

  socket.value.on("gameEnd", ({ winner: gameWinner }) => {
    gameEnded.value = true;
    winner.value = gameWinner || "draw";
    showReplayButton.value = true;
  });

  socket.value.on("playerLeft", () => {
    alert("Opponent left the game");
    leaveRoom();
  });

  socket.value.on("gameRestart", ({board: newBoard, currentPlayer: nextPlayer, players}) => {
    board.value = newBoard;
    currentPlayer.value = nextPlayer;
    gameEnded.value = false;
    gameStarted.value = true;
    winner.value = null;
    showReplayButton.value = true;
    waitingForReplay.value = false;
    opponentReady.value = false;
  });

  socket.value.on("playerReadyForReplay", ({ readyPlayerId, totalReady }) => {
    if (readyPlayerId === socket.value.id) {
      waitingForReplay.value = true;
      showReplayButton.value = false;
    } else {
      opponentReady.value = true;
    }
  });
});

onUnmounted(() => {
  if (socket.value) {
    socket.value.disconnect();
  }
});

const setNickname = () => {
  if (nicknameInput.value.trim()) {
    socket.value.emit("setNickname", nicknameInput.value);
  }
};

const createRoom = () => {
  socket.value.emit("createRoom");
};

const joinRoom = () => {
  if (roomInput.value.trim()) {
    socket.value.emit("joinRoom", roomInput.value);
    roomId.value = roomInput.value;
  }
};

const makeMove = (index) => {
  if (canMove(index)) {
    socket.value.emit("makeMove", { index });
  }
};

const canMove = (index) => {
  return (
    gameStarted.value &&
    currentPlayer.value === socket.value.id &&
    !board.value[index] &&
    !gameEnded.value
  );
};

const leaveRoom = () => {
  roomId.value = "";
  gameStarted.value = false;
  gameEnded.value = false;
  winner.value = null;
  board.value = Array(9).fill(null);
  showReplayButton.value = true;
  waitingForReplay.value = false;
  opponentReady.value = false;

  if (socket.value) {
    socket.value.emit("leaveRoom");
  }
};

const requestReplay = () => {
  socket.value.emit("requestReplay");
  waitingForReplay.value = true;
};
</script>

<template>
  <div class="min-h-screen bg-gray-100 p-8">
    <div v-if="!nickname" class="max-w-md mx-auto">
      <h1 class="text-2xl font-bold mb-4">Welcome to Morpion</h1>
      <input
        v-model="nicknameInput"
        class="w-full p-2 border rounded mb-4"
        placeholder="Enter your nickname"
      />
      <button
        @click="setNickname"
        class="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
      >
        Start Game
      </button>
    </div>

    <div v-else-if="!roomId" class="max-w-md mx-auto">
      <h2 class="text-xl mb-4">Welcome, {{ nickname }}</h2>
      <div class="space-y-4">
        <button
          @click="createRoom"
          class="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600"
        >
          Create Room
        </button>
        <div class="flex space-x-2">
          <input
            v-model="roomInput"
            class="flex-1 p-2 border rounded"
            placeholder="Room ID"
          />
          <button
            @click="joinRoom"
            class="bg-blue-500 text-white px-4 rounded hover:bg-blue-600"
          >
            Join
          </button>
        </div>
      </div>
    </div>

    <div v-else class="max-w-md mx-auto">
      <div class="mb-4">
        <h2 class="text-xl font-bold">Room: {{ roomId }}</h2>
        <p v-if="!gameStarted">Waiting for opponent...</p>
        <p v-else>
          Current player:
          {{ currentPlayer === socket?.id ? "Your turn" : "Opponent's turn" }}
        </p>
      </div>

      <div class="grid grid-cols-3 gap-0 mb-4 relative max-w-[300px] mx-auto">
        <div class="absolute w-full h-[2px] bg-gray-800 top-1/3 left-0"></div>
        <div class="absolute w-full h-[2px] bg-gray-800 top-2/3 left-0"></div>

        <div class="absolute h-full w-[2px] bg-gray-800 left-1/3 top-0"></div>
        <div class="absolute h-full w-[2px] bg-gray-800 left-2/3 top-0"></div>

        <button
          v-for="(cell, index) in board"
          :key="index"
          @click="makeMove(index)"
          :disabled="!canMove(index)"
          class="h-24 text-4xl font-bold flex items-center justify-center hover:bg-gray-50 transition-colors"
          :class="{
            'text-blue-600': cell === 'X',
            'text-red-600': cell === 'O'
          }"
        >
          {{ cell }}
        </button>
      </div>

      <div v-if="gameEnded" class="text-center mb-4">
        <p class="text-xl font-bold mb-4">
          {{ winner ? (winner === "draw" ? "Draw!" : "Winner: " + winner) : "Game Over!" }}
        </p>

        <div class="space-y-4">
          <button
            v-if="showReplayButton"
            @click="requestReplay"
            class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 w-full"
          >
            {{ opponentReady ? 'Click to Start New Game' : 'Play Again' }}
          </button>

          <p v-if="waitingForReplay" class="text-gray-600 italic">
            Waiting for opponent to accept...
          </p>

          <p v-if="opponentReady && showReplayButton" class="text-green-600 italic">
            Opponent is ready to play again!
          </p>

          <button
            @click="leaveRoom"
            class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 w-full"
          >
            Leave Room
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
