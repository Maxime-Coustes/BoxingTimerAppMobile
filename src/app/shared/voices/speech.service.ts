import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { QueueStrategy, TextToSpeech } from '@capacitor-community/text-to-speech';

@Injectable({
  providedIn: 'root'
})
export class SpeechService {
  readonly defaultLanguage = 'fr-FR';
  readonly isNativePlatform = Capacitor.isNativePlatform();
  speechRate = 0.95;
  speechVolume = 1;
  isReady = false;
  needsVoiceInstall = false;
  statusMessage: string | null = null;

  private nativeVoiceIndexes = new Map<string, number>();
  private nativeVoiceUriIndexes = new Map<string, number>();
  private nativeVoices: SpeechSynthesisVoice[] = [];
  private preferredVoices: SpeechSynthesisVoice[] = [];
  private browserVoicesChangeHandlerRegistered = false;

  constructor() {
    void this.loadVoices();
  }

  public async loadVoices(): Promise<void> {
    if (this.isNativePlatform) {
      await this.loadNativeVoices();
      return;
    }

    this.loadBrowserVoices();
  }

  public async ensureReady(): Promise<boolean> {
    if (this.preferredVoices.length === 0) {
      await this.loadVoices();
    }

    return this.isReady;
  }

  public async speak(text: string): Promise<void> {
    if (!text.trim()) {
      return;
    }

    if (this.isNativePlatform) {
      const ready = await this.ensureReady();
      if (!ready) {
        return;
      }
      await this.speakNative(text);
      return;
    }

    this.speakInBrowser(text);
  }

  public async stop(): Promise<void> {
    if (this.isNativePlatform) {
      try {
        await TextToSpeech.stop();
      } catch (error) {
        console.error('Failed to stop native text-to-speech.', error);
      }
      return;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public async testSpeech(): Promise<void> {
    await this.speak('Bonjour, je suis votre assistant virtuel. 1, 3, 2, 5, 4');
  }

  public async requestInstall(): Promise<void> {
    if (!this.isNativePlatform) {
      return;
    }

    try {
      await TextToSpeech.openInstall();
    } catch (error) {
      console.error('Failed to open Android text-to-speech install screen.', error);
      this.statusMessage = 'Unable to open Android text-to-speech settings on this device.';
    }
  }

  private async loadNativeVoices(): Promise<void> {
    try {
      const languageSupport = await TextToSpeech.isLanguageSupported({ lang: this.defaultLanguage });
      const { voices } = await TextToSpeech.getSupportedVoices();
      this.nativeVoices = voices;
      this.cacheNativeVoiceIndexes(voices);
      this.logNativeVoices(voices);
      this.applyVoices(voices);

      const hasFrenchVoice = this.preferredVoices.some((voice) => voice.lang.toLowerCase().startsWith('fr'));
      this.needsVoiceInstall = !languageSupport.supported || !hasFrenchVoice;
      this.isReady = !this.needsVoiceInstall;
      this.statusMessage = this.needsVoiceInstall
        ? 'French text-to-speech is not installed on this device. Install or update the Android TTS voice package.'
        : null;
    } catch (error) {
      console.error('Failed to load native text-to-speech voices.', error);
      this.nativeVoices = [];
      this.preferredVoices = [];
      this.nativeVoiceIndexes.clear();
      this.nativeVoiceUriIndexes.clear();
      this.isReady = false;
      this.needsVoiceInstall = true;
      this.statusMessage = 'Android text-to-speech is unavailable on this device. Install a TTS engine to enable voice instructions.';
    }
  }

  private loadBrowserVoices(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.error('Browser speech synthesis is not available.');
      this.preferredVoices = [];
      this.isReady = false;
      this.statusMessage = 'Browser speech synthesis is unavailable in this environment.';
      return;
    }

    const populateVoices = () => {
      this.applyVoices(window.speechSynthesis.getVoices());
      this.isReady = this.preferredVoices.length > 0;
      this.needsVoiceInstall = false;
      this.statusMessage = this.isReady ? null : 'No browser voices are available yet.';
    };

    populateVoices();

    if (!this.browserVoicesChangeHandlerRegistered) {
      window.speechSynthesis.addEventListener('voiceschanged', populateVoices);
      this.browserVoicesChangeHandlerRegistered = true;
    }
  }

  private applyVoices(voices: SpeechSynthesisVoice[]): void {
    const filteredVoices = voices
      .filter((voice) => voice.lang.toLowerCase().startsWith('fr'))
      .sort((a, b) => this.compareNativeVoicePriority(a, b));

    this.preferredVoices = filteredVoices.length > 0 ? filteredVoices : [...voices];
  }

  private async speakNative(text: string): Promise<void> {
    const selectedVoice = this.resolveNativeVoice();

    try {
      console.debug('Using Android TTS voice:', selectedVoice ? {
        name: selectedVoice.name,
        lang: selectedVoice.lang,
        voiceURI: selectedVoice.voiceURI,
        nativeIndex: this.getNativeVoiceIndex(selectedVoice),
      } : {
        lang: this.defaultLanguage,
        nativeIndex: null,
      });

      await TextToSpeech.speak({
        text,
        lang: selectedVoice?.lang ?? this.defaultLanguage,
        pitch: 0.85,
        rate: this.speechRate,
        volume: this.speechVolume,
        voice: selectedVoice ? this.getNativeVoiceIndex(selectedVoice) : undefined,
        queueStrategy: QueueStrategy.Add
      });
    } catch (error) {
      console.error('Failed to speak with native text-to-speech.', error);
      this.isReady = false;
      this.statusMessage = 'Android text-to-speech failed to start. Check the installed TTS engine and voice data.';
    }
  }

  private speakInBrowser(text: string): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.error('Browser speech synthesis is not available.');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoice = this.resolveBrowserVoice();

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      utterance.lang = this.defaultLanguage;
    }

