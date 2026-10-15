import { useState } from "react";
import { IconButton } from "theme-ui";

import SelectDiceIcon from "../../icons/SelectDiceIcon";
import SelectDiceModal from "../../modals/SelectDiceModal";

import { DefaultDice } from "../../types/Dice";

import { useI18n } from "../../i18n";

type SelectDiceButtonProps = {
  onDiceChange: (dice: DefaultDice) => void;
  currentDice: DefaultDice;
  disabled: boolean;
};

function SelectDiceButton({
  onDiceChange,
  currentDice,
  disabled,
}: SelectDiceButtonProps) {
  const { t } = useI18n();
  const [isModalOpen, setIsModalOpen] = useState(false);

  function openModal() {
    setIsModalOpen(true);
  }
  function closeModal() {
    setIsModalOpen(false);
  }

  function handleDone(dice: DefaultDice) {
    onDiceChange(dice);
    closeModal();
  }

  return (
    <>
      <IconButton
        aria-label={t("dice.selectStyle")}
        title={t("dice.selectStyle")}
        onClick={openModal}
        disabled={disabled}
      >
        <SelectDiceIcon />
      </IconButton>
      <SelectDiceModal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        defaultDice={currentDice}
        onDone={handleDone}
      />
    </>
  );
}

SelectDiceButton.defaultProps = {
  disabled: false,
};

export default SelectDiceButton;
