export const GAME_WIDTH = 540;
export const GAME_HEIGHT = 960;
export const MAX_ASPECT_RATIO = 9 / 16;

export const VIEWPORT_RESIZE_DEBOUNCE_MS = 100;
export const VIEWPORT_INITIAL_RESIZE_DELAY_MS = 0;

export const CONTAINER = {
    x: 70,
    y: 140,
    width: 400,
    height: 770
};

export const DEADLINE_OFFSET_Y = 70;
export const CONTROLLED_FALL_SPEED = 4.3;

export const PIECE_TYPES = [
    { id: 'shrimp', emoji: '🦐', radius: 26, weight: 389, score: 10 },
    { id: 'puffer', emoji: '🐡', radius: 45, weight: 100, score: 25 },
    { id: 'fish', emoji: '🐟', radius: 70, weight: 10, score: 60 },
    { id: 'sprout', emoji: '🌱', radius: 26, weight: 389, score: 10 },
    { id: 'ricePlant', emoji: '🌾', radius: 45, weight: 100, score: 25 },
    { id: 'rice', emoji: '🍚', radius: 70, weight: 10, score: 60 },
    { id: 'sushi', emoji: '🍣', radius: 100, weight: 2, score: 200 }
];

export const SAME_MERGE_TO = {
    shrimp: 'puffer',
    puffer: 'fish',
    sprout: 'ricePlant',
    ricePlant: 'rice'
};

export const SUSHI_BONUS = 500;

export const RANKING_TOP_N = 3;
export const RANKING_MAX_ENTRIES = 3;

export const MATTER_GRAVITY_Y = 0.805;
export const MATTER_WORLD_BOUNDS_THICKNESS = 48;

export const SPARK_TEXTURE_KEY = 'spark-dot';
export const SPARK_DOT_RADIUS = 3;
export const SPARK_TEXTURE_SIZE = 6;

export const BACKDROP_BG_COLOR = 0x14110d;
export const BACKDROP_STRIPE_STEP_Y = 28;
export const BACKDROP_STRIPE_SLOPE_OFFSET_Y = 14;
export const BACKDROP_STRIPE_LINE_WIDTH = 2;
export const BACKDROP_STRIPE_COLOR = 0x7a5230;
export const BACKDROP_STRIPE_ALPHA_BASE = 0.05;
export const BACKDROP_STRIPE_ALPHA_ALT = 0.02;

export const BACKDROP_CONTAINER_OUTER_PADDING = 14;
export const BACKDROP_CONTAINER_OUTER_CORNER_RADIUS = 10;
export const BACKDROP_CONTAINER_OUTER_ALPHA = 0.04;
export const BACKDROP_CONTAINER_INNER_ALPHA = 0.10;
export const BACKDROP_CONTAINER_INNER_CORNER_RADIUS = 8;
export const BACKDROP_CONTAINER_BORDER_WIDTH = 4;
export const BACKDROP_CONTAINER_BORDER_COLOR = 0xd4af37;
export const BACKDROP_CONTAINER_BORDER_ALPHA = 0.65;

export const SEA_WAVE_AMP = 7;
export const SEA_WAVE_STEP = 18;
export const SEA_WAVE_LEN = 44;
export const SEA_FILL_COLOR = 0x1db954;
export const SEA_FILL_ALPHA = 0.14;
export const SEA_FILL_TOP_PAD = 8;
export const SEA_FILL_BOTTOM_PAD = 12;
export const SEA_DARK_LINE_WIDTH = 7;
export const SEA_DARK_LINE_COLOR = 0x0c7a3a;
export const SEA_DARK_LINE_ALPHA = 0.7;
export const SEA_LIGHT_LINE_WIDTH = 3;
export const SEA_LIGHT_LINE_COLOR = 0x7fffb2;
export const SEA_LIGHT_LINE_ALPHA = 0.45;
export const SEA_LIGHT_LINE_OFFSET_Y = 6;
export const SEA_LIGHT_LINE_PHASE = 0.9;
export const SEA_BOTTOM_PHASE = 1.2;
export const SEA_BOTTOM_AMP_MULT = 0.7;
export const SEA_LIGHT_AMP_MULT = 0.65;

export const NORI_COUNT = 6;
export const NORI_Y_OFFSET = 28;
export const NORI_FONT_SIZE_PX = 20;
export const NORI_ALPHA = 0.65;

export const CONTAINER_WALL_THICKNESS = 44;
export const CONTAINER_SIDE_RESTITUTION = 0.1;
export const CONTAINER_SIDE_FRICTION = 0.8;
export const CONTAINER_FLOOR_RESTITUTION = 0.05;
export const CONTAINER_FLOOR_FRICTION = 0.9;

