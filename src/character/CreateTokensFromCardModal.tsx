import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Checkbox, Flex, Label, Spinner, Text } from "theme-ui";
import { useToasts } from "react-toast-notifications";
import SimpleBar from "simplebar-react";

import Modal from "../components/Modal";

import { createTokenState } from "../helpers/token";
import Vector2 from "../helpers/Vector2";

import { useAssets } from "../contexts/AssetsContext";
import { useTokenData } from "../contexts/TokenDataContext";
import { useUserId } from "../contexts/UserIdContext";

import { TokenState } from "../types/TokenState";
import { TokensStateCreateHandler } from "../types/Events";

import { useI18n } from "../i18n";

import { useCharacterCardContext } from "./CharacterCardContext";
import { createTokenFromSummary } from "./characterToken";
import type { CardSummary } from "./types";

type CreateTokensFromCardModalProps = {
  isOpen: boolean;
  onRequestClose: () => void;
  onMapTokensStateCreate: TokensStateCreateHandler;
};

function summarySubtitle(summary: CardSummary) {
  const classes = summary.classes.length
    ? summary.classes.map((item) => `${item.name}${item.level}`).join(" / ")
    : "—";
  return `${classes} · ${summary.edition}`;
}

/**
 * 从角色卡批量生成 Token。
 * 车卡结果 → 占位图/头像 + HP 条 + 战斗数值 → 进入 Token 库，可同时放到地图上。
 */
