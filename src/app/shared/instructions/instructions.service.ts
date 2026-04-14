import { Injectable } from '@angular/core';
import { SpeechService } from '../voices/speech.service';

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

  constructor(public speechService: SpeechService) {}

  public startInstructionTimer(currentPhase: string): void {
    if (this.noInstructions) {
      clearInterval(this.instructionId);
      return;
    }

    this.instructionTimer = setInterval(() => {
      if (currentPhase === 'Active') {
        const randomValue = Math.floor(
          Math.random() * (this.instructionMaxValue - this.instructionMinValue + 1)
        ) + this.instructionMinValue;
        this.speakInstruction(randomValue.toString());
      }
    }, this.instructionInterval * 1000);
  }

  public speakInstruction(text: string): void {
    if (this.noInstructions) {
      return;
    }

    void this.speechService.speak(text);
  }

  public stopSpeaking(): void {
    void this.speechService.stop();
  }
}
