import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Text, TouchableOpacity, type TouchableOpacityProps } from 'react-native';

interface AuthGoldButtonProps extends TouchableOpacityProps {
  label: string;
  loading?: boolean;
}

export function AuthGoldButton({ label, loading, disabled, ...props }: AuthGoldButtonProps) {
  return (
    <TouchableOpacity activeOpacity={0.85} disabled={disabled || loading} {...props}>
      <LinearGradient
        colors={['#F9E076', '#D4AF37', '#C9A227']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{
          borderRadius: 12,
          paddingVertical: 16,
          alignItems: 'center',
          opacity: disabled || loading ? 0.65 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#2A0505" />
        ) : (
          <Text
            style={{
              color: '#2A0505',
              fontSize: 16,
              fontWeight: '800',
              letterSpacing: 1.2,
            }}
          >
            {label}
          </Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}
