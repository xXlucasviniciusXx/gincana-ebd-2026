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
    };
    Functions: Record<string, never>;
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
