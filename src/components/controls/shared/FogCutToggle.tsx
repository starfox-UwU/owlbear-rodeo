import { IconButton } from "theme-ui";

import CutOnIcon from "../../../icons/FogCutOnIcon";
import CutOffIcon from "../../../icons/FogCutOffIcon";

import { useI18n } from "../../../i18n";

type FogCutToggleProps = {
  useFogCut: boolean;
  onFogCutChange: (useFogCut: boolean) => void;
  disabled?: boolean;
};

function FogCutToggle({
  useFogCut,
  onFogCutChange,
  disabled,
}: FogCutToggleProps) {
  const { t } = useI18n();
  const label = useFogCut
    ? t("tools.fogCut.disable")
    : t("tools.fogCut.enable");
  return (
    <IconButton
      aria-label={label}
      title={label}
      onClick={() => onFogCutChange(!useFogCut)}
      disabled={disabled}
    >
      {useFogCut ? <CutOnIcon /> : <CutOffIcon />}
    </IconButton>
  );
}

export default FogCutToggle;
