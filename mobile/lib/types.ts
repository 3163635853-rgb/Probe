// API 通用响应
export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  message: string;
  detail?: string;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

// Auth
export interface User {
  uuid: string;
  nickname: string;
  avatar: string;
  phone: string | null;
  membership_type: "free" | "monthly" | "yearly";
  membership_expire_at: string | null;
  quota_remaining: number;
  total_interviews: number;
  created_at: string;
}

export interface LoginResponse {
  token: string;
  expires_at: string;
  user: Pick<User, "uuid" | "nickname" | "avatar" | "membership_type" | "membership_expire_at">;
  is_new_user: boolean;
}

// Config
export interface Industry {
  id: number;
  name: string;
  icon: string;
  description: string;
}

export interface Position {
  id: number;
  name: string;
  category: string;
  level: string;
  default_difficulty: number;
}

export interface InterviewMode {
  code: string;
  name: string;
  description: string;
  default_rounds: number;
  default_duration_min: number;
}

export interface Difficulty {
  level: number;
  name: string;
  description: string;
}

// Interview
export interface StartInterviewRequest {
  industry_id: number;
  position_id: number;
  mode: string;
  difficulty: number;
  jd_text?: string;
}

export interface StartInterviewResponse {
  session_uuid: string;
  stream_url: string;
}

export interface ActiveInterview {
  session_uuid: string;
  state: string;
  round: number;
  started_at: string | null;
  stream_url: string;
}

export interface InterviewHistoryItem {
  session_uuid: string;
  industry: string;
  position: string;
  mode: string;
  status: "completed" | "ongoing" | "abandoned";
  final_score: number | null;
  duration_sec: number;
  total_rounds: number;
  started_at: string;
}

// Report
export interface RoundDetail {
  round: number;
  question_type: "initial" | "probe";
  probe_depth: number;
  question: string;
  answer: string;
  score: number;
  evaluation: {
    strengths: string[];
    weaknesses: string[];
    suggestion: string;
  };
}

export interface InterviewReport {
  session_uuid: string;
  industry: string;
  position: string;
  mode: string;
  difficulty: number;
  duration_sec: number;
  total_rounds: number;
  overall_score: number;
  dimensions: Record<string, number>;
  summary: string;
  strengths: string[];
  improvements: string[];
  rounds: RoundDetail[];
  share_image_url: string | null;
  created_at: string;
}

// SSE Events
export interface SSEQuestionEvent {
  round: number;
  content: string;
  type: "initial" | "probe";
  dimension: string;
}

export interface SSEStatusEvent {
  state: string;
  progress: string;
  elapsed: number;
}

export interface SSEEvaluationEvent {
  round: number;
  score: number;
  brief: string;
  visible: boolean;
}

export interface SSEReportEvent {
  session_uuid: string;
  overall_score: number;
  report_url: string;
}

export interface SSEErrorEvent {
  code: string;
  message: string;
  retry: boolean;
}

// Quota
export interface QuotaStatus {
  plan: string;
  unlimited: boolean;
  quota_total: number;
  quota_used: number;
  quota_remaining: number;
  reset_at: string;
  can_start_interview: boolean;
}

// Stats
export interface InterviewStats {
  items: { session_uuid: string; score: number; mode: string; date: string }[];
  total_completed: number;
  avg_score: number;
  best_score: number;
}

// Growth Center
export interface GrowthProfileSnapshot {
  level: number;
  title: string;
  xp: number;
  level_xp: number;
  next_level_xp: number;
  progress_percent: number;
  current_streak: number;
  longest_streak: number;
  weekly_goal: number;
  weekly_completed: number;
  weekly_progress_percent: number;
}

export interface GrowthActivityDay {
  date: string;
  weekday: string;
  count: number;
  avg_score: number;
  is_today: boolean;
}

export interface GrowthDimension {
  name: string;
  score: number;
  status: string;
}

export interface GrowthTask {
  id: number;
  task_type: "interview" | "review" | "focus";
  title: string;
  description: string;
  dimension: string | null;
  target_count: number;
  progress: number;
  xp_reward: number;
  status: "pending" | "completed";
  completed_at: string | null;
}

export interface GrowthOverview {
  profile: GrowthProfileSnapshot;
  weekly_activity: GrowthActivityDay[];
  focus_dimensions: GrowthDimension[];
  daily_tasks: GrowthTask[];
  daily_completed: number;
  daily_total: number;
}
