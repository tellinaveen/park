const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// ✅ Add this
const users = [];

function tryPairing() {
    while (users.length >= 2) {
        const user1 = users.shift();
        const user2 = users.shift();

        user1.partner = user2;
        user2.partner = user1;

        user1.emit("chat-start");
        user2.emit("chat-start");
    }
}

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    users.push(socket);
    tryPairing();

    socket.on("message", (msg) => {
        const partner = socket.partner;
        if (partner) partner.emit("message", msg);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        const index = users.indexOf(socket);
        if (index !== -1) users.splice(index, 1);

        const partner = socket.partner;
        if (partner) {
            partner.emit("partner-disconnected");
            partner.partner = null;
            users.push(partner);
            tryPairing();
        }
    });

    // ✅ Handle chat exit
    socket.on("leave-chat", () => {
        console.log("User left chat:", socket.id);
        const index = users.indexOf(socket);
        if (index !== -1) users.splice(index, 1);

        const partner = socket.partner;
        if (partner && users.indexOf(partner) === -1) {
            partner.emit("partner-disconnected");
            partner.partner = null;
            users.push(partner); // Requeue partner
            tryPairing();
        }
        socket.partner = null;
    });
});

const PORT = process.env.PORT || 5000; // Use dynamic port from Render or fallback to 5000
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

