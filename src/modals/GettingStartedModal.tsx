import { Box, Label, Text } from "theme-ui";

import Modal from "../components/Modal";
import Markdown from "../components/Markdown";
import Link from "../components/Link";

import { useI18n } from "../i18n";

import { RequestCloseEventHandler } from "../types/Events";

import gettingStarted from "../docs/howTo/gettingStarted.md?raw";

type GettingStartedModalProps = {
  isOpen: boolean;
  onRequestClose: RequestCloseEventHandler;
};

function GettingStartedModal({
  isOpen,
  onRequestClose,
}: GettingStartedModalProps) {
  const { t } = useI18n();

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      style={{ content: { maxWidth: "450px" } }}
    >
      <Box>
        <Label py={2}>{t("dialogs.gettingStarted.title")}</Label>
        <Markdown source={gettingStarted} />
        <Text variant="body2" my={2}>
          {t("game.gettingStarted.tutorialsPrefix")}
          <Link to="/how-to">{t("footer.howTo")}</Link>
          {t("game.gettingStarted.tutorialsSuffix")}
        </Text>
      </Box>
    </Modal>
  );
}

export default GettingStartedModal;