function CreateTokensFromCardModal({
  isOpen,
  onRequestClose,
  onMapTokensStateCreate,
}: CreateTokensFromCardModalProps) {
  const { t } = useI18n();
  const { addToast } = useToasts();
  const { state, ensureMounted, open: openCard } = useCharacterCardContext();
  const { addAssets } = useAssets();
  const { addToken } = useTokenData();
  const userId = useUserId();

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [placeOnMap, setPlaceOnMap] = useState(true);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    // 后台加载角色卡，仅用于读取列表（不弹出界面）。
    ensureMounted();
  }, [isOpen, ensureMounted]);

  const characters = state.characters ?? [];
  const selectedIds = useMemo(
    () => characters.filter((item) => selected[item.id]).map((item) => item.id),
    [characters, selected]
  );

  function toggle(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function selectAll(next: boolean) {
    const draft: Record<string, boolean> = {};
    for (const item of characters) draft[item.id] = next;
    setSelected(draft);
  }

  /** 把角色备份文件导入角色卡工作区（数据仍然只存在浏览器里）。 */
  async function handleImport(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const payloads: unknown[] = [];
      for (const file of Array.from(files)) {
        payloads.push(await file.text());
      }
      const result = await state.importPayloads(payloads);
      addToast(
        t("character.importSuccess", {
          added: result.added,
          updated: result.updated,
        }),
        { appearance: "success", autoDismiss: true }
      );
    } catch (error) {
      addToast(
        t("common.errorMessage", {
          message: error instanceof Error ? error.message : String(error),
        }),
        { appearance: "error", autoDismiss: true }
      );
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleGenerate() {
    if (!userId || selectedIds.length === 0) return;
    setBusy(true);
    try {
      const states: TokenState[] = [];
      let offset = new Vector2(0, 0);
      let created = 0;
      for (const id of selectedIds) {
        // 逐个取摘要：头像 data URL 可能较大，避免一次性全量传输。
        const summary = await state.loadSummary(id);
        if (!summary) continue;
        const { token, assets } = await createTokenFromSummary(summary, userId);
        await addAssets(assets);
        await addToken(token);
        created += 1;
        if (placeOnMap) {
          states.push(
            createTokenState(
              token,
              Vector2.add(new Vector2(0.5, 0.5), offset),
              userId
            )
          );
          offset = Vector2.add(offset, 0.04);
        }
      }
      if (states.length > 0) {
        onMapTokensStateCreate(states);
      }
      addToast(
        placeOnMap
          ? t("character.generateSuccessMap", { count: created })
          : t("character.generateSuccess", { count: created }),
        { appearance: "success", autoDismiss: true }
      );
      setSelected({});
      onRequestClose();
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

  const loadingList = state.characters === null;

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      style={{
        content: {
          maxWidth: "640px",
          width: "calc(100% - 16px)",
          padding: 0,
          display: "flex",
          overflow: "hidden",
        },
      }}
    >
      <Flex sx={{ flexDirection: "column", width: "100%", maxHeight: "80vh" }}>
        <Label pt={3} px={3} pb={1}>
          {t("character.generateTitle")}
        </Label>
        <Text variant="body2" px={3} pb={2} sx={{ opacity: 0.75 }}>
          {t("character.generateHint")}
        </Text>
        <Flex px={3} pb={2} sx={{ gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            multiple
            style={{ display: "none" }}
            onChange={(event) => void handleImport(event.target.files)}
          />
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            sx={{ py: 1, px: 2, fontSize: 1 }}
          >
            {t("character.importCharacters")}
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => {
              onRequestClose();
              openCard();
            }}
            sx={{ py: 1, px: 2, fontSize: 1 }}
          >
            {t("character.openCard")}
          </Button>
        </Flex>

        {loadingList ? (
          <Flex sx={{ alignItems: "center", justifyContent: "center", py: 4 }}>
            <Spinner mr={2} />
            <Text variant="body2">{t("character.loadingList")}</Text>
          </Flex>
        ) : characters.length === 0 ? (
          <Flex px={3} pb={3} sx={{ flexDirection: "column", gap: 2 }}>
            <Text variant="body2">{t("character.emptyList")}</Text>
            <Button
              onClick={() => {
                onRequestClose();
                openCard();
              }}
            >
              {t("character.openCard")}
            </Button>
          </Flex>
        ) : (
          <>
            <Flex px={3} pb={2} sx={{ gap: 2, alignItems: "center" }}>
              <Button
                variant="secondary"
                onClick={() => selectAll(true)}
                sx={{ py: 1, px: 2, fontSize: 1 }}
              >
                {t("permissions.selectAll")}
              </Button>
              <Button
                variant="secondary"
                onClick={() => selectAll(false)}
                sx={{ py: 1, px: 2, fontSize: 1 }}
              >
                {t("permissions.selectNone")}
              </Button>
              <Text variant="body2" sx={{ ml: "auto", opacity: 0.75 }}>
                {t("character.selectedCount", {
                  count: selectedIds.length,
                  total: characters.length,
                })}
              </Text>
            </Flex>
            <SimpleBar style={{ minHeight: 0, flexGrow: 1 }}>
              <Flex sx={{ flexDirection: "column", px: 3, gap: 1 }}>
                {characters.map((item) => (
                  <Flex
                    key={item.id}
                    sx={{
                      alignItems: "center",
                      gap: 2,
                      p: 2,
                      borderRadius: 4,
                      bg: selected[item.id] ? "muted" : "transparent",
                      cursor: "pointer",
                      border: "1px solid",
                      borderColor: "border",
                    }}
                    onClick={() => toggle(item.id)}
                  >
                    <Checkbox
                      checked={!!selected[item.id]}
                      onChange={() => toggle(item.id)}
                      onClick={(event) => event.stopPropagation()}
                    />
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Text sx={{ display: "block", fontWeight: "bold" }}>
                        {item.name}
                        {item.player ? `（${item.player}）` : ""}
                      </Text>
                      <Text variant="body2" sx={{ opacity: 0.75 }}>
                        {summarySubtitle(item)}
                      </Text>
                    </Box>
                    <Text variant="body2" sx={{ whiteSpace: "nowrap" }}>
                      {t("character.hpAcSummary", {
                        hp: item.hp.max ?? item.maxHp,
                        ac: item.ac,
                      })}
                    </Text>
                  </Flex>
                ))}
              </Flex>
            </SimpleBar>
            <Flex px={3} py={2} sx={{ alignItems: "center", gap: 2 }}>
              <Checkbox
                id="character-place-on-map"
                checked={placeOnMap}
                onChange={() => setPlaceOnMap((prev) => !prev)}
              />
              <Label htmlFor="character-place-on-map" sx={{ mb: 0 }}>
                {t("character.placeOnMap")}
              </Label>
            </Flex>
            <Flex px={3} pb={3} sx={{ gap: 2 }}>
              <Button
                onClick={() => void handleGenerate()}
                disabled={busy || selectedIds.length === 0}
                sx={{ flexGrow: 1 }}
              >
                {busy
                  ? t("character.generating")
                  : t("character.generateButton", { count: selectedIds.length })}
              </Button>
              <Button variant="secondary" onClick={onRequestClose} disabled={busy}>
                {t("common.cancel")}
              </Button>
            </Flex>
          </>
        )}
      </Flex>
    </Modal>
  );
}

export default CreateTokensFromCardModal;
