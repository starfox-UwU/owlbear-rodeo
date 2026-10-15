import { useMemo, useState } from "react";
import { Box, Button, Checkbox, Flex, Input, Label, Text } from "theme-ui";

import Modal from "../Modal";
import Select from "../Select";
import Divider from "../Divider";

import PermissionEditor, {
  usePermissionLevelOptions,
} from "./PermissionEditor";

import { usePermissions } from "../../contexts/PermissionsContext";
import { useI18n } from "../../i18n";
import { collectPermissionItems } from "../../helpers/permissionItems";

import {
  PERMISSION_TARGETS,
  PermissionLevel,
  PermissionTarget,
} from "../../types/Permission";
import { MapState } from "../../types/MapState";
import { RequestCloseEventHandler } from "../../types/Events";

type PermissionPanelProps = {
  isOpen: boolean;
  onRequestClose: RequestCloseEventHandler;
  mapState: MapState | null;
};

type Tab = "defaults" | PermissionTarget;

/**
 * 物件权限管理面板。
 *
 * 上半部分是三个类别的默认策略，下半部分可以逐个物件覆盖。
 */
function PermissionPanel({ isOpen, onRequestClose, mapState }: PermissionPanelProps) {
  const { t } = useI18n();
  const permissions = usePermissions();
  const levelOptions = usePermissionLevelOptions();

  const [tab, setTab] = useState<Tab>("defaults");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLevel, setBulkLevel] = useState<PermissionLevel>("view");

  const activeTarget: PermissionTarget | null =
    tab === "defaults" ? null : tab;

  const items = useMemo(
    () =>
      activeTarget
        ? collectPermissionItems(mapState, activeTarget, t as any)
        : [],
    [activeTarget, mapState, t]
  );

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return items;
    }
    return items.filter((item) => item.label.toLowerCase().includes(query));
  }, [items, search]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const visibleSelectedCount = filteredItems.filter((item) =>
    selectedSet.has(item.id)
  ).length;

  function handleTabChange(next: Tab) {
    setTab(next);
    setExpandedId(null);
    setSelectedIds([]);
    setSearch("");
  }

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      if (checked) {
        return prev.includes(id) ? prev : [...prev, id];
      }
      return prev.filter((current) => current !== id);
    });
  }

  const targets: PermissionTarget[] = [...PERMISSION_TARGETS];

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      style={{
        content: {
          width: "520px",
          maxWidth: "100%",
          maxHeight: "80vh",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <Flex sx={{ flexDirection: "column", gap: 2, minHeight: 0, flexGrow: 1 }}>
        <Label sx={{ fontSize: "18px" }}>{t("permissions.panelTitle")}</Label>
        <Text variant="caption" sx={{ opacity: 0.7 }}>
          {t("permissions.sectionHint")}
        </Text>
        <Divider bg="text" />

        {/* 类别切换 */}
        <Flex sx={{ gap: 1, flexWrap: "wrap" }}>
          <Button
            variant={tab === "defaults" ? "primary" : "secondary"}
            onClick={() => handleTabChange("defaults")}
            sx={{ flexGrow: 1 }}
          >
            {t("permissions.defaultsTitle")}
          </Button>
          {targets.map((target) => (
            <Button
              key={target}
              variant={tab === target ? "primary" : "secondary"}
              onClick={() => handleTabChange(target)}
              sx={{ flexGrow: 1 }}
            >
              {t(`permissions.target.${target}` as any)}
            </Button>
          ))}
        </Flex>

        <Box sx={{ overflowY: "auto", minHeight: 0, pr: 1 }}>
          {tab === "defaults" ? (
            <Flex sx={{ flexDirection: "column", gap: 3 }}>
              <Text variant="caption" sx={{ opacity: 0.7 }}>
                {t("permissions.defaultsHint")}
              </Text>
              {targets.map((target) => (
                <Box key={target}>
                  <Text
                    as="div"
                    sx={{
                      fontWeight: "bold",
                      borderBottom: "1px solid",
                      borderColor: "gray",
                      pb: 1,
                      mb: 2,
                    }}
                  >
                    {t(`permissions.target.${target}` as any)}
                  </Text>
                  <PermissionEditor
                    idPrefix={`panel-default-${target}`}
                    rule={permissions.defaultRule(target)}
                    players={permissions.players}
                    onChange={(patch) =>
                      permissions.setRule(target, null, patch)
                    }
                  />
                </Box>
              ))}
            </Flex>
          ) : (
            <Flex sx={{ flexDirection: "column", gap: 2 }}>
              <Text variant="caption" sx={{ opacity: 0.7 }}>
                {t("permissions.itemHint")}
              </Text>

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("permissions.itemSearch")}
                aria-label={t("permissions.itemSearch")}
                sx={{ px: 2, py: 1 }}
              />

              {/* 批量授权 */}
              <Flex sx={{ alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                <Text variant="caption" sx={{ flexShrink: 0 }}>
                  {t("permissions.selectionCount", {
                    count: visibleSelectedCount,
                    total: filteredItems.length,
                  })}
                </Text>
                <Button
                  variant="secondary"
                  onClick={() =>
                    setSelectedIds(filteredItems.map((item) => item.id))
                  }
                  sx={{ flexShrink: 0 }}
                >
                  {t("permissions.selectAll")}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setSelectedIds([])}
                  sx={{ flexShrink: 0 }}
                >
                  {t("permissions.selectNone")}
                </Button>
              </Flex>
              <Flex sx={{ alignItems: "center", gap: 2 }}>
                <Box sx={{ width: "160px", flexShrink: 0 }}>
                  <Select
                    inputId="permission-panel-bulk-level"
                    isSearchable={false}
                    options={levelOptions.player}
                    value={levelOptions.player.find(
                      (option) => option.value === bulkLevel
                    )}
                    onChange={(option: any) =>
                      option && setBulkLevel(option.value as PermissionLevel)
                    }
                  />
                </Box>
                <Button
                  disabled={visibleSelectedCount === 0 || !activeTarget}
                  onClick={() => {
                    if (!activeTarget) {
                      return;
                    }
                    permissions.setRules(
                      activeTarget,
                      filteredItems
                        .filter((item) => selectedSet.has(item.id))
                        .map((item) => item.id),
                      { everyone: bulkLevel }
                    );
                  }}
                  sx={{ flexGrow: 1 }}
                >
                  {t("permissions.applyToSelection")}
                </Button>
              </Flex>
              {selectedIds.length > 0 && activeTarget && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    permissions.clearRules(selectedIds);
                    setSelectedIds([]);
                  }}
                >
                  {t("permissions.clearAllItems")}
                </Button>
              )}

              <Divider bg="text" />

              {filteredItems.length === 0 ? (
                <Text variant="caption" sx={{ opacity: 0.7 }}>
                  {items.length === 0
                    ? t("permissions.itemEmpty")
                    : t("permissions.itemNoMatch")}
                </Text>
              ) : (
                filteredItems.map((item) => {
                  const customized = permissions.hasItemRule(item.id);
                  const expanded = expandedId === item.id;
                  return (
                    <Box
                      key={item.id}
                      sx={{
                        border: "1px solid",
                        borderColor: "gray",
                        borderRadius: "4px",
                        p: 1,
                      }}
                    >
                      <Flex sx={{ alignItems: "center", gap: 2 }}>
                        <Checkbox
                          checked={selectedSet.has(item.id)}
                          onChange={(event) =>
                            toggleSelected(item.id, event.target.checked)
                          }
                          aria-label={item.label}
                        />
                        <Text
                          variant="body2"
                          sx={{
                            flexGrow: 1,
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={item.label}
                        >
                          {item.label}
                        </Text>
                        <Text
                          variant="caption"
                          sx={{
                            flexShrink: 0,
                            opacity: customized ? 1 : 0.55,
                            color: customized ? "primary" : "inherit",
                          }}
                        >
                          {customized
                            ? t("permissions.itemCustomized")
                            : t("permissions.itemFollowingDefault")}
                        </Text>
                        <Button
                          variant="secondary"
                          aria-label={t("common.edit")}
                          title={t("common.edit")}
                          onClick={() =>
                            setExpandedId(expanded ? null : item.id)
                          }
                          sx={{ flexShrink: 0, px: 2 }}
                        >
                          {expanded ? "▲" : "▼"}
                        </Button>
                      </Flex>
                      {expanded && activeTarget && (
                        <Box mt={2}>
                          <PermissionEditor
                            idPrefix={`panel-item-${item.id}`}
                            rule={permissions.itemRule(item.id) ?? {}}
                            fallback={permissions.defaultRule(activeTarget)}
                            players={permissions.players}
                            allowInherit
                            onChange={(patch) =>
                              permissions.setRule(activeTarget, item.id, patch)
                            }
                          />
                          <Flex sx={{ justifyContent: "flex-end", mt: 2 }}>
                            <Button
                              variant="secondary"
                              disabled={!customized}
                              onClick={() =>
                                permissions.clearRules([item.id])
                              }
                            >
                              {t("permissions.clearItem")}
                            </Button>
                          </Flex>
                        </Box>
                      )}
                    </Box>
                  );
                })
              )}
            </Flex>
          )}
        </Box>

        <Divider bg="text" />
        <Text variant="caption" sx={{ opacity: 0.7 }}>
          {t("permissions.gmNote")}
        </Text>
        <Flex sx={{ justifyContent: "flex-end" }}>
          <Button onClick={onRequestClose}>{t("common.close")}</Button>
        </Flex>
      </Flex>
    </Modal>
  );
}

export default PermissionPanel;
