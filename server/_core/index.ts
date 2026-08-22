import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { registerCourseSharePreviewRoutes } from "../sharePreview";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { ENV } from "./env";

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
  registerCourseSharePreviewRoutes(app);

  // The Forge Maps proxy validates the browser Origin header. A same-origin
  // server route lets the browser load the JavaScript without exposing a
  // cross-origin script-tag request that cannot carry that header.
  app.get("/api/maps/script", async (req, res) => {
    try {
      const baseUrl = (process.env.VITE_FRONTEND_FORGE_API_URL || ENV.forgeApiUrl).replace(/\/+$/, "");
      const requestedKey = typeof req.query.key === "string" ? req.query.key : "";
      const apiKey = requestedKey || process.env.VITE_FRONTEND_FORGE_API_KEY || ENV.forgeApiKey;
      const scriptUrl = new URL(`${baseUrl}/v1/maps/proxy/maps/api/js`);
      scriptUrl.searchParams.set("key", apiKey);
      scriptUrl.searchParams.set("v", "weekly");
      scriptUrl.searchParams.set("libraries", "marker,places,geocoding,geometry");
      scriptUrl.searchParams.set("language", typeof req.query.language === "string" ? req.query.language : "ko");
      scriptUrl.searchParams.set("region", typeof req.query.region === "string" ? req.query.region : "KR");
      const requestedOrigin = typeof req.query.origin === "string" ? req.query.origin : "";
      const refererOrigin = req.get("referer") ? new URL(req.get("referer") as string).origin : "";
      const forwardedHost = req.get("x-forwarded-host") || req.get("host") || "localhost";
      const forwardedProto = req.get("x-forwarded-proto") || req.protocol;
      const hostIsLocal = forwardedHost.startsWith("localhost") || forwardedHost.startsWith("127.") || forwardedHost.startsWith("0.0.0.0");
      const publicHostOrigin = hostIsLocal ? (process.env.MANUS_MAP_PREVIEW_ORIGIN || "https://3000-i794xxp009uzymi9jsqgl-baa3a6d9.us4.manus.computer") : `https://${forwardedHost}`;
      const isLocalOrigin = (value: string) => value.startsWith("http://localhost") || value.startsWith("http://127.") || value.startsWith("http://0.0.0.0");
      const requestOrigin = req.get("origin") || "";
      const origin = requestOrigin && !isLocalOrigin(requestOrigin) ? requestOrigin : (!isLocalOrigin(requestedOrigin) && requestedOrigin) || (!isLocalOrigin(refererOrigin) && refererOrigin) || publicHostOrigin;
      const response = await fetch(scriptUrl, {
        headers: { Accept: "text/javascript", Origin: origin },
      });
      const source = await response.text();
      if (!response.ok) {
        res.status(response.status).json({ error: "Google Maps proxy request failed" });
        return;
      }
      res.type("text/javascript").set("Cache-Control", "public, max-age=300").send(source);
    } catch (error) {
      console.error("[Maps] Failed to proxy Google Maps script", error);
      res.status(502).json({ error: "Google Maps script unavailable" });
    }
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
