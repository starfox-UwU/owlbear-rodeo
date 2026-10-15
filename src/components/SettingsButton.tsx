import { useState } from "react";
import { IconButton } from "theme-ui";

import SettingsIcon from "../icons/SettingsIcon";
import SettingsModal from "../modals/SettingsModal";

import { useI18n } from "../i18n";

function SettingsButton() {
  const { t } = useI18n();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  function openModal() {
    setIsSettingsModalOpen(true);
  }
  function closeModal() {
    setIsSettingsModalOpen(false);
  }

  return (
    <>
      <IconButton
        m={1}
        aria-label={t("settings.title")}
        title={t("settings.title")}
        onClick={openModal}
      >
        <SettingsIcon />
      </IconButton>
      <SettingsModal isOpen={isSettingsModalOpen} onRequestClose={closeModal} />
    </>
  );
}

export default SettingsButton;
