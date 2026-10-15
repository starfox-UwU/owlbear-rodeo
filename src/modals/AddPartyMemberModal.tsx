import { Box, Label, Text } from "theme-ui";

import Modal from "../components/Modal";

import { useI18n } from "../i18n";

import { RequestCloseEventHandler } from "../types/Events";

type AddPartyMemberModalProps = {
  isOpen: boolean;
  onRequestClose: RequestCloseEventHandler;
  gameId: string;
};

function AddPartyMemberModal({
  isOpen,
  onRequestClose,
  gameId,
}: AddPartyMemberModalProps) {
  const { t } = useI18n();

  return (
    <Modal isOpen={isOpen} onRequestClose={onRequestClose}>
      <Box>
        <Label pt={2} pb={1}>
          {t("party.addMember.label")}
        </Label>
        <Text as="p" mb={2} variant="caption">
          {t("party.addMember.description")}
        </Text>
        <Box p={2} bg="hsla(230, 20%, 0%, 20%)">
          <Text>{gameId}</Text>
        </Box>
        <Text as="p" my={2} variant="caption">
          {t("party.addMember.link")}
        </Text>
        <Box p={2} bg="hsla(230, 20%, 0%, 20%)">
          <Text>{window.location.href}</Text>
        </Box>
      </Box>
    </Modal>
  );
}

export default AddPartyMemberModal;
