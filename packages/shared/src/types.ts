export type UserRole = 'student' | 'teacher' | 'admin';
export type SubscriptionTier = 'free' | 'pro' | 'enterprise';
export type ContentStatus = 'draft' | 'published' | 'archived';
export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface User {
  id: string;
  email: string;
  phone?: string;
  passwordHash: string;
  nickname: string;
  avatarUrl?: string;
  role: UserRole;
  subscription: SubscriptionTier;
  preferences: UserPreferences;
  stats: UserStats;
  createdAt: Date;
  lastActiveAt: Date;
  deletedAt?: Date;
}

export interface UserPreferences {
  theme: 'dark' | 'light';
  language: 'zh' | 'en';
  editorKeymap: 'default' | 'vim' | 'emacs';
}

export interface UserStats {
  totalStudyMinutes: number;
  totalExercises: number;
  streak: number;
  level: number;
  xp: number;
}

export interface UserProfile {
  id: string;
  userId: string;
  version: number;
  basics: UserProfileBasics;
  goals: UserProfileGoals;
  abilities: UserProfileAbilities;
  learningStyle: LearningStyle;
  behavior: BehaviorProfile;
  emotional: EmotionalProfile;
  updatedAt: Date;
}

export interface UserProfileBasics {
  age: number;
  occupation: string;
  education: string;
}

export interface UserProfileGoals {
  targetRole: string;
  targetLanguages: string[];
  timeline: string;
  commitment: string;
}

export interface UserProfileAbilities {
  overall: number;
  dimensions: AbilityDimensions;
  confidence: number;
}

export interface AbilityDimensions {
  programming_fundamentals: number;
  data_structures: number;
  algorithms: number;
  web_development: number;
  database: number;
  system_design: number;
  prompt_engineering: number;
  vibe_abstraction: number;
}

export interface LearningStyle {
  preferredMode: 'hands_on' | 'visual' | 'theoretical';
  pacePreference: 'fast' | 'moderate' | 'steady';
  challengeTolerance: number;
  hintPreference: 'progressive' | 'direct' | 'minimal';
}

export interface BehaviorProfile {
  avgSessionDuration: number;
  preferredTimeSlots: string[];
  weeklyFrequency: number;
  focusScore: number;
}

export interface EmotionalProfile {
  frustrationLevel: number;
  confidenceLevel: number;
  engagementLevel: number;
}

export type ExerciseType =
  | 'concept'
  | 'fill_blank'
  | 'code_complete'
  | 'free_code'
  | 'bug_fix'
  | 'code_review'
  | 'vibe_describe'
  | 'prompt_write';

export interface TestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export interface VibePrompt {
  expectedStyle: string;
  expectedKeywords: string[];
  evaluationCriteria: string;
}

export interface Exercise {
  id: string;
  title: string;
  description: string;
  type: ExerciseType;
  difficulty: Difficulty;
  knowledgePointIds: string[];
  language?: string;
  template?: string;
  testCases: TestCase[];
  hints: string[];
  referenceSolution?: string;
  vibePrompt?: VibePrompt;
  stats: ExerciseStats;
  version: string;
  status: ContentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExerciseStats {
  submissionCount: number;
  passRate: number;
  avgAttempts: number;
}

export interface Submission {
  id: string;
  userId: string;
  exerciseId: string;
  code: string;
  language: string;
  testResults?: TestResult[];
  passRate?: number;
  isPassed: boolean;
  aiEvaluation?: AiEvaluation;
  codeReview?: CodeReviewReport;
  attemptNumber: number;
  durationSeconds?: number;
  createdAt: Date;
}

export interface TestResult {
  testCaseIndex: number;
  passed: boolean;
  output: string;
  error?: string;
}

export interface AiEvaluation {
  overallScore: number;
  correctness: number;
  style: number;
  performance?: number;
  security?: number;
  vibeMatch?: number;
  suggestions: string[];
  detailedFeedback: string;
}

export interface CodeReviewReport {
  issues: CodeIssue[];
  summary: string;
  score: number;
}

export interface CodeIssue {
  severity: 'info' | 'warning' | 'error';
  line: number;
  column: number;
  message: string;
  rule?: string;
}

export type LearningPathStatus = 'active' | 'paused' | 'completed' | 'abandoned';

export interface LearningPathStage {
  name: string;
  knowledgePointIds: string[];
  estimatedHours: number;
}

export interface LearningPath {
  id: string;
  userId: string;
  name: string;
  goal: string;
  stages: LearningPathStage[];
  currentStageIndex: number;
  progress: number;
  knowledgeState: Record<string, number>;
  status: LearningPathStatus;
  generatedBy: 'ai' | 'manual' | 'template';
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgePoint {
  nodeId: string;
  name: string;
  domain: string;
  module: string;
  category: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  description: string;
  prerequisites: string[];
  dependents: string[];
  skills: string[];
  assessmentCriteria: {
    basic: string;
    intermediate: string;
    advanced: string;
  };
  resources: KnowledgePointResources;
  version: string;
  status: ContentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgePointResources {
  docId?: string;
  exerciseIds: string[];
  projectId?: string;
}

export type AiSessionType = 'chat' | 'evaluate' | 'debug' | 'review' | 'vibe';

export interface AiSession {
  id: string;
  userId: string;
  type: AiSessionType;
  agentsUsed: string[];
  context: Record<string, unknown>;
  tokenCount: number;
  userRating?: number;
  userFeedback?: string;
  createdAt: Date;
  endedAt?: Date;
}
