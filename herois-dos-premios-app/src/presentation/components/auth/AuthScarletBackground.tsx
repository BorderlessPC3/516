import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type ViewProps } from 'react-native';

/** Degradê diagonal: preto (sup. esq.) → escarlate → preto (inf. dir.) */
export const AUTH_SCARLET_GRADIENT = {
  colors: ['#000000', '#4A0610', '#8B1024', '#A01228', '#4A0610', '#000000'] as const,
  locations: [0, 0.22, 0.48, 0.52, 0.78, 1] as const,
  start: { x: 0, y: 0 } as const,
  end: { x: 1, y: 1 } as const,
};

export function AuthScarletBackground({ children, style, ...props }: ViewProps) {
  return (
    <View style={[styles.container, style]} {...props}>
      <LinearGradient
        colors={[...AUTH_SCARLET_GRADIENT.colors]}
        locations={[...AUTH_SCARLET_GRADIENT.locations]}
        start={AUTH_SCARLET_GRADIENT.start}
        end={AUTH_SCARLET_GRADIENT.end}
        style={StyleSheet.absoluteFillObject}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
