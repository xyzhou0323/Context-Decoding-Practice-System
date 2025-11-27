
export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation: string;
}

export type ScenarioCategory = 
  | 'EmotionalExpression' // 情绪表达
  | 'Projection'          // 心理投射
  | 'SocialRitual'        // 社交仪式/功能
  | 'RelationalStance'    // 关系立场
  | 'ImpliedNeed';        // 隐含需求

// Replaced Neurotype with Communication Style
export type CommunicationStyle = 'DirectLiteral' | 'IndirectSocial';

// New type for user preference on what to practice
export type UserPerspective = 'DecodeSubtext' | 'DecodeLiteral' | 'Mixed';

export interface SocialScenario {
  title: string;
  context: string;
  speakerName: string;
  communicationStyle: CommunicationStyle; 
  statement: string;
  visualDescription: string; 
  socialFunction: string; 
  category: ScenarioCategory; 
  setting: string;
  tags: string[]; 
  options: QuizOption[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface HistoryItem {
  id: string; 
  scenario: SocialScenario;
  selectedOptionId: string;
  timestamp: number;
  imageUrl: string | null;
}

export enum AppState {
  IDLE = 'IDLE',
  LOADING_SCENARIO = 'LOADING_SCENARIO',
  PLAYING = 'PLAYING',
  HISTORY = 'HISTORY',
  ERROR = 'ERROR'
}

// API Configuration Types
export type ApiProvider = 'Free' | 'Google' | 'Custom';

export interface ApiConfig {
  provider: ApiProvider;
  apiKey: string; 
  baseUrl?: string; 
  modelName?: string; 
}

// Response schema helper types for Gemini
export interface GeminiScenarioResponse {
  title: string;
  context: string;
  speakerName: string;
  communicationStyle: string; // Helper for JSON parsing
  statement: string;
  visualDescription: string;
  socialFunction: string;
  category: string;
  setting: string;
  tags: string[];
  options: {
    text: string;
    isCorrect: boolean;
    explanation: string;
  }[];
  difficulty: string;
}
