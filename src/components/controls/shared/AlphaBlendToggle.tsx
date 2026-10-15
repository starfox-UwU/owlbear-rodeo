import { IconButton } from "theme-ui";

import BlendOnIcon from "../../../icons/BlendOnIcon";
import BlendOffIcon from "../../../icons/BlendOffIcon";

import { useI18n } from "../../../i18n";

type AlphaBlendToggleProps = {
  useBlending: boolean;
  onBlendingChange: (useBlending: boolean) => void;
};

function AlphaBlendToggle({
  useBlending,
  onBlendingChange,
}: AlphaBlendToggleProps) {
  const { t } = useI18n();
  const label = useBlending
    ? t("tools.alphaBlend.disable")
    : t("tools.alphaBlend.enable");
  return (
    <IconButton
      aria-label={label}
      title={label}
      onClick={() => onBlendingChange(!useBlending)}
    >
      {useBlending ? <BlendOnIcon /> : <BlendOffIcon />}
    </IconButton>
  );
}

export default AlphaBlendToggle;
