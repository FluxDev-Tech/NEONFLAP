import express from "express";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Global Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", mode: process.env.NODE_ENV, time: new Date().toISOString() });
  });

  // Static assets and SPA handling
  const rootDir = process.cwd();
  const distPath = path.resolve(rootDir, "dist");
  const indexPath = path.join(distPath, "index.html");

  if (process.env.NODE_ENV === "production" || process.env.RENDER) {
    console.log(`[Server] Production/Cloud environment detected.`);
    console.log(`[Server] Serving from: ${distPath}`);

    // Serve static files from /dist
    app.use(express.static(distPath, {
      maxAge: '1d'
    }));
    
    // SPA catch-all: return index.html for any unknown requests
    app.get("*", (req, res) => {
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error(`[Server] Fallback error: index.html not found!`, err);
          res.status(404).send("Game core files missing. Please run build script.");
        }
      });
    });
  } else {
    // Vite middleware for development
    // Dynamic import to avoid loading Vite in production environments
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
