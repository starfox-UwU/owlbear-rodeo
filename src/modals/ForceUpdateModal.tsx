import { Box, Label, Text } from "theme-ui";

import Modal from "../components/Modal";

import { useI18n } from "../i18n";

function ForceUpdateModal({ isOpen }: { isOpen: boolean }) {
  const { t } = useI18n();

  return (
    <Modal
      isOpen={isOpen}
      allowClose={false}
      style={{ content: { maxWidth: "450px" } }}
    >
      <Box>
        <Label py={2}>{t("game.forceUpdate.title")}</Label>
        <Text as="p" mb={2} variant="caption">
          {t("game.forceUpdate.description")}
        </Text>
      </Box>
    </Modal>
  );
}

export default ForceUpdateModal;
