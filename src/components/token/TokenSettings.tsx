import { useState } from "react";
import { Flex, Box, Input, Label, IconButton, Text } from "theme-ui";

import { isEmpty } from "../../helpers/shared";

import Select from "../Select";
import TokenAttributeEditor from "./TokenAttributeEditor";
import TokenDisplayEditor from "./TokenDisplayEditor";

import { Token, TokenCategory } from "../../types/Token";
import { TokenSettingsChangeEventHandler } from "../../types/Events";
import { buildNextAttributes, createEmptyAttributes } from "../../helpers/tokenAttributes";
import { createDisplayConfig } from "../../helpers/tokenDisplay";
import ExpandMoreIcon from "../../icons/ExpandMoreIcon";
import { useUserId } from "../../contexts/UserIdContext";
import { useI18n } from "../../i18n";

type CategorySetting = { value: TokenCategory; label: string };

type TokenSettingsProps = {
  token: Token;
  onSettingsChange: TokenSettingsChangeEventHandler;
};

function TokenSettings({ token, onSettingsChange }: TokenSettingsProps) {
  const { t } = useI18n();

  const categorySettings: CategorySetting[] = [
    { value: "character", label: t("tokens.category.character") },
    { value: "prop", label: t("tokens.category.prop") },
    { value: "vehicle", label: t("tokens.category.mount") },
    { value: "attachment", label: t("tokens.category.attachment") },
  ];

  const tokenEmpty = !token || isEmpty(token);
  const userId = useUserId();
  const [showDefaultAttributes, setShowDefaultAttributes] = useState(false);
  const [showDefaultDisplay, setShowDefaultDisplay] = useState(false);

  const defaultAttributes = token?.defaultAttributes
    ? token.defaultAttributes
    : createEmptyAttributes(userId || "unknown");

  function updateDefaultAttributes(nextBars: typeof defaultAttributes.bars, nextValues: typeof defaultAttributes.values) {
    if (tokenEmpty) {
      return;
    }
    const nextAttributes = buildNextAttributes(
      token.defaultAttributes,
      nextBars,
      nextValues,
      userId || "unknown"
    );
    onSettingsChange({ defaultAttributes: nextAttributes });
  }

  return (
    <Flex sx={{ flexDirection: "column" }}>
      <Box mt={2} sx={{ flexGrow: 1 }}>
        <Label htmlFor="name">{t("common.name")}</Label>
        <Input
          name="name"
          value={(token && token.name) || ""}
          onChange={(e) => onSettingsChange({ name: e.target.value })}
          disabled={tokenEmpty}
          my={1}
        />
      </Box>
      <Box mt={2}>
        <Label>{t("tokens.defaultCategory")}</Label>
        <Select
          options={categorySettings}
          value={
            tokenEmpty
              ? undefined
              : categorySettings.find((s) => s.value === token.defaultCategory)
          }
          isDisabled={tokenEmpty}
          onChange={
            ((option: CategorySetting) =>
              onSettingsChange({ defaultCategory: option.value })) as any
          }
          isSearchable={false}
        />
      </Box>
      <Box mt={2} sx={{ flexGrow: 1 }}>
        <Label htmlFor="tokenSize">{t("tokens.defaultSize")}</Label>
        <Input
          type="number"
          name="tokenSize"
          value={`${(token && token.defaultSize) || 0}`}
          onChange={(e) =>
            onSettingsChange({ defaultSize: parseFloat(e.target.value) })
          }
          disabled={tokenEmpty}
          min={1}
          my={1}
        />
      </Box>
      <Box my={2} mb={3} sx={{ flexGrow: 1 }}>
        <Label htmlFor="label">{t("tokens.defaultLabel")}</Label>
        <Input
          name="label"
          value={(token && token.defaultLabel) || ""}
          onChange={(e) => onSettingsChange({ defaultLabel: e.target.value })}
          disabled={tokenEmpty}
          my={1}
        />
      </Box>
      <Box mt={2}>
        <Flex
          sx={{ alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
          onClick={() => setShowDefaultAttributes((prev) => !prev)}
        >
          <Text as="label" variant="body2">
            {t("tokens.defaultAttributes")}
          </Text>
          <IconButton
            title={showDefaultAttributes ? t("tokens.showLess") : t("tokens.showMore")}
            aria-label={showDefaultAttributes ? t("tokens.showLess") : t("tokens.showMore")}
            sx={{ transform: showDefaultAttributes ? "rotate(180deg)" : "none" }}
          >
            <ExpandMoreIcon />
          </IconButton>
        </Flex>
        {showDefaultAttributes && (
          <Box mt={2}>
            <TokenAttributeEditor
              attributes={defaultAttributes}
              onChange={updateDefaultAttributes}
              canEdit={!tokenEmpty}
              compact
              showHeader
            />
          </Box>
        )}
      </Box>
      <Box mt={2} mb={2}>
        <Flex
          sx={{ alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
          onClick={() => setShowDefaultDisplay((prev) => !prev)}
        >
          <Text as="label" variant="body2">
            {t("tokens.display.defaultDisplay")}
          </Text>
          <IconButton
            title={showDefaultDisplay ? t("tokens.showLess") : t("tokens.showMore")}
            aria-label={showDefaultDisplay ? t("tokens.showLess") : t("tokens.showMore")}
            sx={{ transform: showDefaultDisplay ? "rotate(180deg)" : "none" }}
          >
            <ExpandMoreIcon />
          </IconButton>
        </Flex>
        {showDefaultDisplay && (
          <Box mt={2}>
            <TokenDisplayEditor
              config={
                token?.defaultDisplay ??
                createDisplayConfig(userId || "unknown")
              }
              onChange={(nextDisplay) =>
                !tokenEmpty && onSettingsChange({ defaultDisplay: nextDisplay })
              }
              canEdit={!tokenEmpty}
              compact
              showItems={false}
            />
          </Box>
        )}
      </Box>
    </Flex>
  );
}

export default TokenSettings;
