import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DemoBehaviorService } from '../anqst-generated/index';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly callUserName = signal('AngularUser');
  protected readonly callResult = signal('<pending>');
  protected readonly callSyncSeed = signal(10);
  protected readonly callSyncResult = signal('<pending>');
  protected readonly slotMessage = signal('slot round-trip');
  protected readonly slotResult = signal('<pending>');
  protected readonly telemetryTag = signal('session');
  protected readonly telemetryValue = signal(1);
  protected readonly typedInputValue = signal('input from angular');

  constructor(private readonly demoService: DemoBehaviorService) {
    this.demoService.onSlot.slotPrompt((message: string): string => {
      this.slotMessage.set(message);
      const result = `angular-handled:${message}`;
      this.slotResult.set(result);
      return result;
    });
  }

  protected async invokeCall(): Promise<void> {
    this.callResult.set(await this.demoService.callGreeting(this.callUserName()));
  }

  protected invokeCallSync(): void {
    try {
      this.callSyncResult.set(String(this.demoService.callSyncNextCounter(this.callSyncSeed())));
    } catch (error) {
      this.callSyncResult.set(`CallSync error: ${String(error)}`);
    }
  }

  protected emitTelemetry(): void {
    this.demoService.emitterTelemetry(this.telemetryTag(), this.telemetryValue());
  }

  protected pushInput(): void {
    this.demoService.set.inputTypedValue(this.typedInputValue());
  }

  protected outputValue(): string {
    return this.demoService.outputParentState() ?? '<unset>';
  }
}
