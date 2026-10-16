import { useState } from "react";
import { Flex, IconButton } from "theme-ui";

import CharacterSheetIcon from "../icons/CharacterSheetIcon";
import TokenCharacterIcon from "../icons/TokenCharacterIcon";

import { TokensStateCreateHandler } from "../types/Events";
import { useI18n } from "../i18n";

import { useCharacterCardContext } from "./CharacterCardContext";
import CreateTokensFromCardModal from "./CreateTokensFromCardModal";

type CharacterTokenButtonsProps = {
  onMapTokensStateCreate: TokensStateCreateHandler;
};

/**
 * 游戏内的角色卡入口：
 * - 打开/关闭角色卡（车卡、改卡）；
 * - 从角色卡批量生成 Token。
 */
function CharacterTokenButtons({
  onMapTokensStateCreate,
}: CharacterTokenButtonsProps) {
  const { t } = useI18n();
  const { open, isOpen } = useCharacterCardContext();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <Flex sx={{ gap: 1, alignItems: "center" }}>
      <IconButton
        aria-label={t("character.openCard")}
        title={isOpen ? t("common.close") : t("character.openCard")}
        onClick={open}
      >
        <CharacterSheetIcon />
      </IconButton>
      <IconButton
        aria-label={t("character.generateTitle")}
        title={t("character.generateTitle")}
        onClick={() => setIsModalOpen(true)}
      >
        <TokenCharacterIcon />
      </IconButton>
      <CreateTokensFromCardModal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        onMapTokensStateCreate={onMapTokensStateCreate}
      />
    </Flex>
  );
}

export default CharacterTokenButtons;
