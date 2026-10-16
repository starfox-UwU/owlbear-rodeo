import { useEffect } from "react";
import { Button, Flex, Text } from "theme-ui";
import { useHistory } from "react-router-dom";

import { useI18n } from "../i18n";
import { useCharacterCardContext } from "../character/CharacterCardContext";

/**
 * `/card` 只是角色卡的 URL 入口：真正的界面由 App 级别的全屏浮层承载，
 * 这样在游戏里打开和在独立路由打开的是同一个 iframe（角色数据不会分叉）。
 */
function CharacterCard() {
  const { t } = useI18n();
  const history = useHistory();
  const { open, isOpen } = useCharacterCardContext();

  useEffect(() => {
    open();
  }, [open]);

  return (
    <Flex
      sx={{
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100%",
        gap: 3,
        p: 4,
        textAlign: "center",
      }}
    >
      <Text variant="heading">{t("character.title")}</Text>
      <Text variant="body2" sx={{ opacity: 0.75, maxWidth: "480px" }}>
        {t("character.routeHint")}
      </Text>
      <Button onClick={open}>{isOpen ? t("character.reopen") : t("character.openCard")}</Button>
      <Button variant="secondary" onClick={() => history.push("/")}>
        {t("character.backHome")}
      </Button>
    </Flex>
  );
}

export default CharacterCard;
