import express from "express";
import path from "path";

export function serveStatic(app: express.Express) {
  const distPath = path.resolve(__dirname, "../public");

  console.log("📦 Static path:", distPath);

  app.use(express.static(distPath));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}