import { Component, OnDestroy, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserManagementService } from '../anqst-generated/services';
import type {
  AuditNotice,
  CreateUserResult,
  UpdateUserResult,
  UserEditorPresence,
  UserRole,
  UserRecord
} from '../anqst-generated/types';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnDestroy {
  private readonly editorId = this.createEditorId();
  private currentEditingUserId: string | null = null;

  protected readonly filterSearch = signal('');
  protected readonly includeInactive = signal(false);
  protected readonly formMode = signal<'create' | 'edit'>('create');
  protected readonly selectedUserId = signal<string | null>(null);
  protected readonly formName = signal('');
  protected readonly formRole = signal<UserRole>('Editor');
  protected readonly formActive = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly formNotice = signal<string>('');
  protected readonly lastCreateResult = signal<CreateUserResult | null>(null);
  protected readonly lastUpdateResult = signal<UpdateUserResult | null>(null);

  protected readonly slotReason = signal('<none yet>');
  protected readonly slotReply = signal('<none yet>');

  protected readonly filteredUsers = computed(() => {
    const search = this.filterSearch().trim().toLowerCase();
    return this.currentUsersSnapshot().filter((user) => {
      if (!this.includeInactive() && !user.active) {
        return false;
      }
      if (search.length > 0 && !user.displayName.toLowerCase().includes(search)) {
        return false;
      }
      return true;
    });
  });

  constructor(private readonly userManagementService: UserManagementService) {
    this.userManagementService.onSlot.promptForReauthentication((reason: string): string => {
      this.slotReason.set(reason);
      const reply = `frontend-confirmed:${reason}`;
      this.slotReply.set(reply);
      return reply;
    });
  }

  ngOnDestroy(): void {
    this.clearEditingPresence();
  }

  protected enterCreateMode(): void {
    this.formMode.set('create');
    this.selectedUserId.set(null);
    this.formName.set('');
    this.formRole.set('Editor');
    this.formActive.set(true);
    this.formNotice.set('');
    this.userManagementService.set.selectedUserId('');
    this.setEditingPresence(null);
  }

  protected selectUser(user: UserRecord): void {
    this.formMode.set('edit');
    this.selectedUserId.set(user.id);
    this.formName.set(user.displayName);
    this.formRole.set(user.role);
    this.formActive.set(user.active);
    this.formNotice.set('');
    this.userManagementService.set.selectedUserId(user.id);
    this.setEditingPresence(user.id);
  }

  protected async submitForm(): Promise<void> {
    if (this.isSubmitting()) {
      return;
    }
    const displayName = this.formName().trim();
    if (displayName.length === 0) {
      this.formNotice.set('Display name is required.');
      return;
    }

    this.isSubmitting.set(true);
    this.formNotice.set('');
    try {
      if (this.formMode() === 'create') {
        const result = await this.userManagementService.createUser({
          displayName,
          role: this.formRole()
        });
        this.lastCreateResult.set(result);
        if (result.created) {
          this.formNotice.set(`Created user ${result.user.displayName}.`);
          this.selectUser(result.user);
        } else {
          this.formNotice.set(result.reason ?? 'Unable to create user.');
        }
      } else {
        const selected = this.selectedUserId();
        if (selected === null) {
          this.formNotice.set('Select a user to edit first.');
          return;
        }
        const result = await this.userManagementService.updateUser({
          id: selected,
          displayName,
          role: this.formRole(),
          active: this.formActive()
        });
        this.lastUpdateResult.set(result);
        if (result.updated) {
          this.formNotice.set(`Saved changes for ${result.user.displayName}.`);
          this.selectUser(result.user);
        } else {
          this.formNotice.set(result.reason ?? 'Unable to update user.');
        }
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected userCount(): number {
    return this.safeRead(() => this.userManagementService.userCount(), this.currentUsersSnapshot().length);
  }

  protected activeEditorCount(userId: string): number {
    const activeEditors = this.safeRead(() => this.userManagementService.activeEditors(), [] as UserEditorPresence[]);
    const match = activeEditors.find((entry) => entry.userId === userId);
    return match?.editorCount ?? 0;
  }

  protected currentConnectionState(): string {
    return this.safeRead(() => this.userManagementService.connectionState(), 'connecting...');
  }

  protected currentUsersSnapshot(): UserRecord[] {
    return this.safeRead(() => this.userManagementService.usersSnapshot(), []);
  }

  protected latestAudit(): AuditNotice | null {
    return this.safeRead(() => this.userManagementService.latestAudit(), null);
  }

  protected currentLatestAudit(): string {
    const audit = this.latestAudit();
    if (audit === null) return '<unset>';
    return `[${audit.level}] ${audit.message} @ ${audit.atIso}`;
  }

  protected formTitle(): string {
    return this.formMode() === 'create' ? 'Create user' : 'Edit user';
  }

  protected submitLabel(): string {
    if (this.isSubmitting()) {
      return 'Saving...';
    }
    return this.formMode() === 'create' ? 'Create user' : 'Save changes';
  }

  protected canSubmit(): boolean {
    if (this.isSubmitting()) {
      return false;
    }
    if (this.formName().trim().length === 0) {
      return false;
    }
    if (this.formMode() === 'edit' && this.selectedUserId() === null) {
      return false;
    }
    return true;
  }

  protected selectedUserDisplayName(): string {
    const selected = this.selectedUserId();
    if (selected === null) {
      return '<none>';
    }
    return this.currentUsersSnapshot().find((user) => user.id === selected)?.displayName ?? selected;
  }

  private clearEditingPresence(): void {
    if (this.currentEditingUserId !== null) {
      this.userManagementService.endEditing(this.currentEditingUserId, this.editorId);
      this.currentEditingUserId = null;
    } else {
      this.userManagementService.endEditing('', this.editorId);
    }
  }

  private setEditingPresence(nextUserId: string | null): void {
    if (this.currentEditingUserId === nextUserId) {
      return;
    }
    if (this.currentEditingUserId !== null) {
      this.userManagementService.endEditing(this.currentEditingUserId, this.editorId);
    }
    this.currentEditingUserId = nextUserId;
    if (nextUserId !== null) {
      this.userManagementService.beginEditing(nextUserId, this.editorId);
    } else {
      this.userManagementService.endEditing('', this.editorId);
    }
  }

  private createEditorId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `editor-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }

  private safeRead<T>(reader: () => T, fallback: T): T {
    try {
      return reader();
    } catch {
      return fallback;
    }
  }
}
