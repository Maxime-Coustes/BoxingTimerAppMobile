import { SpeechProfile } from '../voices/speech.models';

export const INSTRUCTION_MODES = ['number', 'combination'] as const;

export type InstructionMode = (typeof INSTRUCTION_MODES)[number];

export const COMBINATION_CATEGORIES = ['punches_only', 'kicks_only', 'full_contact'] as const;

export type CombinationCategory = (typeof COMBINATION_CATEGORIES)[number];

export const TECHNIQUE_FAMILIES = ['punch', 'kick'] as const;

export type TechniqueFamily = (typeof TECHNIQUE_FAMILIES)[number];

export interface TechniqueDefinition {
  id: string;
  label: string;
  family: TechniqueFamily;
}

export interface TechniqueGroup {
  family: TechniqueFamily;
  label: string;
  techniques: TechniqueDefinition[];
}

export interface GeneratedInstruction {
  text: string;
  speechProfile?: SpeechProfile;
}

export const COMBINATION_INSTRUCTION_SPEECH_PROFILE: SpeechProfile = 'combat_combination_en_us';

export const TECHNIQUE_CATALOG: TechniqueDefinition[] = [
  { id: 'jab', label: 'jab', family: 'punch' },
  { id: 'cross', label: 'cross', family: 'punch' },
  { id: 'left_hook', label: 'left hook', family: 'punch' },
  { id: 'right_hook', label: 'right hook', family: 'punch' },
  { id: 'left_uppercut', label: 'left uppercut', family: 'punch' },
  { id: 'right_uppercut', label: 'right uppercut', family: 'punch' },
  { id: 'left_body_hook', label: 'left body hook', family: 'punch' },
  { id: 'right_body_hook', label: 'right body hook', family: 'punch' },
  { id: 'left_front_kick', label: 'left front kick', family: 'kick' },
  { id: 'right_front_kick', label: 'right front kick', family: 'kick' },
  { id: 'left_side_kick', label: 'left side kick', family: 'kick' },
  { id: 'right_side_kick', label: 'right side kick', family: 'kick' },
  { id: 'left_high_kick', label: 'left high kick', family: 'kick' },
  { id: 'right_high_kick', label: 'right high kick', family: 'kick' },
  { id: 'left_middle_kick', label: 'left middle kick', family: 'kick' },
  { id: 'right_middle_kick', label: 'right middle kick', family: 'kick' },
  { id: 'left_low_kick', label: 'left low kick', family: 'kick' },
  { id: 'right_low_kick', label: 'right low kick', family: 'kick' },
];

export const TECHNIQUE_GROUPS: TechniqueGroup[] = [
  {
    family: 'punch',
    label: 'Punches',
    techniques: TECHNIQUE_CATALOG.filter((technique) => technique.family === 'punch'),
  },
  {
    family: 'kick',
    label: 'Kicks',
    techniques: TECHNIQUE_CATALOG.filter((technique) => technique.family === 'kick'),
  },
];
