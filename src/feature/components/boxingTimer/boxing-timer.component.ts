import { Component, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatSliderModule } from '@angular/material/slider';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTabsModule } from '@angular/material/tabs';
import { ClockComponent } from '../clock/clock.component';
import { SpeechService } from '../../../app/shared/voices/speech.service';
import { InstructionsService } from '../../../app/shared/instructions/instructions.service';

@Component({
  selector: 'boxing-timer',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    MatSliderModule,
    MatButtonModule,
    MatExpansionModule,
    MatTabsModule,
    ClockComponent,
  ],
  templateUrl: './boxing-timer.component.html',
  styleUrls: ['./boxing-timer.component.css']
})
export class BoxingTimerComponent implements AfterViewInit {
  activeTime = 180;
  restTime = 60;
  rounds = 3;

  timeLeft = 0;
  currentRound = 0;
  isRunning = false;
  isPaused = false;
  currentPhase: 'Active' | 'Rest' = 'Active';
  private timer: any;

  constructor(public speechService: SpeechService, public instructionService: InstructionsService) {}

  ngAfterViewInit(): void {
    void this.speechService.loadVoices();
  }

  testSpeech(): void {
    if (this.speechService.isReady) {
      void this.speechService.testSpeech();
    }
  }

  openTtsInstall(): void {
    void this.speechService.requestInstall();
  }

  startBoxingTimer(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.timeLeft = this.getPhaseDuration();
    this.currentRound = 1;

    this.playPhaseStart();
    this.startTimer();
  }

  resetTimer(): void {
    this.stopTimers();
    this.instructionService.stopSpeaking();
    this.timeLeft = 0;
    this.currentRound = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.currentPhase = 'Active';
  }

  pauseTimer(): void {
    if (this.isRunning && !this.isPaused) {
      this.stopTimers();
      this.instructionService.stopSpeaking();
      this.isPaused = true;
    }
  }

  resumeTimer(): void {
    if (this.isRunning && this.isPaused) {
      this.isPaused = false;
      this.startTimer();
    }
  }

  stopTimer(): void {
    this.resetTimer();
  }

  private startTimer(): void {
    this.timer = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;

        if (this.isRestPhase() && this.timeLeft <= 5 && this.timeLeft > 0) {
          this.instructionService.speakInstruction(this.timeLeft.toString());
        }
      } else {
        this.handlePhaseChange();
      }
    }, 1000);
  }

  private handlePhaseChange(): void {
    if (this.isActivePhase()) {
      this.switchToRestPhase();
    } else if (this.currentRound < this.rounds) {
      this.switchToActivePhase();
    } else {
      this.endWorkout();
    }
  }

  private switchToActivePhase(): void {
    this.currentPhase = 'Active';
    this.currentRound++;
    this.timeLeft = this.activeTime;
    this.playPhaseStart();
  }

  private switchToRestPhase(): void {
    this.currentPhase = 'Rest';
    this.timeLeft = this.restTime;
    this.stopInstructionTimer();
    this.instructionService.speakInstruction(`Repos pendant ${this.restTime} secondes`);
  }

  private endWorkout(): void {
    this.instructionService.speakInstruction('DING DING DING Entrainement terminé!');
    this.stopTimer();
  }

  private playPhaseStart(): void {
    const message = this.isActivePhase() ? 'Boxez !' : `Repos pendant ${this.restTime} secondes`;
    this.instructionService.speakInstruction(message);

    if (this.isActivePhase()) {
      this.instructionService.startInstructionTimer(this.currentPhase);
    }
  }

  private stopTimers(): void {
    clearInterval(this.timer);
    this.stopInstructionTimer();
  }

  private stopInstructionTimer(): void {
    clearInterval(this.instructionService.instructionTimer);
  }

  private getPhaseDuration(): number {
    return this.isActivePhase() ? this.activeTime : this.restTime;
  }

  private isActivePhase(): boolean {
    return this.currentPhase === 'Active';
  }

  private isRestPhase(): boolean {
    return this.currentPhase === 'Rest';
  }
}
