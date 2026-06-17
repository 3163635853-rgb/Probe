import { View, type DimensionValue } from "react-native";
import { MotiView } from "moti";

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  className?: string;
}

export function Skeleton({ width = "100%", height = 16, radius = 8, className = "" }: SkeletonProps) {
  return (
    <MotiView
      from={{ opacity: 0.4 }}
      animate={{ opacity: 1 }}
      transition={{ type: "timing", duration: 800, loop: true }}
      className={`bg-muted ${className}`}
      style={{
        width,
        height,
        borderRadius: radius,
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <View className="rounded-xl border border-border bg-white p-4 mb-3">
      <View className="flex-row items-center gap-3">
        <Skeleton width={44} height={44} radius={12} />
        <View className="flex-1 gap-2">
          <Skeleton height={14} width={120} />
          <Skeleton height={10} width={80} />
        </View>
      </View>
    </View>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <View className="px-6 pt-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}
