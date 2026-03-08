import type {
  UserManagementSessionBridge
} from "../../frontend/AnQst/generated/backend/node/express/UserManagement_anQst/index";
import { UserManagementState } from "./user-management-state";

export function syncOutputs(
  sessions: Record<string, UserManagementSessionBridge>,
  state: UserManagementState,
  connectionState: string
): void {
  const snapshot = state.listUsersSorted();
  const activeEditors = state.listActiveEditors();
  for (const session of Object.values(sessions)) {
    const service = session.UserManagement.UserManagementService;
    service.property.connectionState.set(connectionState);
    service.property.usersSnapshot.set(snapshot);
    service.property.userCount.set(snapshot.length);
    service.property.activeEditors.set(activeEditors);
    service.property.latestAudit.set(state.latestAudit);
  }
}

