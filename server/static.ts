import express from "express";
import path from "path";

export function serveStatic(app: express.Express) {
  const distPath = path.join(process.cwd(), "dist/public");

  console.log("📦 Static path:", distPath);

  app.use(express.static(distPath));

  // ✅ VERY IMPORTANT (handles ALL routes)
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}