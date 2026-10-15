import React from "react";
import { IconButton } from "theme-ui";

import RedoIcon from "../../../icons/RedoIcon";

import { isMacLike } from "../../../helpers/shared";

import { useI18n } from "../../../i18n";

type RedoButtonProps = {
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
};

function RedoButton({ onClick, disabled }: RedoButtonProps) {
  const { t } = useI18n();
  const label = t("tools.redoTitle", { modifier: isMacLike ? "Cmd" : "Ctrl" });
  return (
    <IconButton
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      <RedoIcon />
    </IconButton>
  );
}

export default RedoButton;
