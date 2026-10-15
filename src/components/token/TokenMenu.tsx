import React, { useEffect, useState, useRef } from "react";
import { Box, Input, Flex, Text, IconButton, Checkbox, Label } from "theme-ui";
import Konva from "konva";

import MapMenu from "../map/MapMenu";
import TokenAttributeEditor from "./TokenAttributeEditor";

import colors, { Color, colorOptions } from "../../helpers/colors";
import {
  buildNextAttributes,
  createEmptyAttributes,
} from "../../helpers/tokenAttributes";

import usePrevious from "../../hooks/usePrevious";

import LockIcon from "../../icons/TokenLockIcon";
import UnlockIcon from "../../icons/TokenUnlockIcon";
import ShowIcon from "../../icons/TokenShowIcon";
import HideIcon from "../../icons/TokenHideIcon";
import TokenCharacterIcon from "../../icons/TokenCharacterIcon";
import TokenPropIcon from "../../icons/TokenPropIcon";
import TokenMountIcon from "../../icons/TokenMountIcon";
import TokenAttachmentIcon from "../../icons/TokenAttachmentIcon";
import TokenShowIcon from "../../icons/TokenShowIcon";
import TokenHideIcon from "../../icons/TokenHideIcon";
import ExpandMoreIcon from "../../icons/ExpandMoreIcon";

import { useUserId } from "../../contexts/UserIdContext";

import { useI18n } from "../../i18n";

import {
  RequestCloseEventHandler,
  TokenStateChangeEventHandler,
} from "../../types/Events";
import { TokenState } from "../../types/TokenState";
import { Map } from "../../types/Map";
import { TokenCategory } from "../../types/Token";

type TokenMenuProps = {
  isOpen: boolean;
  onRequestClose: RequestCloseEventHandler;
  tokenState?: TokenState;
  tokenImage?: Konva.Node;
  focus: boolean;
  onTokenStateChange: TokenStateChangeEventHandler;
  map: Map | null;
  fogEnabled?: boolean;
};

