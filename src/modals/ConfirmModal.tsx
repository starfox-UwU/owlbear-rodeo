import { Box, Label, Flex, Button, Text } from "theme-ui";

import Modal from "../components/Modal";

import { useI18n } from "../i18n";

type ConfirmModalProps = {
  isOpen: boolean;
  onRequestClose: () => void;
  onConfirm: () => void;
  confirmText?: string;
  label?: string;
  description?: string;
};

function ConfirmModal({
  isOpen,
  onRequestClose,
  onConfirm,
  confirmText,
  label,
  description,
}: ConfirmModalProps) {
  const { t } = useI18n();

  // defaultProps 里拿不到 hook，默认值改在组件内用 ?? 兜底
  const modalLabel = label ?? t("dialogs.confirm.defaultLabel");
  const modalDescription = description ?? t("dialogs.confirm.defaultDescription");
  const modalConfirmText = confirmText ?? t("common.yes");

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      style={{ content: { maxWidth: "300px" } }}
    >
      <Box>
        <Label py={2}>{modalLabel}</Label>
        {modalDescription && (
          <Text as="p" mb={2} variant="caption">
            {modalDescription}
          </Text>
        )}
        <Flex py={2}>
          <Button sx={{ flexGrow: 1 }} m={1} ml={0} onClick={onRequestClose}>
            {t("common.cancel")}
          </Button>
          <Button sx={{ flexGrow: 1 }} m={1} mr={0} onClick={onConfirm}>
            {modalConfirmText}
          </Button>
        </Flex>
      </Box>
    </Modal>
  );
}

export default ConfirmModal;
