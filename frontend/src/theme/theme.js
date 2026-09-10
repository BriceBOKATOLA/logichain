/**
 * Design tokens centralisés — palette "terrain industriel / éco-responsable".
 * Un seul point de vérité pour garantir la cohérence visuelle de toute l'app.
 */
export const colors = {
  background: '#0F1712',       // vert nuit, lisible en extérieur / plein soleil
  surface: '#182620',
  surfaceElevated: '#1F3229',
  primary: '#3DDC84',          // vert signal (éco-responsable)
  primaryDark: '#22A25B',
  accent: '#4FB8FF',           // bleu technique (carte, GPS)
  warning: '#FFC24B',
  danger: '#FF5D5D',
  textPrimary: '#F3FBF6',
  textSecondary: '#9FB8AC',
  border: '#2C3F35',
  offline: '#7A7A7A',
};

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
};

export const radius = {
  sm: 8, md: 14, lg: 22, pill: 999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700', color: colors.textPrimary },
  h2: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  body: { fontSize: 15, fontWeight: '400', color: colors.textPrimary },
  caption: { fontSize: 12, fontWeight: '500', color: colors.textSecondary },
  mono: { fontSize: 14, fontFamily: 'Menlo-Regular', color: colors.textPrimary },
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
};

export default { colors, spacing, radius, typography, shadow };
