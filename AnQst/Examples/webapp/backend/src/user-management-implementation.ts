import type {
  AuditLevel,
  CreateUserRequest,
  CreateUserResult,
  UpdateUserRequest,
  UpdateUserResult,
  UserFilter,
  UserManagementHandlerBridge,
  UserManagementNodeImplementation
} from "../../frontend/AnQst/generated/backend/node/express/UserManagement_anQst/index";
import { syncOutputs } from "./bridge-sync";
import { UserManagementState } from "./user-management-state";

export function createUserManagementImplementation(
  state: UserManagementState
): UserManagementNodeImplementation {
  return {
    UserManagementService: {
      createUser(bridge: UserManagementHandlerBridge, request: CreateUserRequest): CreateUserResult {
        const result = state.createUser(request);
        if (result.created) {
          state.setAudit("info", `User created: ${result.user.displayName}`);
          syncOutputs(bridge.sessions, state, `user created:${result.user.id}`);
        }
        return result;
      },

      updateUser(bridge: UserManagementHandlerBridge, request: UpdateUserRequest): UpdateUserResult {
        const result = state.updateUser(request);
        if (result.updated) {
          state.setAudit("info", `User updated: ${result.user.displayName}`);
          syncOutputs(bridge.sessions, state, `user updated:${result.user.id}`);
        }
        return result;
      },

      listUsers(_bridge: UserManagementHandlerBridge, filter: UserFilter) {
        return state.listUsers(filter);
      },

      emitAuditEvent(bridge: UserManagementHandlerBridge, level: AuditLevel, message: string) {
        state.setAudit(level, message.trim() || "No message provided");
        console.log(`[audit:${level}] ${state.latestAudit.message}`);
        syncOutputs(bridge.sessions, state, "audit event received");
      },

      beginEditing(bridge: UserManagementHandlerBridge, userId: string, editorId: string) {
        const result = state.beginEditing(userId, editorId);
        if (result === "invalid_user") {
          state.setAudit("warn", `Edit presence ignored: user ${userId} does not exist`);
          syncOutputs(bridge.sessions, state, "edit presence invalid user");
          return;
        }
        if (result === "missing_editor") {
          state.setAudit("warn", "Edit presence ignored: missing editor id");
          syncOutputs(bridge.sessions, state, "edit presence missing editor id");
          return;
        }
        const peerCount = Object.keys(bridge.others).length;
        state.setAudit("info", `Editor ${editorId} started editing ${userId} (${peerCount} peer sessions)`);
        syncOutputs(bridge.sessions, state, `editor started:${userId}`);
      },

      endEditing(bridge: UserManagementHandlerBridge, userId: string, editorId: string) {
        state.endEditing(userId, editorId);
        state.setAudit("info", `Editor ${editorId} stopped editing ${userId || "<all>"}`);
        syncOutputs(bridge.sessions, state, `editor stopped:${userId}`);
      },

      async selectedUserId(bridge: UserManagementHandlerBridge, value: string) {
        state.lastSelectedUserId = value;
        try {
          const reply = await bridge.own.UserManagement.UserManagementService.promptForReauthentication(
            `selection:${value}`
          );
          state.setAudit("info", `Reauth slot reply: ${reply}`);
        } catch {
          state.setAudit("warn", `Reauth slot unavailable for ${value}`);
        }
        syncOutputs(bridge.sessions, state, `selected user changed to ${value}`);
      }
    }
  };
}

