import express, { type Express } from "express";
import path from "node:path";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { handleMcp } from "./mcp";
import oauth from "./oauth";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", oauth);

app.post("/api/mcp", (req, res, next) => {
  void handleMcp(req, res).catch(next);
});

app.get("/api", (_req, res) => {
  res.json({ status: "ok", service: "righttemp-api" });
});

app.use("/api", router);

const webDirectory = path.resolve(
  process.cwd(),
  "artifacts/righttemp-os/dist/public",
);

app.use(express.static(webDirectory));
app.use((req, res, next) => {
  if (req.method === "GET" && req.accepts("html")) {
    res.sendFile(path.join(webDirectory, "index.html"));
    return;
  }

  next();
});

export default app;
