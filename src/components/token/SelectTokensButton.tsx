import { useState } from "react";
import { IconButton } from "theme-ui";

import SelectTokensIcon from "../../icons/SelectTokensIcon";

import SelectTokensModal from "../../modals/SelectTokensModal";
import { TokensStateCreateHandler } from "../../types/Events";
import { useI18n } from "../../i18n";

type SelectTokensButtonProps = {
  onMapTokensStateCreate: TokensStateCreateHandler;
};

function SelectTokensButton({
  onMapTokensStateCreate,
}: SelectTokensButtonProps) {
  const { t } = useI18n();
  const [isModalOpen, setIsModalOpen] = useState(false);
  function openModal() {
    setIsModalOpen(true);
  }
  function closeModal() {
    setIsModalOpen(false);
  }

  return (
    <>
      <IconButton
        aria-label={t("tokens.editTokens")}
        title={t("tokens.editTokens")}
        onClick={openModal}
      >
        <SelectTokensIcon />
      </IconButton>
      <SelectTokensModal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        onMapTokensStateCreate={onMapTokensStateCreate}
      />
    </>
  );
}

export default SelectTokensButton;
