import type {
  UserManagementSessionBridge
} from "../../frontend/generated_output/UserManagement_node_express_ws/index";
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