export const UI_TITLE_Y = 10;
export const UI_SCORE_Y = 60;
export const UI_TITLE_FONT_SIZE_PX = 28;
export const UI_SMALL_FONT_SIZE_PX = 24;
export const UI_NEXT_MARGIN_X = 24;
export const UI_NEXT_LABEL_Y = 40;
export const UI_NEXT_EMOJI_Y = 70;
export const UI_NEXT_EMOJI_FONT_SIZE_PX = 42;
export const UI_TITLE_ALPHA = 0.95;
export const UI_SCORE_ALPHA = 0.95;
export const UI_NEXT_LABEL_ALPHA = 0.85;
export const UI_NEXT_EMOJI_ALPHA = 0.95;

export const DANGER_DURATION_MS = 3000;

export const START_RANK_ALL_TIME_Y_RATIO = 0.56;
export const START_RANK_DAILY_Y_RATIO = 0.70;

export const OVERLAY_BASE_Y_RATIO = 0.68;
export const OVERLAY_COLUMN_GAP = 180;
export const OVERLAY_TEXT_FONT_SIZE_PX = 16;
export const OVERLAY_LOADING_Y_OFFSET = 26;
export const OVERLAY_ROW_SPACING = 22;

export const CONTROL_RELEASE_DELAY_MS = 300;
export const CONTROL_AUTORELEASE_DELAY_MS = 650;
export const CONTROL_SPAWN_Y_OFFSET = 40;
export const CONTROL_AUTORELEASE_Y_OFFSET = 220;
export const CONTROL_POST_MERGE_DELAY_MS = 220;

export const PIECE_FONT_MIN_SIZE_PX = 18;
export const PIECE_FONT_RADIUS_MULT = 1.7;
export const PIECE_RESTITUTION = 0.15;
export const PIECE_FRICTION = 0.8;
export const PIECE_FRICTION_AIR = 0.02;
export const PIECE_DENSITY = 0.0012;

export const MERGE_SPARKLES_COUNT = 18;
export const MERGE_NEW_X_VELOCITY_MIN = -2;
export const MERGE_NEW_X_VELOCITY_MAX = 2;
export const MERGE_NEW_Y_VELOCITY_MIN = -3;
export const MERGE_NEW_Y_VELOCITY_MAX = -1;
export const MERGE_NEW_ANGULAR_VELOCITY_MIN = -0.06;
export const MERGE_NEW_ANGULAR_VELOCITY_MAX = 0.06;
export const MERGE_TONE_FREQ = 660;
export const MERGE_TONE_DURATION_SEC = 0.06;
export const MERGE_TONE_GAIN = 0.04;

export const SUSHI_POP_EMOJI_FONT_SIZE_PX = 150;
export const SUSHI_POP_EMOJI_SCALE = 0.7;
export const SUSHI_POP_EMOJI_ALPHA = 0.0;
export const SUSHI_POP_TWEEN_SCALE = 1.25;
export const SUSHI_POP_TWEEN_ALPHA = 1;
export const SUSHI_POP_TWEEN_DURATION_MS = 140;
export const SUSHI_POP_TWEEN_HOLD_MS = 80;
export const SUSHI_VANISH_DELAY_MS = 200;
export const SUSHI_SPARKLES_COUNT = 42;
export const SUSHI_TONE_FREQ = 988;
export const SUSHI_TONE_DURATION_SEC = 0.07;
export const SUSHI_TONE_GAIN = 0.07;

export const POP_IMPULSE_RADIUS = 190;
export const POP_IMPULSE_BASE_FORCE = 0.02;
export const POP_IMPULSE_IGNORE_DIST = 12;

export const SPARKLES_LIFESPAN_MS = 520;
export const SPARKLES_SPEED_MIN = 40;
export const SPARKLES_SPEED_MAX = 220;
export const SPARKLES_SCALE_START = 1.0;
export const SPARKLES_ALPHA_START = 0.9;

export const SMOKE_QUANTITY = 18;
export const SMOKE_LIFESPAN_MS = 720;
export const SMOKE_SPEED_MIN = 30;
export const SMOKE_SPEED_MAX = 160;
export const SMOKE_SCALE_START = 3.0;
export const SMOKE_SCALE_END = 6.5;
export const SMOKE_ALPHA_START = 0.22;

export const AUDIO_GAIN_FLOOR = 0.0001;
export const AUDIO_ATTACK_SEC = 0.01;
export const AUDIO_STOP_PAD_SEC = 0.02;
