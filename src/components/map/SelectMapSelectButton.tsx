import { Button } from "theme-ui";

import { useGroup } from "../../contexts/GroupContext";

import { findGroup } from "../../helpers/group";

import { useI18n } from "../../i18n";

type SelectMapSelectButtonProps = {
  onMapSelect: (mapId: string) => void;
  disabled: boolean;
};

function SelectMapSelectButton({
  onMapSelect,
  disabled,
}: SelectMapSelectButtonProps) {
  const { t } = useI18n();

  const { activeGroups, selectedGroupIds } = useGroup();

  function handleSelectClick() {
    if (selectedGroupIds.length === 1) {
      const group = findGroup(activeGroups, selectedGroupIds[0]);
      if (group && group.type === "item") {
        onMapSelect(group.id);
      }
    }
  }

  return (
    <Button
      variant="primary"
      disabled={disabled || selectedGroupIds.length > 1}
      onClick={handleSelectClick}
      mt={2}
    >
      {t("tools.select")}
    </Button>
  );
}

export default SelectMapSelectButton;
