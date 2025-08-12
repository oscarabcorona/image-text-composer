export const EDITOR_CONSTANTS = {
  CANVAS: {
    MIN_WIDTH: 400,
    MIN_HEIGHT: 300,
    MAX_WIDTH: 1920,
    MAX_HEIGHT: 1080,
    DEFAULT_WIDTH: 1200,
    DEFAULT_HEIGHT: 800,
    BACKGROUND_COLOR: '#f5f5f5',
  },
  TEXT: {
    DEFAULT_FONT_FAMILY: 'Roboto',
    DEFAULT_FONT_SIZE: 24,
    DEFAULT_FONT_WEIGHT: 400,
    DEFAULT_COLOR: '#000000',
    DEFAULT_OPACITY: 1,
    MIN_FONT_SIZE: 8,
    MAX_FONT_SIZE: 200,
  },
  SNAP: {
    THRESHOLD: 10,
    CENTER_LINE_COLOR: '#4F46E5',
    CENTER_LINE_WIDTH: 1,
  },
  HISTORY: {
    MAX_STEPS: 20,
  },
  KEYBOARD: {
    NUDGE_DISTANCE: 1,
    NUDGE_DISTANCE_SHIFT: 10,
  },
  AUTOSAVE: {
    DEBOUNCE_MS: 2000, // 2 seconds timeout
    STORAGE_KEY: 'image-text-composer-state',
  },
  EXPORT: {
    DEFAULT_FORMAT: 'png' as const,
    DEFAULT_QUALITY: 1,
  },
  ZOOM: {
    MIN: 0.1,
    MAX: 3,
    STEP: 0.05, // Reduced from 0.1 for smoother zoom
    DEFAULT: 1,
    WHEEL_DELTA: 0.02, // Reduced for smoother wheel zoom
    ANIMATION_DURATION: 150, // ms for smooth transitions
    PRESETS: [0.25, 0.5, 0.75, 1, 1.5, 2],
  },
} as const;

export const GOOGLE_FONTS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_FONTS_API_KEY || '';
export const GOOGLE_FONTS_API_URL = 'https://www.googleapis.com/webfonts/v1/webfonts';

export const DEFAULT_FONTS = [
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Raleway',
  'Ubuntu',
  'Playfair Display',
  'Bebas Neue',
  'Anton',
];

export const FONT_WEIGHTS = [
  { label: 'Thin', value: 100 },
  { label: 'Extra Light', value: 200 },
  { label: 'Light', value: 300 },
  { label: 'Regular', value: 400 },
  { label: 'Medium', value: 500 },
  { label: 'Semi Bold', value: 600 },
  { label: 'Bold', value: 700 },
  { label: 'Extra Bold', value: 800 },
  { label: 'Black', value: 900 },
];