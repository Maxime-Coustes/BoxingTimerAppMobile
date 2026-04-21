import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { WheelTimer } from './shared/wheel-timer/wheel-timer.component';
import { BoxingTimerComponent } from '../feature/components/boxingTimer/boxing-timer.component';
import { TabataComponent } from '../feature/components/tabata/tabata.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [CommonModule, BoxingTimerComponent, WheelTimer, TabataComponent],
})
export class AppComponent {
  activeScreenIndex = 0;
  readonly screens = ['Training', 'Timer', 'Tabata'];

  scrollLeft(): void {
    const container = document.querySelector('.content-container') as HTMLElement | null;
    if (!container) {
      return;
    }

    container.scrollBy({ left: -container.offsetWidth, behavior: 'smooth' });
  }

  scrollRight(): void {
    const container = document.querySelector('.content-container') as HTMLElement | null;
    if (!container) {
      return;
    }

    container.scrollBy({ left: container.offsetWidth, behavior: 'smooth' });
  }

  scrollToScreen(index: number): void {
    const container = document.querySelector('.content-container') as HTMLElement | null;
    if (!container) {
      return;
    }

    this.activeScreenIndex = index;
    container.scrollTo({ left: container.offsetWidth * index, behavior: 'smooth' });
  }

  onScroll(event: Event): void {
    const container = event.target as HTMLElement | null;
    if (!container || container.offsetWidth === 0) {
      return;
    }

    this.activeScreenIndex = Math.round(container.scrollLeft / container.offsetWidth);
  }
}
