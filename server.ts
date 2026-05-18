import express from "express";
import path from "path";
import { fileURLToPath } from "url";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Static assets with caching for production
  if (process.env.NODE_ENV === "production") {
    // In production, the bundled server.cjs is in the dist folder
    // We can use process.cwd() to find the dist folder safely if we are running from the root
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve static files
    app.use(express.static(distPath, {
      maxAge: '1d',
      index: false // We will handle / with res.sendFile below
    }));
    
    // SPA catch-all
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
