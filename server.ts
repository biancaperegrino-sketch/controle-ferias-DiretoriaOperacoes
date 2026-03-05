
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // In-memory state (shared across all users)
  let state = {
    collaborators: [],
    records: [],
    holidays: [],
    logs: [],
    registeredUsers: [],
    settings: { logo: null }
  };

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Send initial state
    socket.emit("init", state);

    // Handle updates
    socket.on("update_collaborators", (data) => {
      state.collaborators = data;
      socket.broadcast.emit("collaborators_updated", data);
    });

    socket.on("update_records", (data) => {
      state.records = data;
      socket.broadcast.emit("records_updated", data);
    });

    socket.on("update_holidays", (data) => {
      state.holidays = data;
      socket.broadcast.emit("holidays_updated", data);
    });

    socket.on("update_logs", (data) => {
      state.logs = data;
      socket.broadcast.emit("logs_updated", data);
    });

    socket.on("update_registered_users", (data) => {
      state.registeredUsers = data;
      socket.broadcast.emit("registered_users_updated", data);
    });

    socket.on("update_settings", (data) => {
      state.settings = data;
      socket.broadcast.emit("settings_updated", data);
    });

    // Specific actions to avoid full state broadcasts if preferred
    socket.on("add_log", (log) => {
      state.logs = [log, ...state.logs].slice(0, 100);
      io.emit("logs_updated", state.logs);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
