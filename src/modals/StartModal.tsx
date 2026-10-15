import { ChangeEvent, useRef } from "react";
import { Box, Label, Input, Button, Flex, Checkbox } from "theme-ui";
import { useHistory } from "react-router-dom";
import shortid from "shortid";

import { useAuth } from "../contexts/AuthContext";

import { useI18n } from "../i18n";

import useSetting from "../hooks/useSetting";

import Modal from "../components/Modal";

import { RequestCloseEventHandler } from "../types/Events";

type StartModalProps = {
  isOpen: boolean;
  onRequestClose: RequestCloseEventHandler;
};

function StartModal({ isOpen, onRequestClose }: StartModalProps) {
  let history = useHistory();
  const { t } = useI18n();
  const { password, setPassword } = useAuth();

  function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
    setPassword(event.target.value);
  }

  const [usePassword, setUsePassword] = useSetting<boolean>("game.usePassword");
  function handleUsePasswordChange(event: ChangeEvent<HTMLInputElement>) {
    setUsePassword(event.target.checked);
  }

  function handleSubmit(event: ChangeEvent<HTMLInputElement>) {
    event.preventDefault();
    if (!usePassword) {
      setPassword("");
    }
    history.push(`/game/${shortid.generate()}`);
  }

  const inputRef = useRef<HTMLInputElement>(null);
  function focusInput() {
    inputRef.current && inputRef.current.focus();
  }

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      onAfterOpen={focusInput}
    >
      <Flex
        sx={{
          flexDirection: "column",
          justifyContent: "center",
          maxWidth: "300px",
          flexGrow: 1,
        }}
        m={2}
      >
        <Box as="form" onSubmit={handleSubmit}>
          <Label htmlFor="password">{t("dialogs.start.password")}</Label>
          <Input
            my={1}
            id="password"
            name="password"
            value={usePassword ? password : ""}
            onChange={handlePasswordChange}
            disabled={!usePassword}
            autoComplete="off"
            ref={inputRef}
          />
          <Box>
            <Label mb={3}>
              <Checkbox
                checked={usePassword}
                onChange={handleUsePasswordChange}
              />
              {t("dialogs.start.usePassword")}
            </Label>
          </Box>
          <Flex>
            <Button sx={{ flexGrow: 1 }} disabled={!password && usePassword}>
              {t("dialogs.start.submit")}
            </Button>
          </Flex>
        </Box>
      </Flex>
    </Modal>
  );
}

export default StartModal;
