import React from 'react';
import Svg, { Ellipse, G, Path, Rect } from 'react-native-svg';

export type ReaderTapIllustrationProps = {
  width?: number;
  height?: number;
  cardTranslateX?: number;
  signalOpacity?: [number, number, number];
};

const COLORS = {
  teal: '#008C95',
  gold: '#D69A2D',
  readerTop: '#F7F8F8',
  readerBase: '#D8DEE1',
  readerLip: '#B5BEC3',
  tapMark: '#969DA6',
  shadow: '#233138',
  white: '#FFFFFF',
} as const;

/**
 * Static vector implementation of the USEFULL reader-confirmation artwork.
 *
 * Supply animated `cardTranslateX` and `signalOpacity` values from the app's
 * preferred animation library. See ../implementation-spec.json for timing.
 * The source coordinate system is always 430 × 190.
 */
export function ReaderTapIllustration({
  width = 430,
  height = 190,
  cardTranslateX = 0,
  signalOpacity = [1, 1, 1],
}: ReaderTapIllustrationProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 430 190"
      accessibilityRole="image"
      accessibilityLabel="Move your card toward the card reader"
    >
      <G transform={`translate(${cardTranslateX} 0)`}>
        <Rect x={24} y={55} width={172} height={104} rx={13} fill={COLORS.gold} />
        <Rect x={43} y={76} width={34} height={25} rx={4} fill={COLORS.white} fillOpacity={0.86} />
        <Rect x={43} y={124} width={90} height={8} rx={4} fill={COLORS.white} fillOpacity={0.86} />
      </G>

      <G fill="none" stroke={COLORS.teal} strokeWidth={5} strokeLinecap="round">
        <Path d="M214 82c15 15 15 39 0 54" opacity={signalOpacity[0]} />
        <Path d="M232 66c24 24 24 63 0 87" opacity={signalOpacity[1]} />
        <Path d="M251 50c33 33 33 85 0 118" opacity={signalOpacity[2]} />
      </G>

      <G>
        <Ellipse cx={350} cy={158} rx={86} ry={14} fill={COLORS.shadow} fillOpacity={0.12} />
        <Path
          d="M269 116h162l3 29q2 16-15 18H281q-17-2-15-18l3-29Z"
          fill={COLORS.readerBase}
          stroke={COLORS.teal}
          strokeOpacity={0.38}
          strokeWidth={2}
        />
        <Path d="M280 145q0 8 10 9h120q10-1 10-9" stroke={COLORS.readerLip} strokeWidth={4} strokeLinecap="round" />
        <Path
          d="M306 35h88q14 0 19 14l19 67q5 18-14 20H282q-19-2-14-20l19-67q5-14 19-14Z"
          fill={COLORS.readerTop}
          stroke={COLORS.teal}
          strokeWidth={2.5}
        />

        <G
          transform="translate(350 87) scale(1 .72)"
          fill="none"
          stroke={COLORS.tapMark}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Ellipse cx={0} cy={0} rx={35} ry={23} />
          <Path d="M-20-8q8 8 0 16" />
          <Path d="M-14-12q12 12 0 24" />
          <Path d="M-7-15q15 15 0 30" />
          <Rect x={9} y={-14} width={19} height={13} rx={2} />
          <Path
            d="M17 8V-1q0-4 4-4t4 4v8l2-3q2-3 5 0l3 6q2 4-1 8l-3 4H15L3 12q-3-3 0-6 2-2 5 0l9 8Z"
            fill={COLORS.readerTop}
          />
        </G>
      </G>
    </Svg>
  );
}

export default ReaderTapIllustration;
