import { View } from "react-native";
import Svg, { Polygon, Line, Circle, Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";

interface RadarChartProps {
  dimensions: Record<string, number>;
  size?: number;
}

export function RadarChart({ dimensions, size = 260 }: RadarChartProps) {
  const entries = Object.entries(dimensions);
  const count = entries.length;
  if (count < 3) return null;

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 36;
  const levels = 4;

  function getPoint(index: number, value: number) {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    const r = (value / 100) * radius;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  }

  // Grid polygon points for each level
  function getLevelPoints(level: number) {
    return Array.from({ length: count })
      .map((_, i) => {
        const p = getPoint(i, ((level + 1) / levels) * 100);
        return `${p.x},${p.y}`;
      })
      .join(" ");
  }

  const dataPoints = entries
    .map(([, value], i) => getPoint(i, value))
    .map((p) => `${p.x},${p.y}`)
    .join(" ");

  return (
    <View className="items-center py-2">
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id="dataGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#d97706" stopOpacity="0.15" />
          </SvgGradient>
        </Defs>

        {/* Grid polygons */}
        {Array.from({ length: levels }).map((_, level) => (
          <Polygon
            key={`grid-${level}`}
            points={getLevelPoints(level)}
            fill="none"
            stroke="#e7e5e4"
            strokeWidth={0.8}
            strokeDasharray={level < levels - 1 ? "2,3" : "0"}
          />
        ))}

        {/* Axis lines */}
        {entries.map(([, ], i) => {
          const p = getPoint(i, 100);
          return (
            <Line
              key={`axis-${i}`}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke="#e7e5e4"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Data fill */}
        <Polygon
          points={dataPoints}
          fill="url(#dataGradient)"
          stroke="#d97706"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Data points */}
        {entries.map(([, value], i) => {
          const p = getPoint(i, value);
          return (
            <Circle
              key={`dot-${i}`}
              cx={p.x}
              cy={p.y}
              r={3.5}
              fill="#d97706"
              stroke="#fff"
              strokeWidth={2}
            />
          );
        })}

        {/* Labels */}
        {entries.map(([label, value], i) => {
          const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
          const labelR = radius + 24;
          const x = cx + labelR * Math.cos(angle);
          const y = cy + labelR * Math.sin(angle);
          return (
            <SvgText
              key={`label-${label}`}
              x={x}
              y={y}
              fontSize={11}
              fill="#57534e"
              fontWeight="500"
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {label} {value}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}
