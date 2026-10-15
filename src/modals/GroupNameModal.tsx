import React, { useState, useRef, useEffect } from "react";
import { Box, Input, Button, Label, Flex } from "theme-ui";

import Modal from "../components/Modal";

import { useI18n } from "../i18n";

import { RequestCloseEventHandler } from "../types/Events";

export type GroupNameEventHandler = (name: string) => void;

type GroupNameModalProps = {
  isOpen: boolean;
  onRequestClose: RequestCloseEventHandler;
  name: string;
  onSubmit: GroupNameEventHandler;
};

function GroupNameModal({
  isOpen,
  name,
  onSubmit,
  onRequestClose,
}: GroupNameModalProps) {
  const { t } = useI18n();
  const [tmpName, setTempName] = useState(name);

  useEffect(() => {
    setTempName(name);
  }, [name]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setTempName(event.target.value);
  }

  function handleSubmit(event: React.FormEvent<HTMLDivElement>) {
    event.preventDefault();
    onSubmit(tmpName);
  }

  const inputRef = useRef<HTMLInputElement>(null);
  function focusInput() {
    inputRef.current?.focus();
  }

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      onAfterOpen={focusInput}
    >
      <Box as="form" onSubmit={handleSubmit}>
        <Label py={2} htmlFor="name">
          {t("dialogs.groupName.title")}
        </Label>
        <Input
          id="name"
          value={tmpName}
          onChange={handleChange}
          ref={inputRef}
        />
        <Flex py={2}>
          <Button sx={{ flexGrow: 1 }}>{t("common.save")}</Button>
        </Flex>
      </Box>
    </Modal>
  );
}

export default GroupNameModal;
