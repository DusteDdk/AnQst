import path from "path";
import http from "http";
import express from "express";
import { WebSocketServer } from "ws";
import {
  createUserManagementNodeExpressWsBridge,
  type AnQstDiagnostic
} from "../../frontend/generated_output/UserManagement_node_express_ws/index";
import { syncOutputs } from "./bridge-sync";
import { createUserManagementImplementation } from "./user-management-implementation";
import { UserManagementState } from "./user-management-state";

const app = express();
const port = Number(process.env.PORT ?? 3000);
const staticDir = path.resolve(
  process.cwd(),
  process.env.STATIC_DIR ?? "../frontend/dist/webapp-frontend/browser"
);

app.use(express.static(staticDir));

const server = http.createServer(app);
const wsServer = new WebSocketServer({ server });

const state = new UserManagementState();
const implementation = createUserManagementImplementation(state);

const bridge = createUserManagementNodeExpressWsBridge({
  app,
  wsServer,
  implementation
});

bridge.onSession(() => {
  syncOutputs(
    bridge.getSessionInterfaces(),
    state,
    `connected:selected=${state.lastSelectedUserId}`
  );
});

bridge.subscribeDiagnostics((diagnostic: AnQstDiagnostic) => {
  if (diagnostic.severity === "error" || diagnostic.severity === "fatal") {
    console.error(`[bridge:${diagnostic.severity}] ${diagnostic.message}`);
  }
});

server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
  console.log(`Serving static files from ${staticDir}`);
});





