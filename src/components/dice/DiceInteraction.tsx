import { useRef, useEffect, useState } from "react";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3, Color4, Matrix } from "@babylonjs/core/Maths/math";
import { TargetCamera } from "@babylonjs/core/Cameras/targetCamera";

import "@babylonjs/core/Physics/physicsEngineComponent";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import "@babylonjs/core/Materials/Textures/Loaders/ddsTextureLoader";
import "@babylonjs/core/Meshes/Builders/boxBuilder";
import "@babylonjs/core/Actions/actionManager";
import "@babylonjs/core/Culling/ray";
import "@babylonjs/loaders/glTF";

import ReactResizeDetector from "react-resize-detector";

import usePreventTouch from "../../hooks/usePreventTouch";

import ErrorBanner from "../banner/ErrorBanner";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { isSafari } from "../../helpers/shared";

const diceThrowSpeed = 2;

type SceneMountEvent = {
  scene: Scene;
  engine: Engine;
  canvas: HTMLCanvasElement;
};

type SceneMountEventHandler = (event: SceneMountEvent) => void;

type DiceInteractionProps = {
  onSceneMount?: SceneMountEventHandler;
  onPointerDown: () => void;
  onPointerUp: () => void;
};

function DiceInteraction({
  onSceneMount,
  onPointerDown,
  onPointerUp,
}: DiceInteractionProps) {
  const [error, setError] = useState<Error | undefined>();

  const sceneRef = useRef<Scene>();
  const engineRef = useRef<Engine>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    try {
      // iOS 15.4 introduced a bug - animation trails ar visible on dice in Safari. Have to disable antialiasing on Safari
      // https://forum.babylonjs.com/t/render-loop-issue-on-iphone-11-unwanted-animation-trails/29742
      const engine = new Engine(canvas, !isSafari, {
        preserveDrawingBuffer: true,
        stencil: true,
        // Prevent XR from loading as Safari 15 crashes with this enabled
        // TODO: Remove when https://github.com/BabylonJS/Babylon.js/pull/11121/files released
        xrCompatible: false
      });
      const scene = new Scene(engine);
      scene.clearColor = new Color4(0, 0, 0, 0);

      let camera = new TargetCamera("camera", new Vector3(0, 33.5, 0), scene);
      camera.fov = 0.65;
      camera.setTarget(Vector3.Zero());

      engineRef.current = engine;
      sceneRef.current = scene;

      // ⚠️ 这个「场景就绪」信号必须保持**同步**。
      // 骰子托盘里有只在挂载时执行一次的初始化（加载骰子模型），它依赖此刻
      // sceneRef 已经就绪；一旦把它推到异步，那段只跑一次的 effect 就会落进
      // 「UI 已挂载但 scene 还是 undefined」的窗口里被静默跳过，点击骰子时报
      // "Dice not loaded, call load before creating an instance"。
      // 物理引擎的启用是异步的（ammo.js 按需加载），改由托盘在创建
      // PhysicsImpostor 之前 await enableAmmoPhysics(scene)，
      // 见 DiceTrayOverlay 的 initializeScene。
      onSceneMount && onSceneMount({ scene, engine, canvas });

      engine.runRenderLoop(() => {
        const scene = sceneRef.current;
        const selectedMesh = selectedMeshRef.current;
        if (selectedMesh && scene) {
          const ray = scene.createPickingRay(
            scene.pointerX,
            scene.pointerY,
            Matrix.Identity(),
            camera
          );
          const currentPosition = selectedMesh.getAbsolutePosition();
          let newPosition = ray.origin.scale(camera.globalPosition.y);
          newPosition.y = currentPosition.y;
          const delta = newPosition.subtract(currentPosition);
          selectedMesh.setAbsolutePosition(newPosition);
          const velocity = delta.scale(1000 / scene.deltaTime);
          selectedMeshVelocityWindowRef.current =
            selectedMeshVelocityWindowRef.current.slice(
              Math.max(
                selectedMeshVelocityWindowRef.current.length -
                  selectedMeshVelocityWindowSize,
                0
              )
            );
          selectedMeshVelocityWindowRef.current.push(velocity);
        }
      });
    } catch (error) {
      if (error instanceof Error) {
        setError(error);
      }
    }
  }, [onSceneMount]);

  const selectedMeshRef = useRef<AbstractMesh | null>(null);
  const selectedMeshVelocityWindowRef = useRef<Vector3[]>([]);
  const selectedMeshVelocityWindowSize = 4;
  const selectedMeshMassRef = useRef<number>(0);
  function handlePointerDown() {
    const scene = sceneRef.current;
    if (scene) {
      const pickInfo = scene.pick(scene.pointerX, scene.pointerY);
      if (
        pickInfo &&
        pickInfo.hit &&
        pickInfo.pickedMesh &&
        pickInfo.pickedMesh.name !== "dice_tray"
      ) {
        pickInfo.pickedMesh.physicsImpostor?.setLinearVelocity(Vector3.Zero());
        pickInfo.pickedMesh.physicsImpostor?.setAngularVelocity(Vector3.Zero());

        // Save the meshes mass and set it to 0 so we can pick it up
        selectedMeshMassRef.current =
          pickInfo.pickedMesh.physicsImpostor?.mass || 0;
        pickInfo.pickedMesh.physicsImpostor?.setMass(0);

        selectedMeshRef.current = pickInfo.pickedMesh;
      }
    }
    onPointerDown();
  }

  function handlePointerUp() {
    const selectedMesh = selectedMeshRef.current;
    const velocityWindow = selectedMeshVelocityWindowRef.current;
    const scene = sceneRef.current;
    if (selectedMesh && scene) {
      // Average velocity window
      let velocity = Vector3.Zero();
      for (let v of velocityWindow) {
        velocity.addInPlace(v);
      }
      if (velocityWindow.length > 0) {
        velocity.scaleInPlace(1 / velocityWindow.length);
      }

      // Re-apply the meshes mass
      selectedMesh.physicsImpostor?.setMass(selectedMeshMassRef.current);
      selectedMesh.physicsImpostor?.forceUpdate();

      selectedMesh.physicsImpostor?.applyImpulse(
        velocity.scale(diceThrowSpeed * selectedMesh.physicsImpostor.mass),
        selectedMesh.physicsImpostor.getObjectCenter()
      );
    }
    selectedMeshRef.current = null;
    selectedMeshVelocityWindowRef.current = [];
    selectedMeshMassRef.current = 0;

    onPointerUp();
  }

  function handleResize(width?: number, height?: number) {
    if (width && height) {
      const engine = engineRef.current;
      if (engine && canvasRef.current) {
        engine.resize();
        canvasRef.current.width = width;
        canvasRef.current.height = height;
      }
    }
  }

  usePreventTouch(containerRef);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "absolute",
        overflow: "hidden",
      }}
      ref={containerRef}
    >
      <ReactResizeDetector
        handleWidth
        handleHeight
        onResize={handleResize}
        targetRef={containerRef}
      >
        <canvas
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
          ref={canvasRef}
          style={{ outline: "none" }}
        />
      </ReactResizeDetector>
      <ErrorBanner error={error} onRequestClose={() => setError(undefined)} />
    </div>
  );
}

DiceInteraction.defaultProps = {
  onPointerDown() {},
  onPointerUp() {},
};

export default DiceInteraction;
