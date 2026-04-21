import { AfterViewInit, Component } from '@angular/core';
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
  TechniqueDefinition,
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
  styleUrls: ['./boxing-timer.component.css'],
})
export class BoxingTimerComponent implements AfterViewInit {
  readonly instructionModes: Array<{ value: InstructionMode; label: string }> = [
    { value: INSTRUCTION_MODES[0], label: 'Number' },
    { value: INSTRUCTION_MODES[1], label: 'Combination' },
  ];
  readonly combinationCategories: Array<{ value: CombinationCategory; label: string }> = [
    { value: COMBINATION_CATEGORIES[0], label: 'Punches' },
    { value: COMBINATION_CATEGORIES[1], label: 'Kicks' },
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
  workoutCompleted = false;
  private timer: any;

  constructor(
    public speechService: SpeechService,
    public instructionService: InstructionsService
  ) {}

  ngAfterViewInit(): void {
    void this.speechService.loadVoices();
  }

  get timerStateLabel(): string {
    if (this.isPaused) {
      return 'Paused';
    }

    if (this.isRunning) {
      return this.currentPhase;
    }

    if (this.workoutCompleted) {
      return 'Finished';
    }

    return 'Ready';
  }

  get primaryActionLabel(): string {
    if (this.workoutCompleted) {
      return 'Restart';
    }

    if (this.isPaused) {
      return 'Resume';
    }

    if (this.isRunning) {
      return 'Pause';
    }

    return 'Start';
  }

  get primaryActionIcon(): string {
    if (this.workoutCompleted) {
      return '↻';
    }

    if (this.isPaused) {
      return '▶';
    }

    if (this.isRunning) {
      return '❚❚';
    }

    return '▶';
  }

  get isPrimaryActionDisabled(): boolean {
    return !this.isRunning && !this.isPaused && !this.workoutCompleted && !this.canStartTimer();
  }

  get visibleTechniqueGroups(): TechniqueGroup[] {
    if (!this.isCombinationMode()) {
      return [];
    }

    if (this.instructionService.combinationCategory === 'punches_only') {
      return this.techniqueGroups.filter((group) => group.family === 'punch');
    }

    if (this.instructionService.combinationCategory === 'kicks_only') {
      return this.techniqueGroups.filter((group) => group.family === 'kick');
    }

    return this.techniqueGroups;
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

  isFullContactMode(): boolean {
    return this.isCombinationMode() && this.instructionService.combinationCategory === 'full_contact';
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

  setInstructionMode(mode: InstructionMode): void {
    if (this.instructionService.noInstructions) {
      return;
    }

    this.instructionService.instructionMode = mode;
  }

  setCombinationCategory(category: CombinationCategory): void {
    if (this.instructionService.noInstructions) {
      return;
    }

    this.instructionService.combinationCategory = category;
  }

  toggleTechnique(techniqueId: string): void {
    if (this.instructionService.noInstructions) {
      return;
    }

    this.instructionService.setTechniqueEnabled(techniqueId, !this.isTechniqueEnabled(techniqueId));
  }

  selectAllVisibleTechniques(): void {
    this.updateVisibleTechniques(true);
  }

  resetVisibleTechniques(): void {
    this.updateVisibleTechniques(false);
  }

  handlePrimaryAction(): void {
    if (this.workoutCompleted) {
      this.workoutCompleted = false;
      this.startBoxingTimer();
      return;
    }

    if (this.isPaused) {
      this.resumeTimer();
      return;
    }

    if (this.isRunning) {
      this.pauseTimer();
      return;
    }

    this.startBoxingTimer();
  }

  adjustInstructionInterval(delta: number): void {
    this.instructionService.instructionInterval = Math.max(1, this.instructionService.instructionInterval + delta);
  }

  adjustInstructionMin(delta: number): void {
    const nextValue = Math.max(1, this.instructionService.instructionMinValue + delta);
    this.instructionService.instructionMinValue = Math.min(nextValue, this.instructionService.instructionMaxValue);
  }

  adjustInstructionMax(delta: number): void {
    const nextValue = Math.max(1, this.instructionService.instructionMaxValue + delta);
    this.instructionService.instructionMaxValue = Math.max(nextValue, this.instructionService.instructionMinValue);
  }

  adjustActiveTime(delta: number): void {
    this.activeTime = Math.max(1, this.activeTime + delta);
  }

  adjustRestTime(delta: number): void {
    this.restTime = Math.max(0, this.restTime + delta);
  }

  adjustRounds(delta: number): void {
    this.rounds = Math.max(1, this.rounds + delta);
  }

  startBoxingTimer(): void {
    if (this.isRunning || !this.canStartTimer()) {
      return;
    }

    this.workoutCompleted = false;
    this.isRunning = true;
    this.timeLeft = this.getPhaseDuration();
    this.currentRound = 1;

    this.playPhaseStart();
    this.startTimer();
  }

  resetTimer(markCompleted = false): void {
    this.stopTimers();
    this.instructionService.stopSpeaking();
    this.timeLeft = 0;
    this.currentRound = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.currentPhase = 'Active';
    this.workoutCompleted = markCompleted;
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

  trackTechnique(_: number, technique: TechniqueDefinition): string {
    return technique.id;
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
    this.resetTimer(true);
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

  private updateVisibleTechniques(enabled: boolean): void {
    if (this.instructionService.noInstructions) {
      return;
    }

    this.visibleTechniqueGroups.forEach((group) => {
      group.techniques.forEach((technique) => {
        this.instructionService.setTechniqueEnabled(technique.id, enabled);
      });
    });
  }
}
