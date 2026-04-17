import { Component, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatSliderModule } from '@angular/material/slider';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { ClockComponent } from '../clock/clock.component';
import { SpeechService } from '../../../app/shared/voices/speech.service';
import { InstructionsService } from '../../../app/shared/instructions/instructions.service';
import {
  COMBINATION_CATEGORIES,
  INSTRUCTION_MODES,
  CombinationCategory,
  InstructionMode,
  TechniqueGroup,
  TECHNIQUE_GROUPS,
} from '../../../app/shared/instructions/instruction.models';

@Component({
  selector: 'boxing-timer',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    MatSliderModule,
    MatButtonModule,
    MatTabsModule,
    ClockComponent,
  ],
  templateUrl: './boxing-timer.component.html',
  styleUrls: ['./boxing-timer.component.css']
})
export class BoxingTimerComponent implements AfterViewInit {
  readonly instructionModes: Array<{ value: InstructionMode; label: string }> = [
    { value: INSTRUCTION_MODES[0], label: 'Number' },
    { value: INSTRUCTION_MODES[1], label: 'Combination' },
  ];
  readonly combinationCategories: Array<{ value: CombinationCategory; label: string }> = [
    { value: COMBINATION_CATEGORIES[0], label: 'Punches only' },
    { value: COMBINATION_CATEGORIES[1], label: 'Kicks only' },
    { value: COMBINATION_CATEGORIES[2], label: 'Full contact' },
  ];
  readonly techniqueGroups: TechniqueGroup[] = TECHNIQUE_GROUPS;
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

  isCombinationMode(): boolean {
    return this.instructionService.instructionMode === 'combination';
  }

  canStartTimer(): boolean {
    if (!this.isCombinationMode()) {
      return true;
    }

    return this.instructionService.hasEnabledTechniquesForSelectedCategory();
  }

  isTechniqueEnabled(techniqueId: string): boolean {
    return this.instructionService.isTechniqueEnabled(techniqueId);
  }

  onTechniqueToggle(techniqueId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.instructionService.setTechniqueEnabled(techniqueId, input.checked);
  }

  startBoxingTimer(): void {
    if (this.isRunning || !this.canStartTimer()) {
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
    this.instructionService.speakInstruction('DING DING DING Entrainement termine!');
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
