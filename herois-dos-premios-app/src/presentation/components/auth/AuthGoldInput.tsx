import type { ReactNode } from 'react';
import { View, TextInput, type TextInputProps } from 'react-native';

interface AuthGoldInputProps extends TextInputProps {
  icon: ReactNode;
}

export function AuthGoldInput({ icon, style, ...props }: AuthGoldInputProps) {
  return (
    <View
      className="flex-row items-center rounded-xl border border-gold px-4 mb-4"
      style={{ backgroundColor: '#120202', minHeight: 52 }}
    >
      <View className="mr-3 opacity-90">{icon}</View>
      <TextInput
        className="flex-1 text-white text-base py-3"
        placeholderTextColor="rgba(255,255,255,0.55)"
        style={[{ color: '#FFFFFF' }, style]}
        {...props}
      />
    </View>
  );
}
