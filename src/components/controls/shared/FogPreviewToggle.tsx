import { IconButton } from "theme-ui";

import PreviewOnIcon from "../../../icons/FogPreviewOnIcon";
import PreviewOffIcon from "../../../icons/FogPreviewOffIcon";

import { useI18n } from "../../../i18n";

type FogPreviewToggleProps = {
  useFogPreview: boolean;
  onFogPreviewChange: (useFogCut: boolean) => void;
};

function FogPreviewToggle({
  useFogPreview,
  onFogPreviewChange,
}: FogPreviewToggleProps) {
  const { t } = useI18n();
  const label = useFogPreview
    ? t("tools.fogPreview.disable")
    : t("tools.fogPreview.enable");
  return (
    <IconButton
      aria-label={label}
      title={label}
      onClick={() => onFogPreviewChange(!useFogPreview)}
    >
      {useFogPreview ? <PreviewOnIcon /> : <PreviewOffIcon />}
    </IconButton>
  );
}

export default FogPreviewToggle;
