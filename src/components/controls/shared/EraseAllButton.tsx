import { useEffect, useRef, useState } from "react";
import { Button, IconButton } from "theme-ui";

import EraseAllIcon from "../../../icons/EraseAllIcon";
import MapMenu from "../../map/MapMenu";

import { useI18n } from "../../../i18n";

type EraseAllButtonProps = {
  onToolAction: (action: string) => void;
  disabled: boolean;
};

function EraseAllButton({ onToolAction, disabled }: EraseAllButtonProps) {
  const { t } = useI18n();
  const [isEraseAllConfirmOpen, setIsEraseAllConfirmOpen] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuLeft, setMenuLeft] = useState(0);
  const [menuTop, setMenuTop] = useState(0);
  useEffect(() => {
    const button = buttonRef.current;
    if (isEraseAllConfirmOpen && button) {
      const rect = button.getBoundingClientRect();
      setMenuLeft(rect.left + rect.width / 2);
      setMenuTop(rect.bottom + 8);
    }
  }, [isEraseAllConfirmOpen]);

  return (
    <>
      <IconButton
        aria-label={t("tools.eraseAll")}
        title={t("tools.eraseAll")}
        onClick={() => setIsEraseAllConfirmOpen(true)}
        disabled={disabled}
        ref={buttonRef}
      >
        <EraseAllIcon />
      </IconButton>
      <MapMenu
        isOpen={isEraseAllConfirmOpen}
        onRequestClose={() => setIsEraseAllConfirmOpen(false)}
        left={menuLeft}
        top={menuTop}
        style={{ transform: "translateX(-50%)" }}
      >
        <Button
          disabled={disabled}
          onClick={() => {
            setIsEraseAllConfirmOpen(false);
            onToolAction("eraseAll");
          }}
        >
          {t("tools.eraseAll")}
        </Button>
      </MapMenu>
    </>
  );
}

export default EraseAllButton;
