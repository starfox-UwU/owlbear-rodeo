import { Box, Flex, Grid, Text, Input, IconButton } from "theme-ui";

import Select from "../Select";
import {
  DISPLAY_ANCHORS_BY_STYLE,
  DISPLAY_KINDS,
  DISPLAY_STYLES_BY_KIND,
  DISPLAY_TRIGGERS,
  MAX_DISPLAY_SCALE,
  MIN_DISPLAY_SCALE,
  hasItemOverride,
  hasKindOverride,
  resetItemStyle,
  resetKindDefault,
  resolveDisplayStyle,
  setItemStyle,
  setKindDefault,
} from "../../helpers/tokenDisplay";
import {
  ResolvedTokenDisplayStyle,
  TokenDisplayAnchor,
  TokenDisplayConfig,
  TokenDisplayItemStyle,
  TokenDisplayKind,
  TokenDisplayKindDefaults,
  TokenDisplayStyle,
  TokenDisplayTrigger,
} from "../../types/TokenState";
import TokenShowIcon from "../../icons/TokenShowIcon";
import TokenHideIcon from "../../icons/TokenHideIcon";
import { useUserId } from "../../contexts/UserIdContext";
import { useI18n } from "../../i18n";

export type TokenDisplayEditorItem = {
  key: string;
  kind: TokenDisplayKind;
  label: string;
  color?: string;
};

type TokenDisplayEditorProps = {
  /** 本指示物 / 本模板的展示配置 */
  config?: TokenDisplayConfig;
  /** 当前存在的条目，用于单项覆盖 */
  items?: TokenDisplayEditorItem[];
  /** 全局默认，作为「按类型默认」的兜底参考值，仅用于显示与回退 */
  globalDefaults?: TokenDisplayKindDefaults;
  onChange: (next: TokenDisplayConfig) => void;
  canEdit: boolean;
  compact?: boolean;
  showKindDefaults?: boolean;
  showItems?: boolean;
};

type Option<T> = { value: T; label: string };

function toOptions<T extends string>(
  values: readonly T[],
  labelFor: (value: T) => string
): Option<T>[] {
  return values.map((value) => ({ value, label: labelFor(value) }));
}

