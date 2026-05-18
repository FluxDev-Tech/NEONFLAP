import express from "express";
import path from "path";
import { fileURLToPath } from "url";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Global Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", mode: process.env.NODE_ENV, time: new Date().toISOString() });
  });

  // Static assets with caching for production
  if (process.env.NODE_ENV === "production") {
    // In production, we serve from the 'dist' folder relative to the project root
    const distPath = path.join(process.cwd(), "dist");
    
    console.log(`[Server] Production mode detected.`);
    console.log(`[Server] Project root: ${process.cwd()}`);
    console.log(`[Server] Serving static assets from: ${distPath}`);

    // Serve static files
    app.use(express.static(distPath, {
      maxAge: '1d',
      index: 'index.html'
    }));
    
    // SPA catch-all for any other routes
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"), (err) => {
        if (err) {
          console.error(`[Server] Error sending index.html for path ${req.path}:`, err);
          res.status(404).send("File not found or system still building");
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
