// Tipagem do banco. Pode ser regerada com `supabase gen types typescript`
// quando o schema evoluir.

export type Database = {
  public: {
    Tables: {
      churches: {
        Row: Church;
        Insert: ChurchInsert;
        Update: ChurchUpdate;
        Relationships: [];
      };
      teams: {
        Row: Team;
        Insert: TeamInsert;
        Update: TeamUpdate;
        Relationships: [];
      };
      members: {
        Row: Member;
        Insert: MemberInsert;
        Update: MemberUpdate;
        Relationships: [];
      };
      weeks: {
        Row: Week;
        Insert: WeekInsert;
        Update: WeekUpdate;
        Relationships: [];
      };
      activities: {
        Row: Activity;
        Insert: ActivityInsert;
        Update: ActivityUpdate;
        Relationships: [];
      };
      scores: {
        Row: Score;
        Insert: ScoreInsert;
        Update: ScoreUpdate;
        Relationships: [];
      };
      competition_settings: {
        Row: CompetitionSettings;
        Insert: CompetitionSettingsInsert;
        Update: CompetitionSettingsUpdate;
        Relationships: [];
      };
      team_gallery: {
        Row: TeamGalleryRow;
        Insert: TeamGalleryInsert;
        Update: TeamGalleryUpdate;
        Relationships: [];
      };
      team_badges: {
        Row: TeamBadgeRow;
        Insert: TeamBadgeInsert;
        Update: TeamBadgeUpdate;
        Relationships: [];
      };
      events: {
        Row: EventRow;
        Insert: EventInsert;
        Update: EventUpdate;
        Relationships: [];
      };
      announcements: {
        Row: AnnouncementRow;
        Insert: AnnouncementInsert;
        Update: AnnouncementUpdate;
        Relationships: [];
      };
      escape_settings: {
        Row: EscapeSettings;
        Insert: EscapeSettingsInsert;
        Update: EscapeSettingsUpdate;
        Relationships: [];
      };
      escape_steps: {
        Row: EscapeStep;
        Insert: EscapeStepInsert;
        Update: EscapeStepUpdate;
        Relationships: [];
      };
      escape_team_codes: {
        Row: EscapeTeamCode;
        Insert: EscapeTeamCodeInsert;
        Update: EscapeTeamCodeUpdate;
        Relationships: [];
      };
      escape_team_state: {
        Row: EscapeTeamState;
        Insert: EscapeTeamStateInsert;
        Update: EscapeTeamStateUpdate;
        Relationships: [];
      };
      escape_progress: {
        Row: EscapeProgress;
        Insert: EscapeProgressInsert;
        Update: EscapeProgressUpdate;
        Relationships: [];
      };
    };
    Views: {
      team_rankings: {
        Row: TeamRanking;
        Relationships: [];
      };
      church_rankings: {
        Row: ChurchRanking;
        Relationships: [];
      };
      escape_settings_public: {
        Row: EscapeSettingsPublic;
        Relationships: [];
      };
      escape_steps_public: {
        Row: EscapeStepPublic;
        Relationships: [];
      };
      escape_ranking: {
        Row: EscapeRanking;
        Relationships: [];
      };
    };
    Functions: {
      escape_login: { Args: { p_code: string }; Returns: EscapeLoginResult };
      escape_state: { Args: { p_code: string }; Returns: EscapeStateResult };
      escape_answer: {
        Args: { p_code: string; p_step_id: string; p_attempt: string };
        Returns: EscapeAnswerResult;
      };
      escape_submit_photo: {
        Args: { p_code: string; p_step_id: string; p_url: string };
        Returns: EscapePhotoResult;
      };
      escape_check_final: {
        Args: { p_code: string; p_attempt: string };
        Returns: EscapeFinalResult;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Church = {
  id: string;
  name: string;
  city: string | null;
  logo_url: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
export type ChurchInsert = {
  id?: string;
  name: string;
  city?: string | null;
  logo_url?: string | null;
  color?: string;
  is_active?: boolean;
};
export type ChurchUpdate = Partial<ChurchInsert>;

export type ChurchRanking = {
  id: string;
  name: string;
  color: string;
  logo_url: string | null;
  city: string | null;
  is_active: boolean;
  total_points: number;
  team_count: number;
  rank_position: number;
};

// ---------------------------------------------------------------
// Escape Bíblico
// ---------------------------------------------------------------
export type EscapeQuizOption = { id: string; text: string };
export type EscapeStepType = 'quiz' | 'riddle' | 'photo';
export type EscapePhotoReview = 'none' | 'pending' | 'approved' | 'rejected';

export type EscapeSettings = {
  id: string;
  title: string;
  intro_text: string | null;
  is_published: boolean;
  opens_at: string | null;
  closes_at: string | null;
  final_prompt: string | null;
  final_password: string | null;
  final_success_text: string | null;
  created_at: string;
  updated_at: string;
};
export type EscapeSettingsInsert = {
  id?: string;
  title?: string;
  intro_text?: string | null;
  is_published?: boolean;
  opens_at?: string | null;
  closes_at?: string | null;
  final_prompt?: string | null;
  final_password?: string | null;
  final_success_text?: string | null;
};
export type EscapeSettingsUpdate = Partial<EscapeSettingsInsert>;

// View publica de settings (sem final_password)
export type EscapeSettingsPublic = {
  id: string;
  title: string;
  intro_text: string | null;
  is_published: boolean;
  opens_at: string | null;
  closes_at: string | null;
  final_prompt: string | null;
  final_success_text: string | null;
};

export type EscapeStep = {
  id: string;
  order_number: number;
  title: string;
  prompt: string | null;
  type: EscapeStepType | string;
  image_url: string | null;
  options: EscapeQuizOption[] | null;
  answer: string | null;
  reward_clue: string | null;
  hint: string | null;
  points: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
export type EscapeStepInsert = {
  id?: string;
  order_number?: number;
  title: string;
  prompt?: string | null;
  type?: EscapeStepType | string;
  image_url?: string | null;
  options?: EscapeQuizOption[] | null;
  answer?: string | null;
  reward_clue?: string | null;
  hint?: string | null;
  points?: number;
  is_active?: boolean;
};
export type EscapeStepUpdate = Partial<EscapeStepInsert>;

// View publica de etapas (sem answer / reward_clue)
export type EscapeStepPublic = {
  id: string;
  order_number: number;
  title: string;
  prompt: string | null;
  type: EscapeStepType | string;
  image_url: string | null;
  options: EscapeQuizOption[] | null;
  hint: string | null;
  points: number;
};

export type EscapeTeamCode = {
  team_id: string;
  code: string;
  is_active: boolean;
  created_at: string;
};
export type EscapeTeamCodeInsert = {
  team_id: string;
  code: string;
  is_active?: boolean;
};
export type EscapeTeamCodeUpdate = Partial<EscapeTeamCodeInsert>;

export type EscapeTeamState = {
  team_id: string;
  started_at: string;
  finished_at: string | null;
};
export type EscapeTeamStateInsert = {
  team_id: string;
  started_at?: string;
  finished_at?: string | null;
};
export type EscapeTeamStateUpdate = Partial<EscapeTeamStateInsert>;

export type EscapeProgress = {
  id: string;
  team_id: string;
  step_id: string;
  points_awarded: number;
  penalty_points: number;
  photo_url: string | null;
  photo_review: EscapePhotoReview | string;
  completed_at: string;
};
export type EscapeProgressInsert = {
  id?: string;
  team_id: string;
  step_id: string;
  points_awarded?: number;
  penalty_points?: number;
  photo_url?: string | null;
  photo_review?: EscapePhotoReview | string;
};
export type EscapeProgressUpdate = Partial<EscapeProgressInsert>;

export type EscapeRanking = {
  id: string;
  name: string;
  color: string;
  church_id: string | null;
  net_points: number;
  steps_done: number;
  finished_at: string | null;
  rank_position: number;
};

// Retornos das RPCs (jsonb)
export type EscapeLoginResult =
  | { ok: false }
  | { ok: true; team_id: string; team_name: string; color: string };

export type EscapeStateStep = {
  step_id: string;
  points_awarded: number;
  penalty_points: number;
  clue: string | null;
  photo_url: string | null;
  photo_review: EscapePhotoReview | string;
};
export type EscapeStateResult =
  | { ok: false }
  | {
      ok: true;
      team_id: string;
      finished_at: string | null;
      is_open: boolean;
      steps: EscapeStateStep[];
    };

export type EscapeAnswerResult =
  | { ok: false; reason: string }
  | { ok: true; correct: false }
  | { ok: true; correct: true; clue: string | null; points: number };

export type EscapePhotoResult =
  | { ok: false; reason: string }
  | { ok: true; clue: string | null; points: number };

export type EscapeFinalResult =
  | { ok: false; reason: string }
  | { ok: true; correct: false; reason?: string }
  | { ok: true; correct: true; success_text: string | null };

export type Team = {
  id: string;
  name: string;
  color: string;
  church_id: string | null;
  leader_name: string | null;
  bible_reference: string | null;
  theme_verse: string | null;
  war_cry: string | null;
  bio: string | null;
  instagram_url: string | null;
  photo_url: string | null;
  banner_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
export type TeamInsert = {
  id?: string;
  name: string;
  color: string;
  church_id?: string | null;
  leader_name?: string | null;
  bible_reference?: string | null;
  theme_verse?: string | null;
  war_cry?: string | null;
  bio?: string | null;
  instagram_url?: string | null;
  photo_url?: string | null;
  banner_url?: string | null;
  is_active?: boolean;
};
export type TeamUpdate = Partial<TeamInsert>;

export type Member = {
  id: string;
  team_id: string;
  name: string;
  role: string | null;
  photo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
export type MemberInsert = {
  id?: string;
  team_id: string;
  name: string;
  role?: string | null;
  photo_url?: string | null;
  is_active?: boolean;
};
export type MemberUpdate = Partial<MemberInsert>;

export type Week = {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  order_number: number;
  is_active: boolean;
  closed_at: string | null;
  reopened_at: string | null;
  created_at: string;
  updated_at: string;
};
export type WeekInsert = {
  id?: string;
  name: string;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  order_number: number;
  is_active?: boolean;
  closed_at?: string | null;
  reopened_at?: string | null;
};
export type WeekUpdate = Partial<WeekInsert>;

export type ActivityStatus = 'pending' | 'in_progress' | 'completed';
export type ActivityType = 'normal' | 'tiebreaker' | 'special';

export type Activity = {
  id: string;
  week_id: string;
  name: string;
  description: string | null;
  type: ActivityType | string;
  max_points: number;
  activity_date: string | null;
  status: ActivityStatus | string;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
};
export type ActivityInsert = {
  id?: string;
  week_id: string;
  name: string;
  description?: string | null;
  type?: ActivityType | string;
  max_points?: number;
  activity_date?: string | null;
  status?: ActivityStatus | string;
  photo_url?: string | null;
};
export type ActivityUpdate = Partial<ActivityInsert>;

export type Score = {
  id: string;
  team_id: string;
  activity_id: string;
  points: number;
  observation: string | null;
  registered_by: string | null;
  created_at: string;
  updated_at: string;
};
export type ScoreInsert = {
  id?: string;
  team_id: string;
  activity_id: string;
  points: number;
  observation?: string | null;
  registered_by?: string | null;
};
export type ScoreUpdate = Partial<ScoreInsert>;

export type CompetitionStatus = 'open' | 'closed';

export type CompetitionSettings = {
  id: string;
  competition_name: string;
  theme: string | null;
  general_bible_reference: string | null;
  general_verse: string | null;
  status: CompetitionStatus | string;
  champion_team_id: string | null;
  has_tie: boolean;
  tiebreaker_note: string | null;
  closed_at: string | null;
  reopened_at: string | null;
  created_at: string;
  updated_at: string;
};
export type CompetitionSettingsInsert = {
  id?: string;
  competition_name: string;
  theme?: string | null;
  general_bible_reference?: string | null;
  general_verse?: string | null;
  status?: CompetitionStatus | string;
  champion_team_id?: string | null;
  has_tie?: boolean;
  tiebreaker_note?: string | null;
  closed_at?: string | null;
  reopened_at?: string | null;
};
export type CompetitionSettingsUpdate = Partial<CompetitionSettingsInsert>;

export type TeamGalleryRow = {
  id: string;
  team_id: string;
  image_url: string;
  caption: string | null;
  order_number: number;
  created_at: string;
};
export type TeamGalleryInsert = {
  id?: string;
  team_id: string;
  image_url: string;
  caption?: string | null;
  order_number?: number;
};
export type TeamGalleryUpdate = Partial<TeamGalleryInsert>;

export type AnnouncementVariant = 'info' | 'success' | 'warning' | 'urgent';

export type AnnouncementRow = {
  id: string;
  title: string;
  body: string | null;
  variant: AnnouncementVariant | string;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
export type AnnouncementInsert = {
  id?: string;
  title: string;
  body?: string | null;
  variant?: AnnouncementVariant | string;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active?: boolean;
};
export type AnnouncementUpdate = Partial<AnnouncementInsert>;

export type TeamBadgeRow = {
  id: string;
  team_id: string;
  badge_code: string;
  payload: Record<string, unknown> | null;
  earned_at: string;
};
export type TeamBadgeInsert = {
  id?: string;
  team_id: string;
  badge_code: string;
  payload?: Record<string, unknown> | null;
};
export type TeamBadgeUpdate = Partial<TeamBadgeInsert>;

export type EventType =
  | 'score'
  | 'badge'
  | 'week_started'
  | 'week_closed'
  | 'gincana_closed'
  | 'gincana_reopened';

export type EventRow = {
  id: string;
  type: EventType | string;
  team_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};
export type EventInsert = {
  id?: string;
  type: EventType | string;
  team_id?: string | null;
  payload?: Record<string, unknown> | null;
};
export type EventUpdate = Partial<EventInsert>;

export type TeamRanking = {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
  total_points: number;
  scores_count: number;
  rank_position: number;
};
