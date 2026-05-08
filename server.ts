import express from "express";
import { createServer } from "node:http";
import wisp from "wisp-server-node";
import { createServer as createViteServer } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Handle WISP connections
  server.on("upgrade", (req, socket, head) => {
    if (req.url && (
         req.url.startsWith("/api/sync/") || 
         req.url.startsWith("/api/v1/sync/") ||
         req.url.startsWith("/api/v2/connect/")
    )) {
      wisp.routeRequest(req, socket as any, head);
    }
  });

  // Serve static files from root (for files like math.mjs, scramworker.js etc)
  app.use(express.static(path.join(process.cwd(), ".")));

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = 3000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
