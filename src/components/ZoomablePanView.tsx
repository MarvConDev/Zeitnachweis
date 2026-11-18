import { type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

type Props = {
  children: ReactNode;
  minScale?: number;
  maxScale?: number;
};

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

function clampPan(
  x: number,
  y: number,
  nextScale: number,
  viewWidth: number,
  viewHeight: number,
  contentWidth: number,
  contentHeight: number,
) {
  'worklet';
  const scaledW = contentWidth * nextScale;
  const scaledH = contentHeight * nextScale;

  let minX = 0;
  let maxX = 0;
  let minY = 0;
  let maxY = 0;

  if (scaledW > viewWidth) {
    minX = viewWidth - scaledW;
    maxX = 0;
  }
  if (scaledH > viewHeight) {
    minY = viewHeight - scaledH;
    maxY = 0;
  }

  return {
    x: clamp(x, minX, maxX),
    y: clamp(y, minY, maxY),
  };
}

/**
 * Ein-Finger-Pan + Zwei-Finger-Zoom.
 * Translate wird an Viewport- und Inhaltsgröße geklemmt (kein Wegschieben vom Rand).
 * Transform-Ursprung: oben links.
 */
export function ZoomablePanView({ children, minScale = 1, maxScale = 2.5 }: Props) {
  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const viewW = useSharedValue(0);
  const viewH = useSharedValue(0);
  const contentW = useSharedValue(0);
  const contentH = useSharedValue(0);

  const pan = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .activeOffsetX([-8, 8])
    .activeOffsetY([-8, 8])
    .onBegin(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      const next = clampPan(
        startX.value + event.translationX,
        startY.value + event.translationY,
        scale.value,
        viewW.value,
        viewH.value,
        contentW.value,
        contentH.value,
      );
      translateX.value = next.x;
      translateY.value = next.y;
    });

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      startScale.value = scale.value;
    })
    .onUpdate((event) => {
      const nextScale = clamp(startScale.value * event.scale, minScale, maxScale);
      scale.value = nextScale;
      const next = clampPan(
        translateX.value,
        translateY.value,
        nextScale,
        viewW.value,
        viewH.value,
        contentW.value,
        contentH.value,
      );
      translateX.value = next.x;
      translateY.value = next.y;
    });

  const gesture = Gesture.Simultaneous(pan, pinch);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  function onViewLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    viewW.value = width;
    viewH.value = height;
    const next = clampPan(
      translateX.value,
      translateY.value,
      scale.value,
      width,
      height,
      contentW.value,
      contentH.value,
    );
    translateX.value = next.x;
    translateY.value = next.y;
  }

  function onContentLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    contentW.value = width;
    contentH.value = height;
    const next = clampPan(
      translateX.value,
      translateY.value,
      scale.value,
      viewW.value,
      viewH.value,
      width,
      height,
    );
    translateX.value = next.x;
    translateY.value = next.y;
  }

  return (
    <View style={styles.root} onLayout={onViewLayout}>
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[styles.content, animatedStyle]}
          onLayout={onContentLayout}
          collapsable={false}
        >
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  content: {
    alignSelf: 'flex-start',
    transformOrigin: 'top left',
  },
});
