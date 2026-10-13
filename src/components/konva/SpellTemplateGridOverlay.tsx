import Konva from "konva";
import { useCallback } from "react";
import { Shape } from "react-konva";

import { useGridStrokeWidth } from "../../contexts/GridContext";
import colors, { Color } from "../../helpers/colors";

import { AffectedCell } from "../../helpers/spellTemplates";

type SpellTemplateGridOverlayProps = {
  cells: AffectedCell[];
  color: string;
  opacity: number;
} & Konva.ShapeConfig;

function SpellTemplateGridOverlay({
  cells,
  color,
  opacity,
  ...props
}: SpellTemplateGridOverlayProps) {
  const gridStrokeWidth = useGridStrokeWidth();
  const strokeWidth = gridStrokeWidth * 0.75;
  const displayColor = colors[color as Color] || color;

  /**
   * 把所有受影响的格子画进**同一个**路径、**同一个** Konva 节点。
   *
   * 之前是每个格子一个 <Line>。当模板覆盖很多格（几百上千）时，节点数量爆炸，
   * 而每个节点都带 fill + stroke + opacity<1，Konva 的 perfectDrawEnabled
   * 会判定每帧需要一块离屏缓冲画布来正确合成半透明填充与描边。
   * 结果就是每帧几百块画布的 clear + 重绘 + 合成：
   *   GPU 跑满、一个 CPU 核心跑满、VRAM 随节点包围盒反复分配而锯齿波动。
   *
   * 合并成一个 Shape 之后：路径只有一条，一次 fill、一次 stroke，
   * 并且显式关掉 perfectDrawEnabled，彻底不再产生离屏缓冲画布。
   */
  const sceneFunc = useCallback(
    (context: Konva.Context, shape: Konva.Shape) => {
      context.beginPath();
      for (const cell of cells) {
        const points = cell.polygon;
        if (points.length < 2) {
          continue;
        }
        context.moveTo(points[0].x, points[0].y);
        for (let index = 1; index < points.length; index += 1) {
          context.lineTo(points[index].x, points[index].y);
        }
        context.closePath();
      }
      context.fillStrokeShape(shape);
    },
    [cells]
  );

  return (
    <Shape
      sceneFunc={sceneFunc}
      fill={displayColor}
      fillEnabled
      stroke={displayColor}
      strokeWidth={strokeWidth}
      opacity={opacity}
      // 关键：不要为这个节点创建离屏缓冲画布
      perfectDrawEnabled={false}
      // 纯展示层，不需要命中检测，省掉一份 hit canvas
      listening={false}
      {...props}
    />
  );
}

export default SpellTemplateGridOverlay;
