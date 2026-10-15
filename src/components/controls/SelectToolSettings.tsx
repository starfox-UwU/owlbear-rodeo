import { Flex } from "theme-ui";

import {
  SelectToolSettings as SelectToolSettingsType,
  SelectToolType,
} from "../../types/Select";

import { useKeyboard } from "../../contexts/KeyboardContext";

import ToolSection from "./shared/ToolSection";

import shortcuts from "../../shortcuts";

import { useI18n } from "../../i18n";

import RectIcon from "../../icons/SelectRectangleIcon";
import PathIcon from "../../icons/SelectPathIcon";

type SelectToolSettingsProps = {
  settings: SelectToolSettingsType;
  onSettingChange: (change: Partial<SelectToolSettingsType>) => void;
};

function SelectToolSettings({
  settings,
  onSettingChange,
}: SelectToolSettingsProps) {
  const { t } = useI18n();

  // Keyboard shotcuts
  function handleKeyDown(event: KeyboardEvent) {
    if (shortcuts.selectPath(event)) {
      onSettingChange({ type: "path" });
    } else if (shortcuts.selectRect(event)) {
      onSettingChange({ type: "rectangle" });
    }
  }
  useKeyboard(handleKeyDown);

  const tools = [
    {
      id: "rectangle",
      title: t("tools.selectTool.rectangle"),
      isSelected: settings.type === "rectangle",
      icon: <RectIcon />,
    },
    {
      id: "path",
      title: t("tools.selectTool.lasso"),
      isSelected: settings.type === "path",
      icon: <PathIcon />,
    },
  ];

  return (
    <Flex sx={{ alignItems: "center" }}>
      <ToolSection
        tools={tools}
        onToolClick={(tool) =>
          onSettingChange({ type: tool.id as SelectToolType })
        }
      />
    </Flex>
  );
}

export default SelectToolSettings;
