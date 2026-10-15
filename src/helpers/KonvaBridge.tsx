import React, { useContext } from "react";

import {
  InteractionEmitterContext,
  SetPreventMapInteractionContext,
  StageWidthContext,
  StageHeightContext,
  MapWidthContext,
  MapHeightContext,
  StageScaleContext,
  DebouncedStageScaleContext,
  useInteractionEmitter,
  useSetPreventMapInteraction,
  useStageWidth,
  useStageHeight,
  useMapWidth,
  useMapHeight,
  useStageScale,
  useDebouncedStageScale,
} from "../contexts/MapInteractionContext";
import { MapStageProvider, useMapStage } from "../contexts/MapStageContext";
import UserIdContext, { useUserId } from "../contexts/UserIdContext";
import SettingsContext, { useSettings } from "../contexts/SettingsContext";
import KeyboardContext from "../contexts/KeyboardContext";
import I18nContext, { useI18n } from "../i18n/I18nContext";
import AssetsContext, {
  AssetURLsStateContext,
  AssetURLsUpdaterContext,
  useAssets,
} from "../contexts/AssetsContext";
import {
  useGrid,
  useGridCellPixelSize,
  useGridCellNormalizedSize,
  useGridStrokeWidth,
  useGridCellPixelOffset,
  useGridOffset,
  useGridPixelSize,
  useGridSnappingSensitivity,
  GridContext,
  GridPixelSizeContext,
  GridCellPixelSizeContext,
  GridCellNormalizedSizeContext,
  GridOffsetContext,
  GridStrokeWidthContext,
  GridCellPixelOffsetContext,
  GridSnappingSensitivityContext,
} from "../contexts/GridContext";
import DatabaseContext, { useDatabase } from "../contexts/DatabaseContext";
import PermissionsContext from "../contexts/PermissionsContext";

type StageRender = (wrapped: React.ReactNode) => React.ReactElement;

type KonvaBridgeProps = {
  stageRender: StageRender;
  children: React.ReactNode;
};

/**
 * Provide a bridge for konva that forwards our contexts
 *
 * ⚠️ react-konva 的 `<Stage>` 会另起一棵 React 渲染树，子节点**不会**继承主应用的
 * context。所以任何被 Konva 渲染的组件用到的 context，都必须在这里显式转发一次，
 * 否则会报 "useX must be used within a XProvider"。
 */
function KonvaBridge({
  stageRender,
  children,
}: KonvaBridgeProps): React.ReactElement {
  const mapStageRef = useMapStage();
  const userId = useUserId();
  const settings = useSettings();
  const assets = useAssets();
  const assetURLs = useContext(AssetURLsStateContext);
  const setAssetURLs = useContext(AssetURLsUpdaterContext);
  const keyboardValue = useContext(KeyboardContext);
  const i18n = useI18n();

  const stageScale = useStageScale();
  const stageWidth = useStageWidth();
  const stageHeight = useStageHeight();
  const setPreventMapInteraction = useSetPreventMapInteraction();
  const mapWidth = useMapWidth();
  const mapHeight = useMapHeight();
  const interactionEmitter = useInteractionEmitter();
  const debouncedStageScale = useDebouncedStageScale();

  const grid = useGrid();
  const gridPixelSize = useGridPixelSize();
  const gridCellNormalizedSize = useGridCellNormalizedSize();
  const gridCellPixelSize = useGridCellPixelSize();
  const gridStrokeWidth = useGridStrokeWidth();
  const gridCellPixelOffset = useGridCellPixelOffset();
  const gridOffset = useGridOffset();
  const gridSnappingSensitivity = useGridSnappingSensitivity();

  const database = useDatabase();
  const permissions = useContext(PermissionsContext);

  return stageRender(
    <DatabaseContext.Provider value={database}>
      <PermissionsContext.Provider value={permissions}>
        <UserIdContext.Provider value={userId}>
        <SettingsContext.Provider value={settings}>
          <I18nContext.Provider value={i18n}>
            <KeyboardContext.Provider value={keyboardValue}>
              <MapStageProvider value={mapStageRef}>
                <AssetsContext.Provider value={assets}>
                  <AssetURLsStateContext.Provider value={assetURLs}>
                    <AssetURLsUpdaterContext.Provider value={setAssetURLs}>
                      <InteractionEmitterContext.Provider
                        value={interactionEmitter}
                      >
                        <SetPreventMapInteractionContext.Provider
                          value={setPreventMapInteraction}
                        >
                          <StageWidthContext.Provider value={stageWidth}>
                            <StageHeightContext.Provider value={stageHeight}>
                              <MapWidthContext.Provider value={mapWidth}>
                                <MapHeightContext.Provider value={mapHeight}>
                                  <StageScaleContext.Provider
                                    value={stageScale}
                                  >
                                    <DebouncedStageScaleContext.Provider
                                      value={debouncedStageScale}
                                    >
                                      <GridContext.Provider value={grid}>
                                        <GridPixelSizeContext.Provider
                                          value={gridPixelSize}
                                        >
                                          <GridCellPixelSizeContext.Provider
                                            value={gridCellPixelSize}
                                          >
                                            <GridCellNormalizedSizeContext.Provider
                                              value={gridCellNormalizedSize}
                                            >
                                              <GridOffsetContext.Provider
                                                value={gridOffset}
                                              >
                                                <GridStrokeWidthContext.Provider
                                                  value={gridStrokeWidth}
                                                >
                                                  <GridCellPixelOffsetContext.Provider
                                                    value={gridCellPixelOffset}
                                                  >
                                                    <GridSnappingSensitivityContext.Provider
                                                      value={
                                                        gridSnappingSensitivity
                                                      }
                                                    >
                                                      {children}
                                                    </GridSnappingSensitivityContext.Provider>
                                                  </GridCellPixelOffsetContext.Provider>
                                                </GridStrokeWidthContext.Provider>
                                              </GridOffsetContext.Provider>
                                            </GridCellNormalizedSizeContext.Provider>
                                          </GridCellPixelSizeContext.Provider>
                                        </GridPixelSizeContext.Provider>
                                      </GridContext.Provider>
                                    </DebouncedStageScaleContext.Provider>
                                  </StageScaleContext.Provider>
                                </MapHeightContext.Provider>
                              </MapWidthContext.Provider>
                            </StageHeightContext.Provider>
                          </StageWidthContext.Provider>
                        </SetPreventMapInteractionContext.Provider>
                      </InteractionEmitterContext.Provider>
                    </AssetURLsUpdaterContext.Provider>
                  </AssetURLsStateContext.Provider>
                </AssetsContext.Provider>
              </MapStageProvider>
            </KeyboardContext.Provider>
          </I18nContext.Provider>
        </SettingsContext.Provider>
      </UserIdContext.Provider>
      </PermissionsContext.Provider>
    </DatabaseContext.Provider>
  );
}

export default KonvaBridge;