    utterance.rate = this.speechRate;
    utterance.pitch = 0.85;
    utterance.volume = this.speechVolume;

    window.speechSynthesis.speak(utterance);
  }

  private cacheNativeVoiceIndexes(voices: SpeechSynthesisVoice[]): void {
    this.nativeVoiceIndexes.clear();
    this.nativeVoiceUriIndexes.clear();

    voices.forEach((voice, index) => {
      this.nativeVoiceIndexes.set(this.getVoiceMapKey(voice), index);
      if (voice.voiceURI) {
        this.nativeVoiceUriIndexes.set(voice.voiceURI, index);
      }
    });
  }

  private logNativeVoices(voices: SpeechSynthesisVoice[]): void {
    console.debug('Available Android TTS voices:', voices.map((voice, index) => ({
      index,
      name: voice.name,
      lang: voice.lang,
      default: voice.default,
      localService: voice.localService,
      voiceURI: voice.voiceURI,
      qualityScore: this.getVoiceQualityScore(voice),
    })));
  }

  private resolveNativeVoice(): SpeechSynthesisVoice | undefined {
    const deviceDefaultVoice = this.preferredVoices.find((voice) => voice.default && voice.lang.toLowerCase().startsWith('fr'));
    if (deviceDefaultVoice) {
      return deviceDefaultVoice;
    }

    const highQualityFrenchVoice = this.preferredVoices.find((voice) => this.getVoiceQualityScore(voice) >= 300);
    if (highQualityFrenchVoice) {
      return highQualityFrenchVoice;
    }

    const fallbackDefaultVoice = this.preferredVoices.find((voice) => voice.default);
    if (fallbackDefaultVoice) {
      return fallbackDefaultVoice;
    }

    return this.preferredVoices[0];
  }

  private resolveBrowserVoice(): SpeechSynthesisVoice | undefined {
    const browserDefaultVoice = this.preferredVoices.find((voice) => voice.default);
    if (browserDefaultVoice) {
      return browserDefaultVoice;
    }

    return this.preferredVoices[0];
  }

  private getNativeVoiceIndex(voice: SpeechSynthesisVoice): number | undefined {
    if (voice.voiceURI) {
      const voiceUriIndex = this.nativeVoiceUriIndexes.get(voice.voiceURI);
      if (voiceUriIndex !== undefined) {
        return voiceUriIndex;
      }
    }

    return this.nativeVoiceIndexes.get(this.getVoiceMapKey(voice));
  }

  private compareNativeVoicePriority(a: SpeechSynthesisVoice, b: SpeechSynthesisVoice): number {
    return this.getVoiceQualityScore(b) - this.getVoiceQualityScore(a) || a.name.localeCompare(b.name);
  }

  private getVoiceQualityScore(voice: SpeechSynthesisVoice): number {
    const voiceName = voice.name.toLowerCase();
    const voiceUri = voice.voiceURI.toLowerCase();
    let score = 0;

    if (voice.lang.toLowerCase().startsWith('fr-fr')) {
      score += 200;
    } else if (voice.lang.toLowerCase().startsWith('fr')) {
      score += 150;
    }

    if (voice.default) {
      score += 40;
    }

    if (voice.localService) {
      score += 20;
    }

    if (voiceName.includes('google')) {
      score += 120;
    }

    if (voiceName.includes('neural') || voiceName.includes('wavenet') || voiceName.includes('studio')) {
      score += 80;
    }

    if (voiceName.includes('premium') || voiceName.includes('high')) {
      score += 50;
    }

    if (voiceName.includes('france') || voiceName.includes('fr-fr')) {
      score += 25;
    }

    if (voiceUri.includes('google')) {
      score += 30;
    }

    if (voiceName.includes('arab')) {
      score -= 500;
    }

    return score;
  }

  private getVoiceMapKey(voice: SpeechSynthesisVoice): string {
    return `${voice.name}::${voice.lang}::${voice.voiceURI}`;
  }
}
