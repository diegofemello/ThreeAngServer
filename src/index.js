const app = require("express")();
const http = require("http").Server(app);
const io = require("socket.io")(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

// health check
app.get("/", (req, res) => {
  res.send("Health!")
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
    player.socketId = socket.id;
    const index = players.findIndex((p) => p.uid === player.uid);
    players[index] = player;
    socket.to(player.uid).emit("player", player);
    socket.to(player.uid).emit("playersMovement", players);
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

http.listen(8080, () => {
  console.log("Listening on port 8080");
});
