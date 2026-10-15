import { IconButton } from "theme-ui";

import ShapeFillOnIcon from "../../../icons/ShapeFillOnIcon";
import ShapeFillOffIcon from "../../../icons/ShapeFillOffIcon";

import { useI18n } from "../../../i18n";

type ShapeFillToggleProps = {
  useShapeFill: boolean;
  onShapeFillChange: (useShapeFill: boolean) => void;
};

function ShapeFillToggle({
  useShapeFill,
  onShapeFillChange,
}: ShapeFillToggleProps) {
  const { t } = useI18n();
  const label = useShapeFill
    ? t("tools.shapeFill.disable")
    : t("tools.shapeFill.enable");
  return (
    <IconButton
      aria-label={label}
      title={label}
      onClick={() => onShapeFillChange(!useShapeFill)}
    >
      {useShapeFill ? <ShapeFillOnIcon /> : <ShapeFillOffIcon />}
    </IconButton>
  );
}

export default ShapeFillToggle;
