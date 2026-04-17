import { Injectable } from '@angular/core';
import { SpeechService } from '../voices/speech.service';
import {
  COMBINATION_INSTRUCTION_SPEECH_PROFILE,
  CombinationCategory,
  GeneratedInstruction,
  InstructionMode,
  TechniqueDefinition,
  TechniqueFamily,
  TECHNIQUE_CATALOG,
} from './instruction.models';
import { SpeechRequest } from '../voices/speech.models';

@Injectable({
  providedIn: 'root'
})
export class InstructionsService {
  noInstructions = false;
  instructionId: any;
  instructionInterval = 3;
  instructionMinValue = 3;
  instructionMaxValue = 6;
  instructionTimer: any;
  instructionMode: InstructionMode = 'number';
  combinationCategory: CombinationCategory = 'punches_only';
  readonly techniqueCatalog = TECHNIQUE_CATALOG;
  readonly enabledTechniqueIds = new Set<string>(this.techniqueCatalog.map((technique) => technique.id));

  private hasAnnouncedInvalidCombinationSelection = false;

  constructor(public speechService: SpeechService) {}

  public startInstructionTimer(currentPhase: string): void {
    if (this.noInstructions) {
      clearInterval(this.instructionId);
      return;
    }

    this.hasAnnouncedInvalidCombinationSelection = false;
    this.instructionTimer = setInterval(() => {
      if (currentPhase === 'Active') {
        const instruction = this.generateInstruction();
        if (instruction) {
          this.speakInstruction(instruction);
        } else {
          this.announceInvalidCombinationSelectionOnce();
        }
      }
    }, this.instructionInterval * 1000);
  }

  public speakInstruction(instruction: string | GeneratedInstruction): void {
    if (this.noInstructions) {
      return;
    }

    void this.speechService.speak(this.toSpeechRequest(instruction));
  }

  public stopSpeaking(): void {
    void this.speechService.stop();
  }

  public isTechniqueEnabled(techniqueId: string): boolean {
    return this.enabledTechniqueIds.has(techniqueId);
  }

  public setTechniqueEnabled(techniqueId: string, enabled: boolean): void {
    if (!this.techniqueCatalog.some((technique) => technique.id === techniqueId)) {
      return;
    }

    if (enabled) {
      this.enabledTechniqueIds.add(techniqueId);
      this.hasAnnouncedInvalidCombinationSelection = false;
      return;
    }

    this.enabledTechniqueIds.delete(techniqueId);
  }

  public hasEnabledTechniquesForSelectedCategory(): boolean {
    return this.getTechniquesForCategory().length > 0;
  }

  public getInvalidCombinationSelectionMessage(): string {
    switch (this.combinationCategory) {
      case 'kicks_only':
        return 'Enable at least one kick to use kick combinations.';
      case 'full_contact':
        return 'Enable at least one punch or kick to use full contact combinations.';
      case 'punches_only':
      default:
        return 'Enable at least one punch to use punch combinations.';
    }
  }

  private generateInstruction(): GeneratedInstruction | null {
    switch (this.instructionMode) {
      case 'combination':
        return this.generateCombinationInstruction();
      case 'number':
      default:
        return this.generateNumberInstruction();
    }
  }

  private generateNumberInstruction(): GeneratedInstruction {
    return {
      text: this.getRandomInstructionCount().toString(),
    };
  }

  private generateCombinationInstruction(): GeneratedInstruction | null {
    const techniques = this.getTechniquesForCategory();
    if (techniques.length === 0) {
      return null;
    }

    const techniqueCount = this.getRandomInstructionCount();
    const combination = Array.from({ length: techniqueCount }, () => this.getRandomTechnique(techniques));

    return {
      text: combination.join(', '),
      speechProfile: COMBINATION_INSTRUCTION_SPEECH_PROFILE,
    };
  }

  private getRandomInstructionCount(): number {
    const minValue = Math.max(1, Math.min(this.instructionMinValue, this.instructionMaxValue));
    const maxValue = Math.max(minValue, Math.max(this.instructionMinValue, this.instructionMaxValue));

    return Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue;
  }

  private getTechniquesForCategory(): TechniqueDefinition[] {
    switch (this.combinationCategory) {
      case 'kicks_only':
        return this.getEnabledTechniquesByFamily('kick');
      case 'full_contact':
        return this.getEnabledTechniquesByFamily();
      case 'punches_only':
      default:
        return this.getEnabledTechniquesByFamily('punch');
    }
  }

  private getEnabledTechniquesByFamily(family?: TechniqueFamily): TechniqueDefinition[] {
    return this.techniqueCatalog.filter((technique) =>
      this.enabledTechniqueIds.has(technique.id) && (!family || technique.family === family)
    );
  }

  private getRandomTechnique(techniques: TechniqueDefinition[]): string {
    if (techniques.length === 0) {
      return '';
    }

    const randomIndex = Math.floor(Math.random() * techniques.length);
    return techniques[randomIndex].label;
  }

  private announceInvalidCombinationSelectionOnce(): void {
    if (this.hasAnnouncedInvalidCombinationSelection) {
      return;
    }

    this.hasAnnouncedInvalidCombinationSelection = true;
    this.speakInstruction(this.getInvalidCombinationSelectionMessage());
  }

  private toSpeechRequest(instruction: string | GeneratedInstruction): SpeechRequest {
    if (typeof instruction === 'string') {
      return { text: instruction };
    }

    return {
      text: instruction.text,
      profile: instruction.speechProfile ?? 'default',
    };
  }
}
