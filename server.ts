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
  const distPath = path.resolve(process.cwd(), "dist");
  const indexPath = path.join(distPath, "index.html");

  if (process.env.NODE_ENV === "production" || process.env.RENDER) {
    console.log(`[Server] Production mode active. Serving from: ${distPath}`);

    // Serve static files with explicit index handling
    app.use(express.static(distPath, {
      maxAge: '1d',
      index: 'index.html'
    }));
    
    // SPA catch-all
    app.get("*", (req, res) => {
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error(`[Server] Error: Failed to send index.html. Path: ${indexPath}`);
          res.status(500).send("Game resources missing. Please ensure the build completed successfully.");
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
