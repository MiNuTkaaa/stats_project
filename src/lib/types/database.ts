// ============================================================
// Supabase Database Types for Hockey Goalie Stats
// ============================================================

export type Database = {
  public: {
    Tables: {
      games: {
        Row: Game;
        Insert: GameInsert;
        Update: Partial<GameInsert>;
        Relationships: [
          {
            foreignKeyName: "game_periods_game_id_fkey";
            columns: ["id"];
            isOneToOne: false;
            referencedRelation: "game_periods";
            referencedColumns: ["game_id"];
          },
        ];
      };
      game_periods: {
        Row: GamePeriod;
        Insert: GamePeriodInsert;
        Update: Partial<GamePeriodInsert>;
        Relationships: [
          {
            foreignKeyName: "game_periods_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      games_computed: {
        Row: GameComputed;
        Relationships: [];
      };
      game_periods_computed: {
        Row: GamePeriodComputed;
        Relationships: [];
      };
    };
    Functions: {
      calculate_season: {
        Args: { game_date: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// ------------------------------------------------------------
// games table row type
// ------------------------------------------------------------
export type Game = {
  id: string;
  date: string;
  opponent: string;
  toi: string;
  score: string;
  home_away: "H" | "A";
  b2b: boolean;
  ot: boolean;
  so: boolean;
  started: boolean;
  pulled: boolean;
  playoff: boolean;
  xga: number | null;
  ga: number;
  ga_first_5_shots: number;
  ga_first_5_mins: number;
  ga_last_5_mins: number;
  grade_aplus_goals: number;
  grade_a_goals: number;
  grade_b_goals: number;
  grade_c_goals: number;
  pk_ga: number;
  pp_ga: number;
  tsa: number;
  sb: number;
  sm: number;
  sog: number;
  xsv_pct: number | null;
  grade_aplus_shots: number;
  grade_a_shots: number;
  grade_b_shots: number;
  grade_c_shots: number;
  pipes: number;
  pim_total: string | null;
  pk_count: number;
  pk_tsa: number;
  pk_sog: number;
  rebound_green: number;
  rebound_red: number;
  rebound_black: number;
  glove_green: number;
  glove_red: number;
  glove_black: number;
  playmaking_green: number;
  playmaking_red: number;
  playmaking_black: number;
  pk_time: string | null;
  season: string | null;
  created_at: string;
};

// ------------------------------------------------------------
// games insert type (id, season, created_at auto-generated)
// ------------------------------------------------------------
export type GameInsert = {
  id?: string;
  date: string;
  opponent: string;
  toi: string;
  score: string;
  home_away: "H" | "A";
  b2b?: boolean;
  ot?: boolean;
  so?: boolean;
  started?: boolean;
  pulled?: boolean;
  playoff?: boolean;
  xga?: number | null;
  ga: number;
  ga_first_5_shots?: number;
  ga_first_5_mins?: number;
  ga_last_5_mins?: number;
  grade_aplus_goals?: number;
  grade_a_goals?: number;
  grade_b_goals?: number;
  grade_c_goals?: number;
  pk_ga?: number;
  pp_ga?: number;
  tsa: number;
  sb?: number;
  sm?: number;
  sog: number;
  xsv_pct?: number | null;
  grade_aplus_shots?: number;
  grade_a_shots?: number;
  grade_b_shots?: number;
  grade_c_shots?: number;
  pipes?: number;
  pim_total?: string | null;
  pk_count?: number;
  pk_tsa?: number;
  pk_sog?: number;
  rebound_green?: number;
  rebound_red?: number;
  rebound_black?: number;
  glove_green?: number;
  glove_red?: number;
  glove_black?: number;
  playmaking_green?: number;
  playmaking_red?: number;
  playmaking_black?: number;
  pk_time?: string | null;
  season?: string | null;
  created_at?: string;
};

// ------------------------------------------------------------
// game_periods table row type
// ------------------------------------------------------------
export type GamePeriod = {
  id: string;
  game_id: string;
  period: string;
  toi: string | null;
  score: string | null;
  started: boolean;
  pulled: boolean;
  ga: number;
  grade_aplus_goals: number;
  grade_a_goals: number;
  grade_b_goals: number;
  grade_c_goals: number;
  pk_ga: number;
  pp_ga: number;
  tsa: number;
  sb: number;
  sm: number;
  sog: number;
  pim_total: string | null;
  pk_count: number;
  pk_tsa: number;
  pk_sog: number;
  created_at: string;
};

// ------------------------------------------------------------
// game_periods insert type
// ------------------------------------------------------------
export type GamePeriodInsert = {
  id?: string;
  game_id: string;
  period: string;
  toi?: string | null;
  score?: string | null;
  started?: boolean;
  pulled?: boolean;
  ga?: number;
  grade_aplus_goals?: number;
  grade_a_goals?: number;
  grade_b_goals?: number;
  grade_c_goals?: number;
  pk_ga?: number;
  pp_ga?: number;
  tsa?: number;
  sb?: number;
  sm?: number;
  sog?: number;
  pim_total?: string | null;
  pk_count?: number;
  pk_tsa?: number;
  pk_sog?: number;
  created_at?: string;
};

// ------------------------------------------------------------
// games_computed view row type (all Game fields + computed)
// ------------------------------------------------------------
export type GameComputed = Game & {
  sv: number;
  sv_pct: number | null;
  xga_minus_ga: number | null;
  sv_pct_minus_xsv_pct: number | null;
  sb_vs_tsa: number | null;
  sm_vs_tsa: number | null;
  pk_sa_vs_tsa: number | null;
  pk_sog_vs_sog: number | null;
  rebound_control_rate: number | null;
  glove_save_rate: number | null;
  glove_freeze_rate: number | null;
  playmaking_retention_rate: number | null;
  win: boolean | null;
};

// ------------------------------------------------------------
// game_periods_computed view row type
// ------------------------------------------------------------
export type GamePeriodComputed = GamePeriod & {
  sv: number;
  sv_pct: number | null;
  sb_vs_tsa: number | null;
  sm_vs_tsa: number | null;
  pk_sa_vs_tsa: number | null;
  pk_sog_vs_sog: number | null;
};
