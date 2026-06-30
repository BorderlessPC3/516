import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { HeroTrophyLogo } from '@/presentation/components/brand/HeroTrophyLogo';

interface AuthWaveHeaderProps {
  /** Altura útil do header dourado (sem safe area) */
  bodyHeight?: number;
  logoSize?: number;
}

export function AuthWaveHeader({ bodyHeight = 80, logoSize = 108 }: AuthWaveHeaderProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const totalHeight = bodyHeight + insets.top;
  const logoOverlap = logoSize * 0.4;

  const logoTop = totalHeight - logoOverlap;
  const containerHeight = logoTop + logoSize;
  const contentSpacing = 20;

  const { fillPath, highlightPath } = useMemo(() => {
    const w = width;
    const h = totalHeight;
    const leftY = h * 0.94;
    const rightY = h * 0.72;

    const fill = [
      `M 0 0`,
      `H ${w}`,
      `V ${rightY}`,
      `C ${w * 0.82} ${h * 0.97}, ${w * 0.45} ${h * 0.99}, ${w * 0.2} ${h * 0.95}`,
      `C ${w * 0.1} ${h * 0.92}, ${w * 0.04} ${leftY}, 0 ${leftY}`,
      'Z',
    ].join(' ');

    const highlight = [
      `M 0 ${leftY}`,
      `C ${w * 0.14} ${h * 0.86}, ${w * 0.4} ${h * 0.95}, ${w * 0.64} ${h * 0.92}`,
      `C ${w * 0.84} ${h * 0.89}, ${w * 0.95} ${rightY + 1}, ${w} ${rightY}`,
    ].join(' ');

    return { fillPath: fill, highlightPath: highlight };
  }, [totalHeight, width]);

  return (
    <View
      style={{
        height: containerHeight,
        marginBottom: contentSpacing,
      }}
    >
      <StatusBar style="light" />

      <Svg
        width={width}
        height={containerHeight}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <Defs>
          <LinearGradient id="authHeaderGold" x1="0" y1="0" x2="1" y2="0.35">
            <Stop offset="0" stopColor="#6B3F08" />
            <Stop offset="0.25" stopColor="#9A6B1B" />
            <Stop offset="0.55" stopColor="#C9A227" />
            <Stop offset="0.82" stopColor="#E8C547" />
            <Stop offset="1" stopColor="#FFF0A0" />
          </LinearGradient>
        </Defs>

        <Path d={fillPath} fill="url(#authHeaderGold)" />
        <Path
          d={highlightPath}
          fill="none"
          stroke="#FFF6C8"
          strokeWidth={1}
          strokeOpacity={0.7}
        />
      </Svg>

      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: logoTop,
          alignItems: 'center',
        }}
      >
        <HeroTrophyLogo size={logoSize} />
      </View>
    </View>
  );
}
