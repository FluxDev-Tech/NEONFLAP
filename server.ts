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
    // In production, the bundled server.cjs is in the dist folder
    const distPath = path.resolve(__dirname);
    
    // Serve static files (including index.html automatically for /)
    app.use(express.static(distPath, {
      maxAge: '1d'
    }));
    
    // SPA catch-all for any other routes
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
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
