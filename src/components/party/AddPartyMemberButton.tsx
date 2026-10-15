import { useState } from "react";
import { IconButton } from "theme-ui";

import AddPartyMemberModal from "../../modals/AddPartyMemberModal";
import AddPartyMemberIcon from "../../icons/AddPartyMemberIcon";

import { useI18n } from "../../i18n";

function AddPartyMemberButton({ gameId }: { gameId: string }) {
  const { t } = useI18n();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  function openModal() {
    setIsAddModalOpen(true);
  }
  function closeModal() {
    setIsAddModalOpen(false);
  }

  return (
    <>
      <IconButton
        m={1}
        aria-label={t("dialogs.addPartyMember.title")}
        title={t("dialogs.addPartyMember.title")}
        onClick={openModal}
      >
        <AddPartyMemberIcon />
      </IconButton>
      <AddPartyMemberModal
        isOpen={isAddModalOpen}
        onRequestClose={closeModal}
        gameId={gameId}
      />
    </>
  );
}

export default AddPartyMemberButton;
