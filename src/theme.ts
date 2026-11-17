export type ThemeColors = {
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  accentSoft: string;
  danger: string;
  dangerSoft: string;
  header: string;
  headerMuted: string;
  inputBg: string;
  tableHead: string;
  rowFilled: string;
  previewBg: string;
  chipBg: string;
};

export const lightColors: ThemeColors = {
  bg: '#F2F5FA',
  surface: '#FFFFFF',
  ink: '#152033',
  muted: '#5B6B82',
  line: '#D4DCE8',
  accent: '#1D4ED8',
  accentSoft: '#E8EFFC',
  danger: '#9B2C2C',
  dangerSoft: '#F8E8E8',
  header: '#1E3A8A',
  headerMuted: '#C7D7F5',
  inputBg: '#F8FAFC',
  tableHead: '#E8EEF8',
  rowFilled: '#F5F8FD',
  previewBg: '#EEF3FB',
  chipBg: '#F8FAFC',
};

export const darkColors: ThemeColors = {
  bg: '#0F141C',
  surface: '#1A2230',
  ink: '#E8EEF7',
  muted: '#9AA8BC',
  line: '#2C384C',
  accent: '#3B82F6',
  accentSoft: '#1A2A45',
  danger: '#F87171',
  dangerSoft: '#3A1F24',
  header: '#15233D',
  headerMuted: '#8FA3C7',
  inputBg: '#121925',
  tableHead: '#222D40',
  rowFilled: '#1C2738',
  previewBg: '#182234',
  chipBg: '#121925',
};

/** @deprecated use useTheme().colors */
export const colors = lightColors;
