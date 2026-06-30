import { Image, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';

import { heroTrophyImage } from '@/core/assets/brand';

export interface HeroTrophyLogoProps {
  /** Largura e altura em pixels */
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

/**
 * Logo oficial do Heróis dos Prêmios (troféu + escudo).
 * Reutilize em cadastro, login, splash e demais telas do app.
 */
export function HeroTrophyLogo({ size = 96, style, imageStyle }: HeroTrophyLogoProps) {
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      <Image
        source={heroTrophyImage}
        accessibilityLabel="Heróis dos Prêmios"
        style={[{ width: size, height: size, resizeMode: 'contain' }, imageStyle]}
      />
    </View>
  );
}
