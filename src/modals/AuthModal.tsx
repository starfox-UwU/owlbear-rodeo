import { useState, useRef, ChangeEvent, FormEvent } from "react";
import { Box, Input, Button, Label, Flex } from "theme-ui";

import { useAuth } from "../contexts/AuthContext";

import Modal from "../components/Modal";

import { useI18n } from "../i18n";

type AuthModalProps = {
  isOpen: boolean;
  onSubmit: (newPassword: string) => void;
};

function AuthModal({ isOpen, onSubmit }: AuthModalProps) {
  const { t } = useI18n();
  const { password, setPassword } = useAuth();
  const [tmpPassword, setTempPassword] = useState<string>(password);

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    setTempPassword(event.target?.value);
  }

  function handleSubmit(event: FormEvent<HTMLElement>): void {
    event.preventDefault();
    setPassword(tmpPassword);
    onSubmit(tmpPassword);
  }

  const inputRef = useRef<HTMLInputElement>(null);
  function focusInput(): void {
    inputRef.current && inputRef.current?.focus();
  }

  return (
    <Modal isOpen={isOpen} allowClose={false} onAfterOpen={focusInput}>
      <Box as="form" onSubmit={handleSubmit}>
        <Label py={2} htmlFor="password">
          {t("game.auth.passwordLabel")}
        </Label>
        <Input
          id="password"
          value={tmpPassword}
          onChange={handleChange}
          ref={inputRef}
          autoComplete="off"
        />
        <Flex py={2}>
          <Button sx={{ flexGrow: 1 }}>{t("dialogs.auth.submit")}</Button>
        </Flex>
      </Box>
    </Modal>
  );
}

export default AuthModal;