function TokenDisplayEditor({
  config,
  items = [],
  globalDefaults,
  onChange,
  canEdit,
  compact = true,
  showKindDefaults = true,
  showItems = true,
}: TokenDisplayEditorProps) {
  const { t } = useI18n();
  const userId = useUserId() || "unknown";

  const smallFontSize = compact ? "12px" : "14px";
  const inputSx = { flex: 1, padding: "4px", fontSize: smallFontSize } as const;
  const labelSx = { fontSize: "11px", opacity: 0.75 } as const;
  const blockSx = {
    borderRadius: "6px",
    backgroundColor: "rgba(0,0,0,0.25)",
  } as const;

  const styleLabels: Record<TokenDisplayStyle, string> = {
    ring: t("tokens.display.style.ring"),
    bar: t("tokens.display.style.bar"),
    badge: t("tokens.display.style.badge"),
    chip: t("tokens.display.style.chip"),
    text: t("tokens.display.style.text"),
  };
  const anchorLabels: Record<TokenDisplayAnchor, string> = {
    auto: t("tokens.display.anchor.auto"),
    ring: t("tokens.display.anchor.ring"),
    top: t("tokens.display.anchor.top"),
    bottom: t("tokens.display.anchor.bottom"),
    left: t("tokens.display.anchor.left"),
    right: t("tokens.display.anchor.right"),
    inside: t("tokens.display.anchor.inside"),
    panel: t("tokens.display.anchor.panel"),
  };
  const triggerLabels: Record<TokenDisplayTrigger, string> = {
    always: t("tokens.display.trigger.always"),
    hover: t("tokens.display.trigger.hover"),
    selected: t("tokens.display.trigger.selected"),
  };
  const kindLabels: Record<TokenDisplayKind, string> = {
    status: t("tokens.display.kind.status"),
    bar: t("tokens.display.kind.bar"),
    value: t("tokens.display.kind.value"),
  };

  /** 样式切换后旧锚点可能不再合法，这里顺手清掉 */
  function patchForStyle(
    current: ResolvedTokenDisplayStyle,
    nextStyle: TokenDisplayStyle
  ): Partial<TokenDisplayItemStyle> {
    const allowed = DISPLAY_ANCHORS_BY_STYLE[nextStyle];
    if (!allowed.includes(current.anchor as TokenDisplayAnchor)) {
      return { style: nextStyle, anchor: "auto" };
    }
    return { style: nextStyle };
  }

  /**
   * 把条目从状态栏挪回指示物上时，顺手把「悬停时」改成「始终」，
   * 否则用户会觉得「挪出来还是看不见」。反过来不自动改，保留显式选择。
   */
  function patchForAnchor(
    current: ResolvedTokenDisplayStyle,
    nextAnchor: TokenDisplayAnchor
  ): Partial<TokenDisplayItemStyle> {
    const patch: Partial<TokenDisplayItemStyle> = { anchor: nextAnchor };
    if (current.anchor === "panel" && nextAnchor !== "panel" && current.trigger === "hover") {
      patch.trigger = "always";
    }
    return patch;
  }

  function normalizePatch(
    current: ResolvedTokenDisplayStyle,
    patch: Partial<TokenDisplayItemStyle>
  ) {
    if (patch.style !== undefined) {
      return patchForStyle(current, patch.style);
    }
    if (patch.anchor !== undefined) {
      return patchForAnchor(current, patch.anchor);
    }
    return patch;
  }

  function updateKindDefault(
    kind: TokenDisplayKind,
    current: ResolvedTokenDisplayStyle,
    patch: Partial<TokenDisplayItemStyle>
  ) {
    if (!canEdit) {
      return;
    }
    onChange(setKindDefault(config, kind, normalizePatch(current, patch), userId));
  }

  function updateItem(
    item: TokenDisplayEditorItem,
    current: ResolvedTokenDisplayStyle,
    patch: Partial<TokenDisplayItemStyle>
  ) {
    if (!canEdit) {
      return;
    }
    onChange(
      setItemStyle(config, item.key, item.kind, normalizePatch(current, patch), userId)
    );
  }

  function renderControls(
    kind: TokenDisplayKind,
    current: ResolvedTokenDisplayStyle,
    onPatch: (patch: Partial<TokenDisplayItemStyle>) => void,
    onReset?: () => void,
    overridden?: boolean
  ) {
    const styleOptions = toOptions(
      DISPLAY_STYLES_BY_KIND[kind],
      (value) => styleLabels[value]
    );
    const anchorOptions = toOptions(
      DISPLAY_ANCHORS_BY_STYLE[current.style],
      (value) => anchorLabels[value as TokenDisplayAnchor]
    );
    const triggerOptions = toOptions(
      DISPLAY_TRIGGERS,
      (value) => triggerLabels[value as TokenDisplayTrigger]
    );
    const currentStyle = styleOptions.find(
      (option) => option.value === current.style
    );
    const currentAnchor = anchorOptions.find(
      (option) => option.value === current.anchor
    );
    const currentTrigger = triggerOptions.find(
      (option) => option.value === current.trigger
    );

    const inPanel = current.anchor === "panel";

    return (
      <>
        <Grid columns={inPanel ? "1fr" : "1fr 1fr"} gap={2}>
          {inPanel ? null : (
            <Box>
              <Text sx={labelSx}>{t("tokens.display.styleLabel")}</Text>
              <Select
                options={styleOptions}
                value={currentStyle}
                isDisabled={!canEdit}
                isSearchable={false}
                onChange={((option: Option<TokenDisplayStyle>) =>
                  option && onPatch({ style: option.value })) as any}
              />
            </Box>
          )}
          <Box>
            <Text sx={labelSx}>{t("tokens.display.anchorLabel")}</Text>
            <Select
              options={anchorOptions}
              value={currentAnchor}
              isDisabled={!canEdit}
              isSearchable={false}
              onChange={((option: Option<TokenDisplayAnchor>) =>
                option && onPatch({ anchor: option.value })) as any}
            />
          </Box>
        </Grid>
        <Box mt={1}>
          <Text sx={labelSx}>{t("tokens.display.triggerLabel")}</Text>
          <Select
            options={triggerOptions}
            value={currentTrigger}
            isDisabled={!canEdit}
            isSearchable={false}
            onChange={((option: Option<TokenDisplayTrigger>) =>
              option && onPatch({ trigger: option.value })) as any}
          />
        </Box>
        <Flex sx={{ alignItems: "flex-end", gap: "6px", mt: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Text sx={labelSx}>{t("tokens.display.scale")}</Text>
            <Input
              type="number"
              step={0.1}
              min={MIN_DISPLAY_SCALE}
              max={MAX_DISPLAY_SCALE}
              value={`${current.scale}`}
              disabled={!canEdit}
              onChange={(e) => onPatch({ scale: parseFloat(e.target.value) })}
              sx={inputSx}
              aria-label={t("tokens.display.scale")}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Text sx={labelSx}>{t("tokens.display.opacity")}</Text>
            <Input
              type="number"
              step={0.05}
              min={0.05}
              max={1}
              value={`${current.opacity}`}
              disabled={!canEdit}
              onChange={(e) => onPatch({ opacity: parseFloat(e.target.value) })}
              sx={inputSx}
              aria-label={t("tokens.display.opacity")}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Text sx={labelSx}>{t("tokens.display.order")}</Text>
            <Input
              type="number"
              step={1}
              value={`${current.order}`}
              disabled={!canEdit}
              onChange={(e) => onPatch({ order: parseInt(e.target.value, 10) })}
              sx={inputSx}
              aria-label={t("tokens.display.order")}
            />
          </Box>
          {onReset ? (
            <IconButton
              title={t("tokens.display.reset")}
              aria-label={t("tokens.display.reset")}
              onClick={onReset}
              disabled={!canEdit || !overridden}
              sx={{ padding: "2px", opacity: overridden ? 1 : 0.35 }}
            >
              <Text as="span" sx={{ fontSize: smallFontSize }}>
                ⟲
              </Text>
            </IconButton>
          ) : null}
        </Flex>
      </>
    );
  }

  return (
    <Box>
      {showKindDefaults && (
        <Box>
          <Text as="label" variant="body2" sx={{ fontSize: smallFontSize, opacity: 0.85 }}>
            {t("tokens.display.kindDefaults")}
          </Text>
          {DISPLAY_KINDS.map((kind) => {
            const current = resolveDisplayStyle(config, globalDefaults, kind, "");
            return (
              <Box key={kind} mt={1} p={compact ? 1 : 2} sx={blockSx}>
                <Flex sx={{ alignItems: "center", justifyContent: "space-between" }}>
                  <Text sx={{ fontSize: smallFontSize, fontWeight: 600 }}>
                    {kindLabels[kind]}
                  </Text>
                  <Flex sx={{ alignItems: "center", gap: "4px" }}>
                    <IconButton
                      title={
                        current.visible
                          ? t("tokens.display.hide")
                          : t("tokens.display.show")
                      }
                      aria-label={
                        current.visible
                          ? t("tokens.display.hide")
                          : t("tokens.display.show")
                      }
                      onClick={() =>
                        updateKindDefault(kind, current, {
                          visible: !current.visible,
                        })
                      }
                      disabled={!canEdit}
                      sx={{ padding: "2px" }}
                    >
                      {current.visible ? <TokenShowIcon /> : <TokenHideIcon />}
                    </IconButton>
                  </Flex>
                </Flex>
                {renderControls(
                  kind,
                  current,
                  (patch) => updateKindDefault(kind, current, patch),
                  () => onChange(resetKindDefault(config, kind, userId)),
                  hasKindOverride(config, kind)
                )}
              </Box>
            );
          })}
        </Box>
      )}

      {showItems && (
        <Box mt={showKindDefaults ? 2 : 0}>
          <Text as="label" variant="body2" sx={{ fontSize: smallFontSize, opacity: 0.85 }}>
            {t("tokens.display.overrides")}
          </Text>
          {items.length === 0 ? (
            <Text variant="body2" sx={{ opacity: 0.7, mt: 1, fontSize: smallFontSize }}>
              {t("tokens.display.noItems")}
            </Text>
          ) : (
            items.map((item) => {
              const current = resolveDisplayStyle(
                config,
                globalDefaults,
                item.kind,
                item.key
              );
              const overridden = hasItemOverride(config, item.key);
              return (
                <Box key={item.key} mt={1} p={compact ? 1 : 2} sx={blockSx}>
                  <Flex sx={{ alignItems: "center", justifyContent: "space-between" }}>
                    <Flex sx={{ alignItems: "center", gap: "6px", minWidth: 0 }}>
                      {item.color ? (
                        <Box
                          sx={{
                            width: "12px",
                            height: "12px",
                            borderRadius: "50%",
                            backgroundColor: item.color,
                            border: "1px solid rgba(255,255,255,0.4)",
                            flexShrink: 0,
                          }}
                        />
                      ) : null}
                      <Text
                        sx={{
                          fontSize: smallFontSize,
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.label}
                      </Text>
                      {overridden ? (
                        <Text sx={{ fontSize: "10px", opacity: 0.6 }}>
                          {t("tokens.display.overridden")}
                        </Text>
                      ) : null}
                    </Flex>
                    <IconButton
                      title={
                        current.visible
                          ? t("tokens.display.hide")
                          : t("tokens.display.show")
                      }
                      aria-label={
                        current.visible
                          ? t("tokens.display.hide")
                          : t("tokens.display.show")
                      }
                      onClick={() =>
                        updateItem(item, current, { visible: !current.visible })
                      }
                      disabled={!canEdit}
                      sx={{ padding: "2px" }}
                    >
                      {current.visible ? <TokenShowIcon /> : <TokenHideIcon />}
                    </IconButton>
                  </Flex>
                  {renderControls(
                    item.kind,
                    current,
                    (patch) => updateItem(item, current, patch),
                    () =>
                      onChange(resetItemStyle(config, item.key, userId)),
                    overridden
                  )}
                </Box>
              );
            })
          )}
        </Box>
      )}
    </Box>
  );
}

export default TokenDisplayEditor;
