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
    const rootDir = process.cwd();
    const distPath = path.resolve(rootDir, "dist");
    const indexPath = path.join(distPath, "index.html");
    
    console.log(`[Server] Production mode active.`);
    console.log(`[Server] Current Working Directory: ${rootDir}`);
    console.log(`[Server] Dist Path: ${distPath}`);
    console.log(`[Server] Index Path: ${indexPath}`);
    
    // Serve static files
    app.use(express.static(distPath, {
      maxAge: '1d',
      index: 'index.html'
    }));
    
    // SPA catch-all for any other routes
    app.get("*", (req, res) => {
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error(`[Server] Error sending index.html:`, err);
          res.status(404).send(`System error: Static assets missing. Please ensure build completed. (Looking in ${distPath})`);
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
