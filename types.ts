export type Role = string;
export type EvaluationType = 'self' | 'leader';

export enum Pillar {
  HARD_SKILLS = 'Hard Skills',
  AUTONOMY = 'Autonomia',
  IMPACT = 'Impacto',
  SOFT_SKILLS = 'Soft Skills',
  CONSISTENCY = 'Consistência',
}

export interface QuestionOption {
  level: 1 | 2 | 3 | 4 | 5;
  text: string;
  description?: string;
}

export interface Question {
  id: string;
  pillar: Pillar;
  title: string;
  description: string;
  options: QuestionOption[];
}

export interface UserData {
  name: string;
  role: string;
  type: EvaluationType;
}

export interface Answers {
  [key: string]: number; // pillar -> level (1-5)
}

export interface ReportData {
  totalScore: number;
  levelLabel: string;
  breakdown: {
    pillar: string;
    level: number;
    weightedScore: number;
    maxWeightedScore: number;
  }[];
  geminiAnalysis: string;
}

export const WEIGHTS = {
  [Pillar.HARD_SKILLS]: 0.30,
  [Pillar.AUTONOMY]: 0.25,
  [Pillar.IMPACT]: 0.20,
  [Pillar.SOFT_SKILLS]: 0.15,
  [Pillar.CONSISTENCY]: 0.10,
};