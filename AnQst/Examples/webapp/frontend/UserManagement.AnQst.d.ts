import { AnQst } from './node_modules/@dusted/anqst/spec/AnQst-Spec-DSL';

declare namespace UserManagement {
  type UserRole = "Admin" | "Editor" | "Viewer";
  type AuditLevel = "info" | "warn" | "error";

  interface UserRecord {
    id: string;
    displayName: string;
    role: UserRole;
    active: boolean;
    loginCount: number;
  }

  interface UserFilter {
    search: string;
    includeInactive: boolean;
  }

  interface CreateUserRequest {
    displayName: string;
    role: UserRole;
  }

  interface CreateUserResult {
    created: boolean;
    user: UserRecord;
    reason?: string;
  }

  interface UpdateUserRequest {
    id: string;
    displayName: string;
    role: UserRole;
    active: boolean;
  }

  interface UpdateUserResult {
    updated: boolean;
    user: UserRecord;
    reason?: string;
  }

  interface UserEditorPresence {
    userId: string;
    editorCount: number;
  }

  interface AuditNotice {
    level: AuditLevel;
    message: string;
    atIso: string;
  }

  interface UserManagementService extends AnQst.Service {
    createUser(request: CreateUserRequest): AnQst.Call<CreateUserResult>;
    updateUser(request: UpdateUserRequest): AnQst.Call<UpdateUserResult>;
    listUsers(filter: UserFilter): AnQst.Call<UserRecord[]>;

    promptForReauthentication(reason: string): AnQst.Slot<string>;

    emitAuditEvent(level: AuditLevel, message: string): AnQst.Emitter;
    beginEditing(userId: string, editorId: string): AnQst.Emitter;
    endEditing(userId: string, editorId: string): AnQst.Emitter;

    selectedUserId: AnQst.Input<string>;

    connectionState: AnQst.Output<string>;
    usersSnapshot: AnQst.Output<UserRecord[]>;
    userCount: AnQst.Output<number>;
    activeEditors: AnQst.Output<UserEditorPresence[]>;
    latestAudit: AnQst.Output<AuditNotice>;
  }
}
