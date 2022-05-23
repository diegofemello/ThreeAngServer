const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});
require("dotenv").config();
const port = process.env.PORT || 8080;

server.listen(port, () => {
  console.log("Server listening at port %d", port);
});

app.get("/", (req, res) => {
  res.send("Health!");
});

const players = [];

io.on("connection", (socket) => {
  let previousId;

  const safeJoin = (currentId) => {
    socket.leave(previousId);
    socket.join(currentId, () =>
      console.log(`Socket ${socket.id} joined room ${currentId}`)
    );
    previousId = currentId;
  };

  socket.on("addPlayer", (player) => {
    player.socketId = socket.id;

    const index = players.findIndex((p) => p.uid === player.uid);

    if (index === -1) {
      players.push(player);
      safeJoin(player.uid);
      io.emit("players", players);
      socket.emit("player", player);
    }
  });

  socket.on("playerMove", (player) => {
    const oldPlayer = players.find((p) => p.uid === player.uid);
    const index = players.findIndex((p) => p.uid === player.uid);

    if (index !== -1) {
      players[index] = {
        uid: player.uid,
        username: oldPlayer.username,
        position: player.position,
        rotation: player.rotation,
        socketId: socket.id,
        style: oldPlayer.style,
      };
      socket.to(player.uid).emit("player", player);
      socket.to(player.uid).emit("playersMovement", players);
    }
  });

  socket.on("getPlayer", (playerId) => {
    safeJoin(playerId);
    const player = players.find((p) => p.uid === playerId);
    socket.emit("player", player);
  });

  socket.on("getPlayers", (playerId) => {
    safeJoin(playerId);
    socket.emit("playersMovement", players);
  });

  // on disconnect
  socket.on("disconnect", () => {
    players.forEach((player) => {
      if (player.socketId === socket.id) {
        players.splice(players.indexOf(player), 1);
      }
    });

    io.emit("players", players);
  });

  socket.emit("players", players);

  console.log(`Socket ${socket.id} has connected`);
});