function TokenMenu({
  isOpen,
  onRequestClose,
  tokenState,
  tokenImage,
  focus,
  onTokenStateChange,
  map,
  fogEnabled = true,
}: TokenMenuProps) {
  const { t } = useI18n();

  const userId = useUserId();

  const tokenCategories: Record<
    TokenCategory,
    { title: string; icon: React.ReactNode; next: TokenCategory }
  > = {
    character: {
      title: t("tokens.category.character"),
      icon: <TokenCharacterIcon />,
      next: "prop",
    },
    prop: {
      title: t("tokens.category.prop"),
      icon: <TokenPropIcon />,
      next: "vehicle",
    },
    vehicle: {
      title: t("tokens.category.mount"),
      icon: <TokenMountIcon />,
      next: "attachment",
    },
    attachment: {
      title: t("tokens.category.attachment"),
      icon: <TokenAttachmentIcon />,
      next: "character",
    },
  };

  const wasOpen = usePrevious(isOpen);

  const menuWidth = 240;
  const sidePanelWidth = 200;

  const [menuLeft, setMenuLeft] = useState(0);
  const [menuTop, setMenuTop] = useState(0);
  const [visionLightOpen, setVisionLightOpen] = useState(false);
  const [attributesOpen, setAttributesOpen] = useState(false);
  const sidePanelRef = useRef<HTMLDivElement | null>(null);
  const [sidePanelStyle, setSidePanelStyle] = useState<{
    left?: number;
    top?: number;
  }>({});
  const sidePanelOpen = visionLightOpen || attributesOpen;
  useEffect(() => {
    if (isOpen && !wasOpen && tokenState) {
      setVisionLightOpen(false);
      setAttributesOpen(false);
      // Update menu position
      if (tokenImage) {
        const imageRect = tokenImage.getClientRect();
        const mapElement = document.querySelector(".map");
        if (mapElement) {
          const mapRect = mapElement.getBoundingClientRect();
          // Center X for the menu which is menuWidth px wide
          setMenuLeft(
            mapRect.left + imageRect.x + imageRect.width / 2 - menuWidth / 2
          );
          // Y 20px from the bottom
          setMenuTop(mapRect.top + imageRect.y + imageRect.height + 20);
        }
      }
    }
  }, [isOpen, tokenState, wasOpen, tokenImage]);
  useEffect(() => {
    if (!fogEnabled && visionLightOpen) {
      setVisionLightOpen(false);
    }
  }, [fogEnabled, visionLightOpen]);

  useEffect(() => {
    if (!sidePanelOpen) {
      return;
    }

    function updateSidePanelPosition() {
      const panel = sidePanelRef.current;
      const panelWidth = sidePanelWidth;
      const panelGap = 8;

      let left = menuLeft - panelWidth - panelGap;
      const minLeft = 8;
      const maxLeft = window.innerWidth - panelWidth - 8;
      if (left < minLeft) {
        left = menuLeft + menuWidth + panelGap;
      }
      if (left > maxLeft) {
        left = maxLeft;
      }

      let top = menuTop;
      if (panel) {
        const rect = panel.getBoundingClientRect();
        const maxTop = window.innerHeight - rect.height - 8;
        top = Math.min(Math.max(menuTop, 8), Math.max(8, maxTop));
      }

      setSidePanelStyle({ left, top });
    }

    updateSidePanelPosition();
    window.addEventListener("resize", updateSidePanelPosition);
    return () => window.removeEventListener("resize", updateSidePanelPosition);
  }, [sidePanelOpen, menuLeft, menuTop]);

  function handleLabelChange(event: React.ChangeEvent<HTMLInputElement>) {
    const label = event.target.value.substring(0, 48);
    tokenState && onTokenStateChange({ [tokenState.id]: { label: label } });
  }

  function handleStatusChange(status: Color) {
    if (!tokenState) {
      return;
    }
    const statuses = new Set(tokenState.statuses.filter((s) => s));
    if (statuses.has(status)) {
      statuses.delete(status);
    } else {
      statuses.add(status);
    }
    onTokenStateChange({
      [tokenState.id]: { statuses: [...statuses] },
    });
  }

  function handleVisibleChange() {
    tokenState &&
      onTokenStateChange({
        [tokenState.id]: { visible: !tokenState.visible },
      });
  }

  function handleVisionChange() {
    if (!tokenState) {
      return;
    }
    const nextHasVision = !tokenState.hasVision;
    const nextRange =
      nextHasVision && (!tokenState.visionRange || tokenState.visionRange <= 0)
        ? 6
        : tokenState.visionRange;
    onTokenStateChange({
      [tokenState.id]: { hasVision: nextHasVision, visionRange: nextRange },
    });
  }

  function handleLockChange() {
    tokenState &&
      onTokenStateChange({
        [tokenState.id]: { locked: !tokenState.locked },
      });
  }

  function handleCategoryChange() {
    tokenState &&
      onTokenStateChange({
        [tokenState.id]: {
          category: tokenCategories[tokenState.category].next,
        },
      });
  }

  const lightEnabled = !!tokenState?.lightConfig?.enabled;
  const lightRadiusBright =
    typeof tokenState?.lightConfig?.radiusBright === "number"
      ? tokenState.lightConfig.radiusBright
      : 0;
  const lightRadiusDim =
    typeof tokenState?.lightConfig?.radiusDim === "number"
      ? tokenState.lightConfig.radiusDim
      : 0;
  const lightColor = tokenState?.lightConfig?.color || "#ffffff";
  const visionRange =
    typeof tokenState?.visionRange === "number" ? tokenState.visionRange : 0;

  type LightConfig = NonNullable<TokenState["lightConfig"]>;
  function handleLightChange(next: Partial<LightConfig>) {
    if (!tokenState) {
      return;
    }
    onTokenStateChange({
      [tokenState.id]: {
        lightConfig: {
          enabled: lightEnabled,
          radiusBright: lightRadiusBright,
          radiusDim: lightRadiusDim,
          color: lightColor,
          ...next,
        },
      },
    });
  }

  function handleLightToggle(enabled: boolean) {
    if (!tokenState) {
      return;
    }
    const nextBright =
      lightRadiusBright > 0 ? lightRadiusBright : enabled ? 4 : 0;
    const nextDim = lightRadiusDim > 0 ? lightRadiusDim : enabled ? 8 : 0;
    onTokenStateChange({
      [tokenState.id]: {
        lightConfig: {
          enabled,
          radiusBright: nextBright,
          radiusDim: nextDim,
          color: lightColor,
        },
      },
      });
  }

  const canEditAttributes =
    !!(map && tokenState && (map.owner === userId || tokenState.owner === userId));

  const attributes = tokenState?.attributes
    ? tokenState.attributes
    : createEmptyAttributes(userId || "unknown");
  const hasAttributes = attributes.bars.length > 0 || attributes.values.length > 0;
  useEffect(() => {
    if (hasAttributes) {
      setAttributesOpen(true);
    }
  }, [hasAttributes, tokenState?.id]);

  function updateAttributes(nextBars: typeof attributes.bars, nextValues: typeof attributes.values) {
    if (!tokenState) {
      return;
    }
    const nextAttributes = buildNextAttributes(
      tokenState.attributes,
      nextBars,
      nextValues,
      userId || "unknown"
    );
    onTokenStateChange({
      [tokenState.id]: { attributes: nextAttributes },
    });
  }

  function handleModalContent(node: HTMLElement) {
    if (node) {
      // Focus input
      const tokenLabelInput =
        node.querySelector<HTMLInputElement>("#changeTokenLabel");
      if (tokenLabelInput && focus) {
        tokenLabelInput.focus();
        tokenLabelInput.select();
      }

      // Ensure menu is in bounds
      const nodeRect = node.getBoundingClientRect();
      const mapElement = document.querySelector(".map");
      if (mapElement) {
        const mapRect = mapElement.getBoundingClientRect();
        setMenuLeft((prevLeft) =>
          Math.min(
            mapRect.right - nodeRect.width,
            Math.max(mapRect.left, prevLeft)
          )
        );
        setMenuTop((prevTop) =>
          Math.min(mapRect.bottom - nodeRect.height, prevTop)
        );
      }
    }
  }

  return (
    <MapMenu
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      top={`${menuTop}px`}
      left={`${menuLeft}px`}
      style={{ overflow: "visible" }}
      onModalContent={handleModalContent}
    >
      <Box sx={{ width: `${menuWidth}px`, overflow: "visible" }} p={1}>
        <Flex
          as="form"
          onSubmit={(e) => {
            e.preventDefault();
            onRequestClose();
          }}
          sx={{ alignItems: "center" }}
        >
          <Text
            as="label"
            variant="body2"
            sx={{ width: "45%", fontSize: "16px" }}
            p={1}
          >
            {t("tokens.label")}
          </Text>
          <Input
            id="changeTokenLabel"
            onChange={handleLabelChange}
            value={(tokenState && tokenState.label) || ""}
            sx={{
              padding: "4px",
              border: "none",
              ":focus": {
                outline: "none",
              },
            }}
            autoComplete="off"
          />
        </Flex>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          {colorOptions
            .filter((color) => color !== "primary")
            .map((color) => (
              <Box
                key={color}
                sx={{
                  width: "16.66%",
                  paddingTop: "16.66%",
                  borderRadius: "50%",
                  transform: "scale(0.75)",
                  backgroundColor: colors[color],
                  cursor: "pointer",
                }}
                onClick={() => handleStatusChange(color)}
                aria-label={t("tokens.labelColor", { color })}
              >
                {tokenState &&
                  tokenState.statuses &&
                  tokenState.statuses.includes(color) && (
                    <Box
                      sx={{
                        width: "100%",
                        height: "100%",
                        border: "2px solid white",
                        position: "absolute",
                        top: 0,
                        borderRadius: "50%",
                      }}
                    />
                  )}
              </Box>
            ))}
        </Box>
        {tokenState && (
          <Box mt={2} sx={{ position: "relative" }}>
            <Flex sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Text as="label" variant="body2">
                {t("tokens.attributes")}
              </Text>
              <IconButton
                aria-label={t("tokens.toggleAttributes")}
                title={t("tokens.toggleAttributes")}
                onClick={() =>
                  setAttributesOpen((prev) => {
                    if (hasAttributes && prev) {
                      return true;
                    }
                    const next = !prev;
                    if (next) {
                      setVisionLightOpen(false);
                    }
                    return next;
                  })
                }
                sx={{ transform: attributesOpen ? "rotate(180deg)" : "none" }}
                disabled={hasAttributes && attributesOpen}
              >
                <ExpandMoreIcon />
              </IconButton>
            </Flex>
          </Box>
        )}
        {/* Only show hide and lock token actions to map owners */}
        {map && map.owner === userId && tokenState && (
          <>
            <Flex sx={{ alignItems: "center", justifyContent: "space-around" }}>
              <IconButton
                onClick={handleVisibleChange}
                title={tokenState.visible ? t("tokens.hideToken") : t("tokens.showToken")}
                aria-label={tokenState.visible ? t("tokens.hideToken") : t("tokens.showToken")}
              >
                {tokenState.visible ? <ShowIcon /> : <HideIcon />}
              </IconButton>
              {fogEnabled && (
                <IconButton
                  onClick={handleVisionChange}
                  title={
                    tokenState.hasVision
                      ? t("tokens.disableVision")
                      : t("tokens.enableVision")
                  }
                  aria-label={
                    tokenState.hasVision
                      ? t("tokens.disableVision")
                      : t("tokens.enableVision")
                  }
                >
                  {tokenState.hasVision ? <TokenShowIcon /> : <TokenHideIcon />}
                </IconButton>
              )}
              <IconButton
                onClick={handleLockChange}
                title={tokenState.locked ? t("tokens.unlockToken") : t("tokens.lockToken")}
                aria-label={tokenState.locked ? t("tokens.unlockToken") : t("tokens.lockToken")}
              >
                {tokenState.locked ? <LockIcon /> : <UnlockIcon />}
              </IconButton>
              <IconButton
                onClick={handleCategoryChange}
                title={tokenCategories[tokenState.category].title}
                aria-label={tokenCategories[tokenState.category].title}
              >
                {tokenCategories[tokenState.category].icon}
              </IconButton>
            </Flex>
            {fogEnabled && (
              <Box mt={2} sx={{ position: "relative" }}>
                <Flex
                  sx={{
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text as="label" variant="body2">
                    {t("tokens.visionLight")}
                  </Text>
                  <IconButton
                    aria-label={t("tokens.toggleVisionAndLight")}
                    title={t("tokens.toggleVisionAndLight")}
                    onClick={() =>
                      setVisionLightOpen((prev) => {
                        const next = !prev;
                        if (next) {
                          setAttributesOpen(false);
                        }
                        return next;
                      })
                    }
                    sx={{
                      transform: visionLightOpen ? "rotate(180deg)" : "none",
                    }}
                  >
                    <ExpandMoreIcon />
                  </IconButton>
                </Flex>
              </Box>
            )}
          </>
        )}
        {fogEnabled && visionLightOpen && (
          <Box
            ref={sidePanelRef}
            sx={{
              position: "fixed",
              top: sidePanelStyle.top ?? menuTop,
              left: sidePanelStyle.left ?? menuLeft + menuWidth + 8,
              width: `${sidePanelWidth}px`,
              backgroundColor: "overlay",
              borderRadius: "4px",
              zIndex: 1,
            }}
            p={2}
          >
            <Text as="label" variant="body2">
              {t("tokens.vision")}
            </Text>
            <Text variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
              {t("tokens.rangeCells")}
            </Text>
            <Input
              type="number"
              min={0}
              step={1}
              value={visionRange}
              onChange={(e) =>
                tokenState &&
                onTokenStateChange({
                  [tokenState.id]: {
                    visionRange: parseFloat(e.target.value) || 0,
                  },
                })
              }
              sx={{ width: "100%", px: 1, py: "2px", mt: 1 }}
            />
            <Text as="label" variant="body2" sx={{ mt: 2 }}>
              {t("tokens.light")}
            </Text>
            <Label sx={{ display: "flex", alignItems: "center", mt: 1 }}>
              <Checkbox
                checked={lightEnabled}
                onChange={(e) => handleLightToggle(e.target.checked)}
              />
              <Text variant="body2" sx={{ ml: 2 }}>
                {t("tokens.enable")}
              </Text>
            </Label>
            <Text variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
              {t("tokens.color")}
            </Text>
            <Input
              type="color"
              value={lightColor}
              onChange={(e) => handleLightChange({ color: e.target.value })}
              sx={{ width: "100%", height: "24px", p: 0, mt: 1 }}
            />
            <Text variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
              {t("tokens.bright")}
            </Text>
            <Input
              type="number"
              value={lightRadiusBright}
              min={0}
              step={1}
              onChange={(e) =>
                handleLightChange({
                  radiusBright: parseFloat(e.target.value) || 0,
                })
              }
              sx={{ width: "100%", px: 1, py: "2px", mt: 1 }}
            />
            <Text variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
              {t("tokens.dim")}
            </Text>
            <Input
              type="number"
              value={lightRadiusDim}
              min={0}
              step={1}
              onChange={(e) =>
                handleLightChange({
                  radiusDim: parseFloat(e.target.value) || 0,
                })
              }
              sx={{ width: "100%", px: 1, py: "2px", mt: 1 }}
            />
          </Box>
        )}
        {tokenState && attributesOpen && (
          <Box
            ref={sidePanelRef}
            sx={{
              position: "fixed",
              top: sidePanelStyle.top ?? menuTop,
              left: sidePanelStyle.left ?? menuLeft + menuWidth + 8,
              width: `${sidePanelWidth}px`,
              backgroundColor: "overlay",
              borderRadius: "4px",
              zIndex: 1,
            }}
            p={2}
          >
            <TokenAttributeEditor
              attributes={attributes}
              onChange={updateAttributes}
              canEdit={canEditAttributes}
              title={t("tokens.attributes")}
              compact
            />
          </Box>
        )}

      </Box>
    </MapMenu>
  );
}

TokenMenu.defaultProps = {
  focus: false,
};

export default TokenMenu;
