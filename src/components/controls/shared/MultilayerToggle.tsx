import { IconButton } from "theme-ui";

import MultilayerOnIcon from "../../../icons/FogMultilayerOnIcon";
import MultilayerOffIcon from "../../../icons/FogMultilayerOffIcon";

import { useI18n } from "../../../i18n";

type MultilayerToggleProps = {
  multilayer: boolean;
  onMultilayerChange: (multilayer: boolean) => void;
  disabled?: boolean;
};

function MultilayerToggle({
  multilayer,
  onMultilayerChange,
  disabled,
}: MultilayerToggleProps) {
  const { t } = useI18n();
  const label = multilayer
    ? t("tools.multilayer.disable")
    : t("tools.multilayer.enable");
  return (
    <IconButton
      aria-label={label}
      title={label}
      onClick={() => onMultilayerChange(!multilayer)}
      disabled={disabled}
    >
      {multilayer ? <MultilayerOnIcon /> : <MultilayerOffIcon />}
    </IconButton>
  );
}

export default MultilayerToggle;
