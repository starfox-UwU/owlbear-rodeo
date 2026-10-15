import React from "react";
import { IconButton } from "theme-ui";

import UndoIcon from "../../../icons/UndoIcon";

import { isMacLike } from "../../../helpers/shared";

import { useI18n } from "../../../i18n";

type UndoButtonProps = {
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
};

function UndoButton({ onClick, disabled }: UndoButtonProps) {
  const { t } = useI18n();
  const label = t("tools.undoTitle", { modifier: isMacLike ? "Cmd" : "Ctrl" });
  return (
    <IconButton
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      <UndoIcon />
    </IconButton>
  );
}

export default UndoButton;
