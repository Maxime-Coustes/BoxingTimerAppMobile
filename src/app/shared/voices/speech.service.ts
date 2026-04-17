import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { QueueStrategy, TextToSpeech } from '@capacitor-community/text-to-speech';
import { SpeechProfile, SpeechRequest } from './speech.models';

@Injectable({
  providedIn: 'root'
})
export class SpeechService {
  readonly defaultLanguage = 'fr-FR';
  readonly combinationInstructionLanguage = 'en-US';
  readonly isNativePlatform = Capacitor.isNativePlatform();
  speechRate = 0.95;
  speechVolume = 1;
  isReady = false;
  needsVoiceInstall = false;
  statusMessage: string | null = null;

  private nativeVoiceIndexes = new Map<string, number>();
  private nativeVoiceUriIndexes = new Map<string, number>();
  private nativeVoices: SpeechSynthesisVoice[] = [];
  private browserVoices: SpeechSynthesisVoice[] = [];
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

  public async speak(input: string | SpeechRequest): Promise<void> {
    const request = this.normalizeSpeechRequest(input);

    if (!request.text.trim()) {
      return;
    }

    if (this.isNativePlatform) {
      await this.ensureVoicesLoaded();
      if (this.nativeVoices.length === 0) {
        return;
      }

      const usesDefaultSpeechProfile = !this.resolvePreferredLanguage(request);
      if (usesDefaultSpeechProfile && !this.isReady) {
        return;
      }

      await this.speakNative(request);
      return;
    }

    this.speakInBrowser(request);
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

  private async ensureVoicesLoaded(): Promise<void> {
    if (this.isNativePlatform) {
      if (this.nativeVoices.length === 0) {
        await this.loadVoices();
      }
      return;
    }

    if (this.browserVoices.length === 0 && this.preferredVoices.length === 0) {
      this.loadVoices();
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
      this.browserVoices = window.speechSynthesis.getVoices();
      this.applyVoices(this.browserVoices);
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

  private async speakNative(request: SpeechRequest): Promise<void> {
    const requestedLanguage = this.resolvePreferredLanguage(request);
    const selectedVoice = this.resolveNativeVoice(requestedLanguage);

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
        text: request.text,
        lang: selectedVoice?.lang ?? requestedLanguage ?? this.defaultLanguage,
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

  private speakInBrowser(request: SpeechRequest): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.error('Browser speech synthesis is not available.');
      return;
    }

    const requestedLanguage = this.resolvePreferredLanguage(request);
    const utterance = new SpeechSynthesisUtterance(request.text);
    const selectedVoice = this.resolveBrowserVoice(requestedLanguage);

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      utterance.lang = requestedLanguage ?? this.defaultLanguage;
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

  private normalizeSpeechRequest(input: string | SpeechRequest): SpeechRequest {
    if (typeof input === 'string') {
      return { text: input, profile: 'default' };
    }

    return {
      text: input.text,
      profile: input.profile ?? 'default',
      preferredLanguage: input.preferredLanguage,
    };
  }

  private resolvePreferredLanguage(request: SpeechRequest): string | undefined {
    return request.preferredLanguage ?? this.getPreferredLanguageForProfile(request.profile ?? 'default');
  }

  private getPreferredLanguageForProfile(profile: SpeechProfile): string | undefined {
    switch (profile) {
      case 'combat_combination_en_us':
        return this.combinationInstructionLanguage;
      case 'default':
      default:
        return undefined;
    }
  }

  private resolveNativeVoice(preferredLanguage?: string): SpeechSynthesisVoice | undefined {
    if (preferredLanguage) {
      const languageVoice = this.resolveVoiceByLanguage(this.nativeVoices, preferredLanguage);
      if (languageVoice) {
        return languageVoice;
      }
    }

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

  private resolveBrowserVoice(preferredLanguage?: string): SpeechSynthesisVoice | undefined {
    if (preferredLanguage) {
      const languageVoice = this.resolveVoiceByLanguage(this.browserVoices, preferredLanguage);
      if (languageVoice) {
        return languageVoice;
      }
    }

    const browserDefaultVoice = this.preferredVoices.find((voice) => voice.default);
    if (browserDefaultVoice) {
      return browserDefaultVoice;
    }

    return this.preferredVoices[0];
  }

  private resolveVoiceByLanguage(
    voices: SpeechSynthesisVoice[],
    preferredLanguage: string
  ): SpeechSynthesisVoice | undefined {
    const normalizedLanguage = preferredLanguage.toLowerCase();
    const languagePrefix = normalizedLanguage.split('-')[0];
    const matchingVoices = voices
      .filter((voice) => {
        const voiceLanguage = voice.lang.toLowerCase();
        return voiceLanguage === normalizedLanguage || voiceLanguage.startsWith(`${languagePrefix}-`) || voiceLanguage === languagePrefix;
      })
      .sort((a, b) => this.compareVoicePriority(a, b, preferredLanguage));

    return matchingVoices[0];
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

  private compareVoicePriority(a: SpeechSynthesisVoice, b: SpeechSynthesisVoice, preferredLanguage: string): number {
    return this.getVoiceQualityScore(b, preferredLanguage) - this.getVoiceQualityScore(a, preferredLanguage)
      || a.name.localeCompare(b.name);
  }

  private getVoiceQualityScore(voice: SpeechSynthesisVoice, preferredLanguage: string = this.defaultLanguage): number {
    const voiceName = voice.name.toLowerCase();
    const voiceUri = (voice.voiceURI ?? '').toLowerCase();
    const normalizedPreferredLanguage = preferredLanguage.toLowerCase();
    const preferredLanguagePrefix = normalizedPreferredLanguage.split('-')[0];
    let score = 0;

    if (voice.lang.toLowerCase() === normalizedPreferredLanguage) {
      score += 250;
    } else if (voice.lang.toLowerCase().startsWith(normalizedPreferredLanguage)) {
      score += 220;
    } else if (voice.lang.toLowerCase().startsWith(preferredLanguagePrefix)) {
      score += 150;
    }

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

    if (normalizedPreferredLanguage.startsWith('fr') && (voiceName.includes('france') || voiceName.includes('fr-fr'))) {
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
