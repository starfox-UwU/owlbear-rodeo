import { useRef, useState } from "react";
import { Box, Button, Flex, Label, Text } from "theme-ui";
import { useToasts } from "react-toast-notifications";

import { useAssets } from "../../contexts/AssetsContext";
import { useUserId } from "../../contexts/UserIdContext";
import { UpdateTokenEventHandler } from "../../contexts/TokenDataContext";

import { Token } from "../../types/Token";

import { buildReplacementAsset, summaryToAttributes } from "../../character/characterToken";
import { useOptionalCharacterCardContext } from "../../character/CharacterCardContext";

import { useI18n } from "../../i18n";

type TokenImageEditorProps = {
  token: Token;
  onUpdateToken: UpdateTokenEventHandler;
};

/**
 * Token 图像与角色数值的来源管理。
 *
 * - 任意 File Token 都可以上传替换图像；
 * - 由角色卡生成的 Token 还能「同步头像」「重新同步数值」，
 *   让游玩时的数值和车卡结果保持一致。
 */
function TokenImageEditor({ token, onUpdateToken }: TokenImageEditorProps) {
  const { t } = useI18n();
  const { addToast } = useToasts();
  const { addAssets } = useAssets();
  const userId = useUserId();
  const card = useOptionalCharacterCardContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const linkedId = token.characterId;
  const fileToken = token.type === "file";

  async function applyAsset(
    build: () => Promise<Awaited<ReturnType<typeof buildReplacementAsset>>>
  ) {
    setBusy(true);
    try {
      const result = await build();
      if (!result) {
        addToast(t("character.imageFailed"), { appearance: "error", autoDismiss: true });
        return;
      }
      await addAssets([result.asset]);
      await onUpdateToken(token.id, {
        type: "file",
        file: result.asset.id,
        thumbnail: result.asset.id,
        width: result.width,
        height: result.height,
        outline: result.outline,
      } as Partial<Token>);
      addToast(t("character.imageUpdated"), { appearance: "success", autoDismiss: true });
    } catch (error) {
      addToast(
        t("common.errorMessage", {
          message: error instanceof Error ? error.message : String(error),
        }),
        { appearance: "error", autoDismiss: true }
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    await applyAsset(() =>
      buildReplacementAsset({ kind: "file", file }, userId || "unknown", file.name)
    );
    if (inputRef.current) inputRef.current.value = "";
  }

  async function syncPortrait() {
    if (!card || !linkedId) return;
    await applyAsset(async () => {
      const summary = await card.state.loadSummary(linkedId);
      if (!summary?.portrait) {
        throw new Error(t("character.noPortrait"));
      }
      return buildReplacementAsset(
        { kind: "portrait", portrait: summary.portrait },
        userId || "unknown",
        `${summary.name}.png`
      );
    });
  }

  async function syncValues() {
    if (!card || !linkedId) return;
    setBusy(true);
    try {
      const summary = await card.state.loadSummary(linkedId);
      if (!summary) throw new Error(t("character.missingCharacter"));
      await onUpdateToken(token.id, {
        defaultAttributes: summaryToAttributes(summary, userId || "unknown"),
      });
      addToast(t("character.valuesSynced"), { appearance: "success", autoDismiss: true });
    } catch (error) {
      addToast(
        t("common.errorMessage", {
          message: error instanceof Error ? error.message : String(error),
        }),
        { appearance: "error", autoDismiss: true }
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box mb={3}>
      <Label>{t("character.imageLabel")}</Label>
      <Flex sx={{ gap: 2, flexWrap: "wrap", alignItems: "center" }}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
        <Button
          variant="secondary"
          disabled={busy || !fileToken}
          onClick={() => inputRef.current?.click()}
          sx={{ py: 1, px: 2, fontSize: 1 }}
        >
          {t("character.uploadImage")}
        </Button>
        {linkedId && card && (
          <>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void syncPortrait()}
              sx={{ py: 1, px: 2, fontSize: 1 }}
            >
              {t("character.syncPortrait")}
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void syncValues()}
              sx={{ py: 1, px: 2, fontSize: 1 }}
            >
              {t("character.syncValues")}
            </Button>
          </>
        )}
      </Flex>
      <Text variant="body2" mt={1} sx={{ opacity: 0.7 }}>
        {linkedId
          ? t("character.imageHintLinked")
          : fileToken
            ? t("character.imageHint")
            : t("character.imageHintDefault")}
      </Text>
    </Box>
  );
}

export default TokenImageEditor;
