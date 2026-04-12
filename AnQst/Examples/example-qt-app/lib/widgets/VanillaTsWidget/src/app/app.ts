import { Component, inject, signal } from '@angular/core';
import { MagicMirrorService } from 'anqst-generated/services';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  readonly service = inject(MagicMirrorService);
  /** Shown values update only from host-driven `onMagic` slot invocations. */
  readonly tick = signal(-1);
  readonly value = signal(-1);

  constructor() {
    this.service.onSlot.onMagic((magic) => {
      this.tick.set(magic.tick);
      this.value.set(magic.value);
    });
  }

  onRequestResetClick(): void {
    this.service.requestReset();
  }
}
