import { useMemo } from 'react';

interface PlayneedleParams {
  t: number;   // thickness of needle (0 to 0.5)
  j: number;   // length of ribbon at top (-0.05 to 0.25)
  k: number;   // falloff of ribbon (10 to 1000)
  s: number;   // vertical height of button (10 to 25)
  v_o: number; // vertical offset of button (0 to 1)
  h_b: number; // horizontal width of button (0.5 to 1)
  h_r: number; // horizontal width of ribbon (0 to 1)
}

/**
 * f(x) = h_r * (1 / (1 + e^(k*(x-j)))) * (1-t) + t
 *        + h_b * (1-t) * sin(s * (x - v_o * (1 - π/s)))^2
 *        * ceil(-0.1 * (x - v_o * (1 - π/s)) * ((x - v_o * (1 - π/s)) - π/s))
 *
 * Domain: x in [0, 1] (top to bottom of playneedle)
 * Range: f(x) in [0, 1] (width as fraction of total width)
 */
function evaluateF(x: number, p: PlayneedleParams): number {
  const { t, j, k, s, v_o, h_b, h_r } = p;

  // Ribbon component: h_r * sigmoid * (1-t) + t
  const sigmoid = 1.0 / (1.0 + Math.exp(k * (x - j)));
  const ribbon = h_r * sigmoid * (1.0 - t) + t;

  // Button component
  const buttonCenter = v_o * (1.0 - Math.PI / s);
  const buttonArg = s * (x - buttonCenter);
  const buttonSin = Math.sin(buttonArg);
  const buttonShape = buttonSin * buttonSin;

  // Button window: ceil(-0.1 * (x - buttonCenter) * ((x - buttonCenter) - π/s))
  const dx = x - buttonCenter;
  const windowArg = -0.1 * dx * (dx - Math.PI / s);
  const buttonWindow = Math.ceil(windowArg);

  const button = h_b * (1.0 - t) * buttonShape * buttonWindow;

  return ribbon + button;
}

interface Props {
  height?: number;      // total height in pixels (if undefined, fills container)
  maxWidth: number;     // maximum width in pixels
  color?: string;
  glowColor?: string;
  params: PlayneedleParams;
  verticalOffset?: number; // 0-1, where to place the button center (maps to v_o)
  onClick?: (e: React.MouseEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
}

export default function FormulaPlayneedle({
  height = 200,
  maxWidth,
  color = '#f5f5f5',
  params,
  onClick,
  onMouseDown,
}: Props) {
  const svgPath = useMemo(() => {
    const steps = 200; // number of sample points for smooth curve
    const halfMaxW = maxWidth / 2;

    // Generate left and right edge points
    const leftPoints: Array<[number, number]> = [];
    const rightPoints: Array<[number, number]> = [];

    for (let i = 0; i <= steps; i++) {
      const x = i / steps; // 0 to 1 (top to bottom)
      const y = x * height; // pixel y position
      const widthFactor = evaluateF(x, params);
      const halfWidth = widthFactor * halfMaxW;

      leftPoints.push([halfMaxW - halfWidth, y]);
      rightPoints.push([halfMaxW + halfWidth, y]);
    }

    // Build SVG path: go down the left edge, then back up the right edge
    let path = `M ${leftPoints[0][0]} ${leftPoints[0][1]}`;
    for (let i = 1; i < leftPoints.length; i++) {
      path += ` L ${leftPoints[i][0]} ${leftPoints[i][1]}`;
    }
    // Go to bottom-right and come back up
    for (let i = rightPoints.length - 1; i >= 0; i--) {
      path += ` L ${rightPoints[i][0]} ${rightPoints[i][1]}`;
    }
    path += ' Z';

    return path;
  }, [height, maxWidth, params]);

  // Calculate button center position for the clickable circle
  const buttonCenterY = params.v_o * height;
  const buttonCenterX = maxWidth / 2;

  return (
    <svg
      width={maxWidth}
      height={height}
      viewBox={`0 0 ${maxWidth} ${height}`}
      style={{ overflow: 'visible', display: 'block', width: '100%', height: '100%' }}
    >
      <defs>
        <filter id="playneedle-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d={svgPath}
        fill={color}
        filter="url(#playneedle-glow)"
        style={{ cursor: 'pointer' }}
        onClick={onClick}
        onMouseDown={onMouseDown}
      />
      {/* Invisible larger click target for the button area */}
      <circle
        cx={buttonCenterX}
        cy={buttonCenterY}
        r={10}
        fill="transparent"
        style={{ cursor: 'pointer' }}
        onClick={onClick}
        onMouseDown={onMouseDown}
      />
    </svg>
  );
}
