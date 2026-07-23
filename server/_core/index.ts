import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { registerLeaderboardRoutes } from "../leaderboard";
import { registerProfilesWorksRoutes } from "../profiles-works";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // text/plain body parser for leaderboard, profiles, works endpoints (CORS preflight 회피용)
  const textPlainParser = (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => {
    if (req.headers["content-type"]?.startsWith("text/plain")) {
      let data = "";
      req.on("data", (chunk: Buffer) => { data += chunk.toString(); });
      req.on("end", () => { req.body = data; next(); });
    } else {
      next();
    }
  };
  app.use("/api/profiles", textPlainParser);
  app.use("/api/works", textPlainParser);
  app.use("/api/leaderboard", (req, res, next) => {
    if (req.headers["content-type"]?.startsWith("text/plain")) {
      let data = "";
      req.on("data", (chunk: Buffer) => { data += chunk.toString(); });
      req.on("end", () => { req.body = data; next(); });
    } else {
      next();
    }
  });
  registerLeaderboardRoutes(app);
  registerProfilesWorksRoutes(app);

  // GET / → /놀이터/ 서버 리다이렉트 (JS 없이 즉시 이동, OG 크롤러 대응)
  app.get("/", (_req, res) => {
    res.redirect(301, "/놀이터/");
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
