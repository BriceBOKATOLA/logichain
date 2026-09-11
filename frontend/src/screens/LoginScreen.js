import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { colors, spacing, radius, typography } from '../theme/theme';
import PrimaryButton from '../components/PrimaryButton';
import { useAuthContext } from '../context/AuthContext';

/**
 * LoginScreen — Vue pure : capture les entrées utilisateur et délègue
 * l'authentification à AuthContext/AuthService (aucune logique métier ici).
 */
export default function LoginScreen() {
  const { login } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      // WEB_ADMIN_ONLY (AuthContext.web.js) : message précis, distinct de
      // l'erreur générique — l'agent doit comprendre que ses identifiants
      // sont corrects mais que le web est réservé aux administrateurs.
      setError(
        err?.code === 'WEB_ADMIN_ONLY'
          ? err.message
          : 'Connexion impossible. Vérifiez vos identifiants ou votre réseau.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.logo}>LogiChain</Text>
      <Text style={styles.subtitle}>Application terrain, logistique événementielle</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Adresse email"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <PrimaryButton label="Se connecter" onPress={onSubmit} loading={loading} />
      </View>

      <Text style={styles.footer}>Fonctionne aussi hors-ligne une fois connecté au moins une fois.</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, justifyContent: 'center' },
  logo: { ...typography.h1, textAlign: 'center', color: colors.primary },
  subtitle: { ...typography.caption, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.xxl },
  form: { gap: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.textPrimary,
  },
  error: { color: colors.danger, ...typography.caption },
  footer: { ...typography.caption, textAlign: 'center', marginTop: spacing.xxl },
});
