import { useMemo } from "react";
import { Box, Flex, Label, Text } from "theme-ui";

import Select from "../Select";

import { PermissionPlayer } from "../../contexts/PermissionsContext";
import {
  PermissionRulePatch,
} from "../../helpers/permissions";

import { useI18n } from "../../i18n";
import type { I18nContextValue } from "../../i18n/I18nContext";

import {
  EVERYONE_PERMISSIONS,
  PERMISSION_LEVELS,
  EveryonePermission,
  PermissionLevel,
  PermissionRule,
} from "../../types/Permission";

type Translator = I18nContextValue["t"];

type Option<T extends string> = { value: T; label: string; hint?: string };

/** 等级 → 文案 */
export function permissionLevelLabel(
  t: Translator,
  level: EveryonePermission
): string {
  return t(`permissions.level.${level}` as any);
}

/** 等级 → 一句话说明 */
export function permissionLevelHint(
  t: Translator,
  level: EveryonePermission
): string {
  return t(`permissions.levelHint.${level}` as any);
}

function buildLevelOptions(
  t: Translator,
  levels: readonly EveryonePermission[]
): Option<string>[] {
  return levels.map((level) => ({
    value: level,
    label: permissionLevelLabel(t, level),
    hint: permissionLevelHint(t, level),
  }));
}

export function usePermissionLevelOptions() {
  const { t } = useI18n();
  return useMemo(
    () => ({
      everyone: buildLevelOptions(t, EVERYONE_PERMISSIONS),
      player: buildLevelOptions(t, PERMISSION_LEVELS),
    }),
    [t]
  );
}

type PermissionEditorProps = {
  /** 这个物件 / 类别自己设置的规则 */
  rule: PermissionRule;
  /** 上一层规则（物件级是类别默认，类别级是旧版 editFlags 推导值） */
  fallback?: PermissionRule;
  players: PermissionPlayer[];
  /** 物件级为 `true`，会出现「跟随类别默认」选项 */
  allowInherit?: boolean;
  /** 隐藏说明文字，用于侧栏等窄容器 */
  compact?: boolean;
  /** 元素 id 前缀，避免同一页面多个编辑器撞 id */
  idPrefix: string;
  disabled?: boolean;
  onChange: (patch: PermissionRulePatch) => void;
};

/**
 * 「所有玩家 + 特定玩家例外」的规则编辑器。
 *
 * 房主用它决定某个物件（或整个类别）谁可以动、谁只能看、谁完全看不到。
 */
function PermissionEditor({
  rule,
  fallback,
  players,
  allowInherit = false,
  compact = false,
  idPrefix,
  disabled = false,
  onChange,
}: PermissionEditorProps) {
  const { t } = useI18n();
  const options = usePermissionLevelOptions();

  const inheritOption = useMemo(() => {
    const inherited = fallback?.everyone;
    return {
      value: "",
      label: inherited
        ? t("permissions.inherits", {
            value: permissionLevelLabel(t, inherited),
          })
        : t("permissions.inheritCategory"),
      hint: inherited ? permissionLevelHint(t, inherited) : undefined,
    };
  }, [t, fallback?.everyone]);

  /**
   * 玩家行的「跟随」指的是「跟随这条规则的『所有玩家』」——
   * 如果物件自己设了 everyone 就引用它，否则引用上一层。
   */
  const playerInheritOption = useMemo(() => {
    const effective = rule.everyone ?? fallback?.everyone;
    return {
      value: "",
      label: effective
        ? t("permissions.inherits", {
            value: permissionLevelLabel(t, effective),
          })
        : t("permissions.inheritItem"),
      hint: effective ? permissionLevelHint(t, effective) : undefined,
    };
  }, [t, rule.everyone, fallback?.everyone]);

  const everyoneOptions = useMemo(
    () => (allowInherit ? [inheritOption, ...options.everyone] : options.everyone),
    [allowInherit, inheritOption, options.everyone]
  );

  const playerOptions = useMemo(
    () => [playerInheritOption, ...options.player],
    [playerInheritOption, options.player]
  );

  const everyoneValue = rule.everyone ?? (allowInherit ? "" : undefined);
  const selectedEveryone =
    everyoneOptions.find(
      (option) => option.value === (everyoneValue ?? "")
    ) ?? null;

  function handleEveryoneChange(option: Option<string> | null) {
    if (option === null) {
      return;
    }
    onChange({
      everyone: option.value === "" ? null : (option.value as EveryonePermission),
    });
  }

  function handlePlayerChange(userId: string, level: string) {
    onChange({ users: { [userId]: level === "" ? null : (level as PermissionLevel) } });
  }

  return (
    <Flex sx={{ flexDirection: "column", gap: 2 }}>
      <Box>
        <Label htmlFor={`${idPrefix}-everyone`} sx={{ fontSize: "14px" }}>
          {t("permissions.everyone")}
        </Label>
        <Select
          inputId={`${idPrefix}-everyone`}
          isDisabled={disabled}
          isSearchable={false}
          options={everyoneOptions}
          value={selectedEveryone}
          placeholder={
            allowInherit ? t("permissions.inheritCategory") : t("permissions.everyone")
          }
          onChange={handleEveryoneChange as any}
          formatOptionLabel={(option: any) => (
            <Box>
              <Text variant="body2">{option.label}</Text>
              {!compact && option.hint ? (
                <Text variant="caption" sx={{ display: "block", opacity: 0.6 }}>
                  {option.hint}
                </Text>
              ) : null}
            </Box>
          )}
        />
      </Box>

      <Box>
        <Text
          as="div"
          variant="body2"
          sx={{ fontWeight: "bold", fontSize: "14px" }}
        >
          {t("permissions.specificTitle")}
        </Text>
        {!compact && (
          <Text variant="caption" sx={{ display: "block", opacity: 0.6, mt: 1 }}>
            {t("permissions.specificHint")}
          </Text>
        )}
        {players.length === 0 ? (
          <Text variant="caption" sx={{ display: "block", opacity: 0.6, mt: 1 }}>
            {t("permissions.noPlayers")}
          </Text>
        ) : (
          <Box mt={1}>
            {players.map((player) => {
              const level = rule.users?.[player.userId] ?? "";
              const selected =
                playerOptions.find((option) => option.value === level) ??
                playerOptions[0];
              const name =
                player.nickname ||
                t("permissions.playerFallback", {
                  id: player.userId.slice(0, 6),
                });
              return (
                <Flex
                  key={player.userId}
                  sx={{ alignItems: "center", gap: 2, my: 1 }}
                >
                  <Text
                    variant="body2"
                    sx={{
                      flexShrink: 0,
                      width: "92px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={name}
                  >
                    {name}
                    {player.isSelf ? " ★" : ""}
                  </Text>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Select
                      inputId={`${idPrefix}-${player.userId}`}
                      isDisabled={disabled}
                      isSearchable={false}
                      options={playerOptions}
                      value={selected}
                      onChange={(option: any) =>
                        option && handlePlayerChange(player.userId, option.value)
                      }
                    />
                  </Box>
                </Flex>
              );
            })}
          </Box>
        )}
      </Box>
    </Flex>
  );
}

export default PermissionEditor;
