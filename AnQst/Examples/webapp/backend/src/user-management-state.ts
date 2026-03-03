import type {
  AuditLevel,
  AuditNotice,
  CreateUserRequest,
  CreateUserResult,
  UpdateUserRequest,
  UpdateUserResult,
  UserEditorPresence,
  UserFilter,
  UserRecord
} from "../../frontend/generated_output/UserManagement_node_express_ws/index";

export class UserManagementState {
  private readonly users = new Map<string, UserRecord>([
    [
      "user-1",
      {
        id: "user-1",
        displayName: "Ada Lovelace",
        role: "Admin",
        active: true,
        loginCount: 42
      }
    ],
    [
      "user-2",
      {
        id: "user-2",
        displayName: "Grace Hopper",
        role: "Editor",
        active: true,
        loginCount: 17
      }
    ],
    [
      "user-3",
      {
        id: "user-3",
        displayName: "Alan Turing",
        role: "Viewer",
        active: false,
        loginCount: 8
      }
    ]
  ]);

  private readonly editorPresenceByUser = new Map<string, Set<string>>();

  lastSelectedUserId = "user-1";
  latestAudit: AuditNotice = {
    level: "info",
    message: "Bridge initialized",
    atIso: new Date().toISOString()
  };

  setAudit(level: AuditLevel, message: string): void {
    this.latestAudit = {
      level,
      message,
      atIso: new Date().toISOString()
    };
  }

  listUsersSorted(): UserRecord[] {
    return [...this.users.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  listUsers(filter: UserFilter): UserRecord[] {
    const search = filter.search.trim().toLowerCase();
    return this.listUsersSorted().filter((user) => {
      if (!filter.includeInactive && !user.active) {
        return false;
      }
      if (search.length > 0 && !user.displayName.toLowerCase().includes(search)) {
        return false;
      }
      return true;
    });
  }

  createUser(request: CreateUserRequest): CreateUserResult {
    const displayName = request.displayName.trim();
    if (displayName.length === 0) {
      return {
        created: false,
        user: {
          id: "",
          displayName: "",
          role: request.role,
          active: false,
          loginCount: 0
        },
        reason: "Display name is required."
      };
    }

    const duplicate = [...this.users.values()].find(
      (u) => u.displayName.toLowerCase() === displayName.toLowerCase()
    );
    if (duplicate) {
      return { created: false, user: duplicate, reason: "User already exists." };
    }

    const id = `user-${this.users.size + 1}`;
    const user: UserRecord = {
      id,
      displayName,
      role: request.role,
      active: true,
      loginCount: 0
    };
    this.users.set(id, user);
    return { created: true, user };
  }

  updateUser(request: UpdateUserRequest): UpdateUserResult {
    const existing = this.users.get(request.id);
    if (existing === undefined) {
      return {
        updated: false,
        user: {
          id: request.id,
          displayName: request.displayName,
          role: request.role,
          active: request.active,
          loginCount: 0
        },
        reason: "User not found."
      };
    }

    const displayName = request.displayName.trim();
    if (displayName.length === 0) {
      return {
        updated: false,
        user: existing,
        reason: "Display name is required."
      };
    }

    const duplicate = [...this.users.values()].find(
      (u) => u.id !== request.id && u.displayName.toLowerCase() === displayName.toLowerCase()
    );
    if (duplicate) {
      return {
        updated: false,
        user: existing,
        reason: "Another user already has that display name."
      };
    }

    const updated: UserRecord = {
      ...existing,
      displayName,
      role: request.role,
      active: request.active
    };
    this.users.set(updated.id, updated);
    return { updated: true, user: updated };
  }

  beginEditing(userId: string, editorId: string): "ok" | "invalid_user" | "missing_editor" {
    if (!this.users.has(userId)) return "invalid_user";
    if (editorId.trim().length === 0) return "missing_editor";
    this.upsertEditorPresence(userId, editorId);
    return "ok";
  }

  endEditing(userId: string, editorId: string): void {
    if (editorId.trim().length === 0) return;
    this.removeEditorPresence(userId, editorId);
  }

  listActiveEditors(): UserEditorPresence[] {
    return [...this.editorPresenceByUser.entries()]
      .map(([userId, editorIds]) => ({ userId, editorCount: editorIds.size }))
      .sort((a, b) => a.userId.localeCompare(b.userId));
  }

  private removeEditorFromAllUsers(editorId: string, exceptUserId?: string): void {
    for (const [userId, editorIds] of this.editorPresenceByUser.entries()) {
      if (exceptUserId !== undefined && userId === exceptUserId) {
        continue;
      }
      editorIds.delete(editorId);
      if (editorIds.size === 0) {
        this.editorPresenceByUser.delete(userId);
      }
    }
  }

  private upsertEditorPresence(userId: string, editorId: string): void {
    this.removeEditorFromAllUsers(editorId, userId);
    const editors = this.editorPresenceByUser.get(userId) ?? new Set<string>();
    editors.add(editorId);
    this.editorPresenceByUser.set(userId, editors);
  }

  private removeEditorPresence(userId: string, editorId: string): void {
    if (userId.length === 0) {
      this.removeEditorFromAllUsers(editorId);
      return;
    }
    const editors = this.editorPresenceByUser.get(userId);
    if (editors === undefined) {
      return;
    }
    editors.delete(editorId);
    if (editors.size === 0) {
      this.editorPresenceByUser.delete(userId);
    }
  }
}

