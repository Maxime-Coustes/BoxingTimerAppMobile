export const SPEECH_PROFILES = ['default', 'combat_combination_en_us'] as const;

export type SpeechProfile = (typeof SPEECH_PROFILES)[number];

export interface SpeechRequest {
  text: string;
  profile?: SpeechProfile;
  preferredLanguage?: string;
}
