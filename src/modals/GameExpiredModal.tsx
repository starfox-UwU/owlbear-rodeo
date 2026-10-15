import { Box, Label, Flex, Button, Text } from "theme-ui";

import Modal from "../components/Modal";

import { useI18n } from "../i18n";

import { RequestCloseEventHandler } from "../types/Events";

type GameExpiredModalProps = {
  isOpen: boolean;
  onRequestClose: RequestCloseEventHandler;
};

function GameExpiredModal({ isOpen, onRequestClose }: GameExpiredModalProps) {
  const { t } = useI18n();

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      style={{ content: { maxWidth: "450px" } }}
    >
      <Box>
        <Label py={2}>{t("game.gameExpired.title")}</Label>
        <Text as="p" mb={2} variant="caption">
          {t("game.gameExpired.description")}
        </Text>
        <Flex py={2}>
          <Button sx={{ flexGrow: 1 }} m={1} ml={0} onClick={onRequestClose}>
            {t("common.ok")}
          </Button>
        </Flex>
      </Box>
    </Modal>
  );
}

export default GameExpiredModal;
