import { Component, inject, OnDestroy, signal } from '@angular/core';
import { MagicTickerService } from 'anqst-generated/services';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnDestroy {
  readonly service = inject(MagicTickerService);
  readonly tick = signal(0);
  readonly value = signal(0);

  private timerId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.service.onSlot.reset(() => {
      this.applyReset();
    });
    this.startTicker();
  }

  ngOnDestroy(): void {
    this.stopTicker();
  }

  private randomValue(): number {
    return Math.floor(Math.random() * 1_000_000);
  }

  private emitMagic(): void {
    this.service.newMagic({ tick: this.tick(), value: this.value() });
  }

  private tickOnce(): void {
    this.tick.update((t) => t + 1);
    this.value.set(this.randomValue());
    this.emitMagic();
  }

  private stopTicker(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private startTicker(): void {
    this.stopTicker();
    this.timerId = setInterval(() => this.tickOnce(), 1000);
  }

  private applyReset(): void {
    this.stopTicker();
    this.tick.set(0);
    this.value.set(this.randomValue());
    this.emitMagic();
    this.startTicker();
  }
}
