(function initBabylonBoardRenderer(globalScope) {
    "use strict";

    class BabylonBoardRenderer {
        constructor(canvas, options = {}) {
            this.canvas = canvas;
            this.engine = null;
            this.scene = null;
            this.camera = null;
            this.hemiLight = null;
            this.dirLight = null;
            this.glowLayer = null;
            this.boardRoot = null;
            this.zoneRoot = null;
            this.zoneAnchors = new Map();
            this.cardMeshes = new Map();
            this.materialCache = new Map();
            this.animatedMaterials = [];
            this.options = options;
            this.currentPerspective = 0;
            this.assetRoot = options.assetRoot || "./assets/tablero3d/gltf/";
            this.boardTheme = options.boardTheme || "visor-neon";
            this.showLayoutLabels = Boolean(options.showLayoutLabels);
        }

        async init() {
            this.engine = new BABYLON.Engine(this.canvas, true, {
                preserveDrawingBuffer: true,
                stencil: true,
                antialias: true,
            });
            this.scene = new BABYLON.Scene(this.engine);
            this.scene.clearColor = new BABYLON.Color4(0.015, 0.025, 0.06, 1);
            this.scene.ambientColor = new BABYLON.Color3(0.16, 0.16, 0.2);

            this.camera = new BABYLON.ArcRotateCamera(
                "boardCamera",
                -Math.PI / 2,
                1.05,
                18,
                new BABYLON.Vector3(0, 0.3, 0),
                this.scene
            );
            this.camera.attachControl(this.canvas, true);
            this.camera.lowerRadiusLimit = 10;
            this.camera.upperRadiusLimit = 22;
            this.camera.upperBetaLimit = 1.35;
            this.camera.lowerBetaLimit = 0.62;
            this.camera.fov = 0.78;
            this.camera.panningSensibility = 0;
            this.camera.wheelDeltaPercentage = 0.01;

            this.hemiLight = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), this.scene);
            this.hemiLight.intensity = 0.9;

            this.dirLight = new BABYLON.DirectionalLight("dir", new BABYLON.Vector3(-0.35, -1, 0.25), this.scene);
            this.dirLight.position = new BABYLON.Vector3(6, 10, -6);
            this.dirLight.intensity = 0.55;

            const topLight = new BABYLON.PointLight("topAccent", new BABYLON.Vector3(0, 3.6, -3.1), this.scene);
            topLight.diffuse = new BABYLON.Color3(0.28, 0.48, 1.0);
            topLight.specular = new BABYLON.Color3(0.22, 0.38, 0.95);
            topLight.intensity = 1.15;
            topLight.range = 18;

            const bottomLight = new BABYLON.PointLight("bottomAccent", new BABYLON.Vector3(0, 3.6, 3.1), this.scene);
            bottomLight.diffuse = new BABYLON.Color3(1.0, 0.32, 0.4);
            bottomLight.specular = new BABYLON.Color3(0.95, 0.24, 0.32);
            bottomLight.intensity = 1.1;
            bottomLight.range = 18;

            const rimLight = new BABYLON.PointLight("rimLight", new BABYLON.Vector3(0, 1.2, 0), this.scene);
            rimLight.diffuse = new BABYLON.Color3(0.18, 0.95, 0.96);
            rimLight.specular = new BABYLON.Color3(0.18, 0.95, 0.96);
            rimLight.intensity = 0.5;
            rimLight.range = 24;

            this.glowLayer = new BABYLON.GlowLayer("boardGlow", this.scene, {
                blurKernelSize: 32,
            });
            this.glowLayer.intensity = 0.52;

            await this.buildBoardEnvironment();
            this.buildDuelZone();

            this.engine.runRenderLoop(() => {
                this.tickScene();
                this.scene.render();
            });

            globalScope.addEventListener("resize", () => {
                if (this.engine) this.engine.resize();
            });
        }

        async buildBoardEnvironment() {
            this.boardRoot = new BABYLON.TransformNode("boardRoot", this.scene);

            if (this.boardTheme === "asset-kit") {
                await this.loadBoardEnvironment();
                return;
            }

            this.buildVisorBoardEnvironment();
        }

        async loadBoardEnvironment() {
            const assets = [
                { file: "floor_dirt_grave.gltf", position: [0, -0.02, 0], scaling: [8.5, 1, 5.8] },
                { file: "path_A.gltf", position: [0, -0.005, 0], scaling: [6.4, 1, 4.3] },
                { file: "grave_A.gltf", position: [-7.2, 0, -3.1], scaling: [1.4, 1.4, 1.4], rotationY: Math.PI * 0.18 },
                { file: "grave_B.gltf", position: [7.1, 0, 3.1], scaling: [1.45, 1.45, 1.45], rotationY: -Math.PI * 0.72 },
                { file: "fence.gltf", position: [0, 0, -4.7], scaling: [4.8, 1.2, 1] },
                { file: "arch.gltf", position: [0, 0, 4.8], scaling: [2.2, 2.2, 2.2], rotationY: Math.PI },
                { file: "tree_dead_medium.gltf", position: [-6.8, 0, 4.9], scaling: [1.9, 1.9, 1.9], rotationY: Math.PI * 0.2 },
                { file: "tree_dead_small.gltf", position: [6.6, 0, -4.7], scaling: [2.0, 2.0, 2.0], rotationY: -Math.PI * 0.15 },
            ];

            for (const asset of assets) {
                const imported = await BABYLON.SceneLoader.ImportMeshAsync(
                    "",
                    this.assetRoot,
                    asset.file,
                    this.scene
                );

                const root = new BABYLON.TransformNode(`root-${asset.file}`, this.scene);
                imported.meshes.forEach((mesh) => {
                    if (mesh.name !== "__root__") {
                        mesh.parent = root;
                    }
                });

                root.parent = this.boardRoot;
                root.position = BABYLON.Vector3.FromArray(asset.position);
                root.scaling = BABYLON.Vector3.FromArray(asset.scaling);
                root.rotation.y = asset.rotationY || 0;
            }
        }

        buildVisorBoardEnvironment() {
            const background = BABYLON.MeshBuilder.CreateGround("board-background", {
                width: 34,
                height: 24,
            }, this.scene);
            background.parent = this.boardRoot;
            background.position.y = -0.2;
            background.material = this.makeStandardMaterial("background", {
                diffuse: [0.03, 0.04, 0.08],
                emissive: [0.025, 0.03, 0.08],
                specular: [0, 0, 0],
            });

            const halo = BABYLON.MeshBuilder.CreateGround("board-halo", {
                width: 22,
                height: 15,
            }, this.scene);
            halo.parent = this.boardRoot;
            halo.position.y = -0.12;
            halo.material = this.makeStandardMaterial("board-halo-mat", {
                diffuse: [0, 0, 0],
                emissive: [0.06, 0.12, 0.2],
                alpha: 0.16,
                specular: [0, 0, 0],
            });

            const outer = BABYLON.MeshBuilder.CreateBox("board-outer", {
                width: 15.4,
                depth: 10.4,
                height: 0.36,
            }, this.scene);
            outer.parent = this.boardRoot;
            outer.position.y = 0;
            outer.material = this.makeStandardMaterial("outer", {
                diffuse: [0.045, 0.055, 0.1],
                emissive: [0.015, 0.04, 0.05],
                specular: [0, 0, 0],
            });

            const inner = BABYLON.MeshBuilder.CreateBox("board-inner", {
                width: 14.7,
                depth: 9.8,
                height: 0.08,
            }, this.scene);
            inner.parent = this.boardRoot;
            inner.position.y = 0.15;
            inner.material = this.makeStandardMaterial("inner", {
                diffuse: [0.02, 0.03, 0.07],
                emissive: [0.015, 0.025, 0.045],
                specular: [0, 0, 0],
            });

            const glass = BABYLON.MeshBuilder.CreateBox("board-glass", {
                width: 14.55,
                depth: 9.65,
                height: 0.02,
            }, this.scene);
            glass.parent = this.boardRoot;
            glass.position.y = 0.21;
            glass.material = this.makeStandardMaterial("glass", {
                diffuse: [0.02, 0.04, 0.08],
                emissive: [0.02, 0.05, 0.08],
                alpha: 0.18,
                specular: [0.12, 0.12, 0.14],
            });

            this.createFrameOutline("board-outline", 14.9, 10.0, 0.11, new BABYLON.Color3(0.17, 0.89, 0.91), 0.11, 0, 0, 0.55);
            this.createMainPanel("top-panel", 0, -2.6, 8.2, 3.15, new BABYLON.Color3(0.24, 0.33, 1.0), new BABYLON.Color3(0.03, 0.04, 0.09));
            this.createMainPanel("bottom-panel", 0, 2.6, 8.2, 3.15, new BABYLON.Color3(1.0, 0.28, 0.32), new BABYLON.Color3(0.09, 0.03, 0.04));
            this.createPanelMarkers();
            this.createZoneGuides();
            this.createMidSlots();
            this.createSideStacksExample();
            if (this.showLayoutLabels) {
                this.createLayoutLabels();
            }
            this.createBoardAtmosphere();
        }

        createBoardAtmosphere() {
            const topGlow = BABYLON.MeshBuilder.CreateGround("top-glow", {
                width: 12,
                height: 4.6,
            }, this.scene);
            topGlow.parent = this.boardRoot;
            topGlow.position.set(0, 0.23, -2.55);
            topGlow.material = this.makeAnimatedMaterial("top-glow-mat", {
                diffuse: [0, 0, 0],
                emissive: [0.1, 0.16, 0.34],
                alpha: 0.22,
                specular: [0, 0, 0],
            }, {
                axis: "x",
                amplitude: 0.18,
                speed: 1.2,
            });

            const bottomGlow = BABYLON.MeshBuilder.CreateGround("bottom-glow", {
                width: 12,
                height: 4.6,
            }, this.scene);
            bottomGlow.parent = this.boardRoot;
            bottomGlow.position.set(0, 0.23, 2.55);
            bottomGlow.material = this.makeAnimatedMaterial("bottom-glow-mat", {
                diffuse: [0, 0, 0],
                emissive: [0.34, 0.1, 0.14],
                alpha: 0.2,
                specular: [0, 0, 0],
            }, {
                axis: "x",
                amplitude: 0.16,
                speed: 1.1,
            });
        }

        createMidSlots() {
            const positions = [-0.82, 0.82];
            positions.forEach((x, index) => {
                const slot = BABYLON.MeshBuilder.CreateBox(`mid-slot-${index}`, {
                    width: 1.22,
                    depth: 1.42,
                    height: 0.06,
                }, this.scene);
                slot.parent = this.boardRoot;
                slot.position.set(x, 0.16, 0);
                slot.material = this.makeStandardMaterial(`mid-slot-mat-${index}`, {
                    diffuse: [0.28, 0.08, 0.48],
                    emissive: [0.18, 0.05, 0.30],
                    alpha: 0.82,
                    specular: [0, 0, 0],
                });
                this.glowLayer.addExcludedMesh(slot);

                this.createFrameOutline(`mid-slot-outline-${index}`, 1.28, 1.48, 0.03, new BABYLON.Color3(0.74, 0.34, 1.0), 0.2, x, 0, 1.35);
            });
        }

        createSideStacksExample() {
            const stackConfigs = [
                { id: "left-top-1", x: -4.34, z: 4.20, color: [1.0, 0.84, 0.32] },
                { id: "left-top-2", x: -4.34, z: 2.80, color: [1.0, 0.84, 0.32] },
                { id: "left-top-3", x: -4.34, z: 1.40, color: [1.0, 0.84, 0.32] },
                { id: "left-bottom-1", x: -4.34, z: -2.80, color: [1.0, 0.84, 0.32] },
                { id: "left-bottom-2", x: -4.34, z: -4.20, color: [1.0, 0.84, 0.32] },
                { id: "right-top-1", x: 4.34, z: 4.20, color: [0.35, 1.0, 0.49] },
                { id: "right-top-2", x: 4.34, z: 2.80, color: [0.35, 1.0, 0.49] },
                { id: "right-bottom-1", x: 4.34, z: -1.40, color: [0.35, 1.0, 0.49] },
                { id: "right-bottom-2", x: 4.34, z: -2.80, color: [0.35, 1.0, 0.49] },
                { id: "right-bottom-3", x: 4.34, z: -4.20, color: [0.35, 1.0, 0.49] },
            ];

            stackConfigs.forEach((stack) => {
                this.createSideSlot(stack.id, stack.x, stack.z, BABYLON.Color3.FromArray(stack.color));
            });
        }

        createSideSlot(id, x, z, color) {
            const fill = BABYLON.MeshBuilder.CreateBox(`side-fill-${id}`, {
                width: 0.72,
                depth: 1.12,
                height: 0.03,
            }, this.scene);
            fill.parent = this.boardRoot;
            fill.position.set(x, 0.18, z);
            fill.material = this.makeStandardMaterial(`side-fill-mat-${id}`, {
                diffuse: [0.02, 0.03, 0.05],
                emissive: [color.r * 0.3, color.g * 0.3, color.b * 0.3],
                alpha: 0.16,
                specular: [0, 0, 0],
            });

            this.createFrameOutline(`side-outline-${id}`, 0.78, 1.18, 0.028, color, 0.22, x, z, 1.5);
        }

        createLayoutLabels() {
            const labels = [
                { text: "1", x: -5.65, z: -3.25, color: "#ff4a4a" },
                { text: "4", x: -5.65, z: 3.45, color: "#ff4a4a" },
                { text: "3", x: 5.65, z: -3.35, color: "#ff4a4a" },
                { text: "2", x: 5.65, z: 3.35, color: "#ff4a4a" },
                { text: "5", x: -1.45, z: 0.02, color: "#ff4a4a" },
                { text: "6", x: 1.45, z: 0.02, color: "#ff4a4a" },
            ];

            labels.forEach((label) => {
                this.createTextLabel(`layout-label-${label.text}`, label.text, label.x, label.z, label.color);
            });
        }

        createTextLabel(id, text, x, z, color) {
            const plane = BABYLON.MeshBuilder.CreatePlane(id, {
                width: 0.75,
                height: 0.75,
            }, this.scene);
            plane.parent = this.boardRoot;
            plane.position.set(x, 0.34, z);
            plane.rotation.x = Math.PI / 2;

            const texture = new BABYLON.DynamicTexture(`${id}-tex`, { width: 256, height: 256 }, this.scene, true);
            texture.hasAlpha = true;
            texture.drawText(text, 96, 180, "bold 160px Segoe UI", color, "transparent", true);

            const material = new BABYLON.StandardMaterial(`${id}-mat`, this.scene);
            material.diffuseTexture = texture;
            material.emissiveTexture = texture;
            material.opacityTexture = texture;
            material.diffuseColor = BABYLON.Color3.White();
            material.emissiveColor = BABYLON.Color3.White();
            material.specularColor = BABYLON.Color3.Black();
            plane.material = material;
        }

        createMainPanel(id, x, z, width, depth, edgeColor, fillColor) {
            const fill = BABYLON.MeshBuilder.CreateBox(`panel-${id}`, {
                width,
                depth,
                height: 0.05,
            }, this.scene);
            fill.parent = this.boardRoot;
            fill.position.set(x, 0.12, z);
            fill.material = this.makeAnimatedMaterial(`panel-${id}-mat`, {
                diffuse: [fillColor.r, fillColor.g, fillColor.b],
                emissive: [fillColor.r * 0.9, fillColor.g * 0.9, fillColor.b * 0.9],
                alpha: 0.84,
                specular: [0, 0, 0],
            }, {
                axis: "y",
                amplitude: 0.03,
                speed: id.includes("top") ? 0.55 : 0.72,
            });

            this.createFrameOutline(`panel-outline-${id}`, width, depth, 0.09, edgeColor, 0.16, x, z, 1.55);
        }

        createZoneGuides() {
            const rows = {
                a: -3.35,
                b: -1.65,
                c: 1.65,
                d: 3.35,
            };
            const columns = [-3.08, -1.54, 0, 1.54, 3.08];

            ["a", "b", "c", "d"].forEach((rowKey) => {
                const isTop = rowKey === "a" || rowKey === "b";
                const edge = (rowKey === "b" || rowKey === "c")
                    ? (isTop ? new BABYLON.Color3(0.35, 0.44, 1.0) : new BABYLON.Color3(1.0, 0.31, 0.34))
                    : new BABYLON.Color3(0.72, 0.72, 0.8);
                const fill = (rowKey === "b" || rowKey === "c")
                    ? (isTop ? new BABYLON.Color3(0.05, 0.08, 0.16) : new BABYLON.Color3(0.16, 0.05, 0.06))
                    : new BABYLON.Color3(0.03, 0.03, 0.05);

                columns.forEach((x, index) => {
                    this.createFrameOutline(
                        `zone-guide-${rowKey}${index + 1}`,
                        1.08,
                        1.46,
                        0.03,
                        edge,
                        0.22,
                        x,
                        rows[rowKey],
                        2.1
                    );

                    const fillMesh = BABYLON.MeshBuilder.CreateBox(`zone-fill-${rowKey}${index + 1}`, {
                        width: 1.0,
                        depth: 1.38,
                        height: 0.03,
                    }, this.scene);
                    fillMesh.parent = this.boardRoot;
                    fillMesh.position.set(x, 0.18, rows[rowKey]);
                    fillMesh.material = this.makeStandardMaterial(`zone-fill-mat-${rowKey}${index + 1}`, {
                        diffuse: [fill.r * 1.8, fill.g * 1.8, fill.b * 1.8],
                        emissive: [fill.r * 0.95, fill.g * 0.95, fill.b * 0.95],
                        alpha: 0.46,
                        specular: [0, 0, 0],
                    });
                });
            });
        }

        createPanelMarkers() {
            const markers = [
                { id: "top-left", x: -3.15, z: -2.6, color: [1.0, 0.22, 0.32], rot: 0 },
                { id: "top-right", x: 3.15, z: -2.6, color: [0.22, 0.58, 1.0], rot: 0 },
                { id: "bottom-left", x: -3.15, z: 2.6, color: [0.22, 0.58, 1.0], rot: Math.PI },
                { id: "bottom-right", x: 3.15, z: 2.6, color: [1.0, 0.22, 0.32], rot: Math.PI },
            ];

            markers.forEach((marker) => {
                const diamond = BABYLON.MeshBuilder.CreateBox(`marker-${marker.id}`, {
                    width: 0.48,
                    depth: 0.1,
                    height: 0.48,
                }, this.scene);
                diamond.parent = this.boardRoot;
                diamond.position.set(marker.x, 0.2, marker.z);
                diamond.rotation.y = Math.PI / 4;
                diamond.rotation.z = marker.rot;
                diamond.material = this.makeAnimatedMaterial(`marker-mat-${marker.id}`, {
                    diffuse: [0.01, 0.01, 0.01],
                    emissive: marker.color.map((value) => value * 1.8),
                    specular: [0, 0, 0],
                }, {
                    axis: "alpha",
                    amplitude: 0.18,
                    speed: 1.9,
                });
            });
        }

        createRowFrame(id, x, z, width, depth, edgeColor, fillColor) {
            const fill = BABYLON.MeshBuilder.CreateBox(`fill-${id}`, {
                width,
                depth,
                height: 0.05,
            }, this.scene);
            fill.parent = this.boardRoot;
            fill.position.set(x, 0.09, z);
            fill.material = this.makeStandardMaterial(`fill-mat-${id}`, {
                diffuse: [fillColor.r, fillColor.g, fillColor.b],
                emissive: [fillColor.r * 0.35, fillColor.g * 0.35, fillColor.b * 0.35],
                alpha: 0.46,
                specular: [0, 0, 0],
            });

            this.createFrameOutline(`outline-${id}`, width, depth, 0.12, edgeColor, 0.08, x, z);
        }

        createFrameOutline(id, width, depth, thickness, color, y = 0.1, x = 0, z = 0, emissiveScale = 1) {
            const horizontalSize = { width, depth: thickness, height: 0.05 };
            const verticalSize = { width: thickness, depth, height: 0.05 };
            const segments = [
                { key: "top", size: horizontalSize, pos: [x, y, z - (depth / 2)] },
                { key: "bottom", size: horizontalSize, pos: [x, y, z + (depth / 2)] },
                { key: "left", size: verticalSize, pos: [x - (width / 2), y, z] },
                { key: "right", size: verticalSize, pos: [x + (width / 2), y, z] },
            ];

            segments.forEach((segment) => {
                const mesh = BABYLON.MeshBuilder.CreateBox(`${id}-${segment.key}`, segment.size, this.scene);
                mesh.parent = this.boardRoot;
                mesh.position = BABYLON.Vector3.FromArray(segment.pos);
                mesh.material = this.makeStandardMaterial(`${id}-${segment.key}-mat`, {
                    diffuse: [0, 0, 0],
                    emissive: [color.r * emissiveScale, color.g * emissiveScale, color.b * emissiveScale],
                    specular: [0, 0, 0],
                });
            });
        }

        makeStandardMaterial(id, config) {
            const mat = new BABYLON.StandardMaterial(id, this.scene);
            if (config.diffuse) {
                mat.diffuseColor = BABYLON.Color3.FromArray(config.diffuse);
            }
            if (config.emissive) {
                mat.emissiveColor = BABYLON.Color3.FromArray(config.emissive);
            }
            if (config.specular) {
                mat.specularColor = BABYLON.Color3.FromArray(config.specular);
            } else {
                mat.specularColor = BABYLON.Color3.Black();
            }
            if (typeof config.alpha === "number") {
                mat.alpha = config.alpha;
            }
            return mat;
        }

        makeAnimatedMaterial(id, config, animationConfig) {
            const mat = this.makeStandardMaterial(id, config);
            if (animationConfig) {
                this.animatedMaterials.push({
                    material: mat,
                    axis: animationConfig.axis,
                    amplitude: animationConfig.amplitude,
                    speed: animationConfig.speed,
                    baseAlpha: typeof mat.alpha === "number" ? mat.alpha : 1,
                    baseEmissive: mat.emissiveColor ? mat.emissiveColor.clone() : new BABYLON.Color3(0, 0, 0),
                    baseY: 0,
                });
            }
            return mat;
        }

        tickScene() {
            const time = performance.now() * 0.001;
            this.animatedMaterials.forEach((entry) => {
                const wave = Math.sin(time * entry.speed) * entry.amplitude;
                if (entry.axis === "alpha") {
                    entry.material.alpha = Math.max(0.08, entry.baseAlpha + wave);
                    return;
                }
                if (entry.axis === "x" && entry.material.emissiveColor) {
                    entry.material.emissiveColor = new BABYLON.Color3(
                        Math.max(0, entry.baseEmissive.r + wave),
                        Math.max(0, entry.baseEmissive.g + wave * 0.7),
                        Math.max(0, entry.baseEmissive.b + wave * 0.4)
                    );
                    return;
                }
                if (entry.axis === "y" && entry.material.emissiveColor) {
                    entry.material.emissiveColor = new BABYLON.Color3(
                        Math.max(0, entry.baseEmissive.r + wave * 0.3),
                        Math.max(0, entry.baseEmissive.g + wave * 0.3),
                        Math.max(0, entry.baseEmissive.b + wave)
                    );
                }
            });
        }

        buildDuelZone() {
            this.zoneRoot = new BABYLON.TransformNode("zoneRoot", this.scene);

            const rows = {
                a: -3.35,
                b: -1.65,
                c: 1.65,
                d: 3.35,
            };
            const columns = [-3.08, -1.54, 0, 1.54, 3.08];

            ["a", "b", "c", "d"].forEach((rowKey) => {
                columns.forEach((x, index) => {
                    const id = `${rowKey}${index + 1}`;
                    const anchor = new BABYLON.TransformNode(`anchor-${id}`, this.scene);
                    anchor.parent = this.zoneRoot;
                    anchor.position = new BABYLON.Vector3(x, 0.24, rows[rowKey]);
                    this.zoneAnchors.set(id, anchor);

                    const zone = BABYLON.MeshBuilder.CreateGround(`zone-${id}`, {
                        width: 1.08,
                        height: 1.46,
                    }, this.scene);
                    zone.parent = anchor;
                    zone.position.y = -0.01;

                    const mat = new BABYLON.StandardMaterial(`zone-mat-${id}`, this.scene);
                    const isTop = rowKey === "a" || rowKey === "b";
                    const isMonster = rowKey === "b" || rowKey === "c";
                    mat.diffuseColor = isMonster
                        ? (isTop ? new BABYLON.Color3(0.28, 0.4, 0.95) : new BABYLON.Color3(0.95, 0.24, 0.28))
                        : new BABYLON.Color3(0.2, 0.2, 0.28);
                    mat.emissiveColor = isMonster
                        ? (isTop ? new BABYLON.Color3(0.18, 0.32, 0.92) : new BABYLON.Color3(0.92, 0.16, 0.2))
                        : new BABYLON.Color3(0.12, 0.1, 0.18);
                    mat.alpha = 0.18;
                    mat.specularColor = BABYLON.Color3.Black();
                    zone.material = mat;
                });
            });
        }

        getCardMaterial(textureUrl) {
            if (this.materialCache.has(textureUrl)) {
                return this.materialCache.get(textureUrl);
            }

            const mat = new BABYLON.StandardMaterial(`card-mat-${this.materialCache.size}`, this.scene);
            mat.diffuseTexture = new BABYLON.Texture(textureUrl, this.scene, true, false);
            mat.specularColor = BABYLON.Color3.Black();
            mat.emissiveColor = new BABYLON.Color3(0.17, 0.17, 0.17);
            this.materialCache.set(textureUrl, mat);
            return mat;
        }

        createCardMesh(cellId, code, hidden) {
            const mesh = BABYLON.MeshBuilder.CreatePlane(`card-${cellId}`, {
                width: 1.0,
                height: 1.42,
            }, this.scene);
            mesh.rotation.x = Math.PI / 2;
            mesh.position.y = 0.14;
            mesh.isPickable = false;
            mesh.material = this.getCardMaterial(hidden ? this.options.hiddenImageUrl : this.options.getCardImageUrl(code));
            mesh.metadata = {
                cellId,
                code,
                hidden,
                textureUrl: hidden ? this.options.hiddenImageUrl : this.options.getCardImageUrl(code),
            };
            return mesh;
        }

        updateField(fieldState) {
            const nextVisible = new Set();

            Object.values(fieldState || {}).forEach((fieldCard) => {
                if (!fieldCard || fieldCard.controller === undefined || fieldCard.location === undefined || fieldCard.sequence === undefined) {
                    return;
                }
                if (Number(fieldCard.location) === 0x10) {
                    return;
                }

                const cellId = this.options.getVisibleFieldCellKey(fieldCard.controller, fieldCard.location, fieldCard.sequence);
                if (!cellId) return;

                nextVisible.add(cellId);
                this.upsertFieldCard(cellId, fieldCard);
            });

            for (const [cellId, mesh] of this.cardMeshes.entries()) {
                if (!nextVisible.has(cellId)) {
                    mesh.dispose(false, true);
                    this.cardMeshes.delete(cellId);
                }
            }
        }

        upsertFieldCard(cellId, fieldCard) {
            const positionInfo = this.options.decodeCardPosition(fieldCard.position);
            const hidden = positionInfo.isFaceDown || !fieldCard.code;
            const isMonsterZone = Number(fieldCard.location) === 0x04;
            const isDefense = isMonsterZone && positionInfo.isDefense;
            const isTop = cellId.startsWith("a") || cellId.startsWith("b");

            let mesh = this.cardMeshes.get(cellId);
            if (!mesh) {
                mesh = this.createCardMesh(cellId, fieldCard.code, hidden);
                this.cardMeshes.set(cellId, mesh);
            }

            const anchor = this.zoneAnchors.get(cellId);
            if (anchor) {
                mesh.position.copyFrom(anchor.absolutePosition);
            }

            mesh.rotation.x = Math.PI / 2;
            mesh.rotation.y = hidden ? Math.PI : 0;
            mesh.rotation.z = isDefense ? (isTop ? Math.PI / 2 : -Math.PI / 2) : 0;
            mesh.scaling.x = isDefense ? 0.76 : 1;
            mesh.scaling.y = isDefense ? 0.76 : 1;
            mesh.scaling.z = 1;

            const nextTexture = hidden ? this.options.hiddenImageUrl : this.options.getCardImageUrl(fieldCard.code);
            if (mesh.metadata.textureUrl !== nextTexture) {
                mesh.material = this.getCardMaterial(nextTexture);
                mesh.metadata.textureUrl = nextTexture;
            }

            mesh.metadata.code = fieldCard.code;
            mesh.metadata.hidden = hidden;
        }

        updateHands(_handsState) {
            return;
        }

        async animateMove(moveEvent) {
            const mesh = this.cardMeshes.get(moveEvent.cellId);
            if (!mesh) return;

            const to = this.zoneAnchors.get(moveEvent.cellId)?.absolutePosition.clone();
            if (!to) return;
            const from = moveEvent.from || to.add(new BABYLON.Vector3(0, 0, moveEvent.fromTop ? -6 : 6));

            const anim = new BABYLON.Animation(
                `move-${moveEvent.cellId}`,
                "position",
                60,
                BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );

            anim.setKeys([
                { frame: 0, value: from },
                { frame: 10, value: new BABYLON.Vector3((from.x + to.x) / 2, 1.2, (from.z + to.z) / 2) },
                { frame: 20, value: to },
            ]);

            mesh.animations = [anim];
            await this.beginAnimationAsync(mesh, 0, 20);
        }

        async animateFlip(cellId, hiddenAfter) {
            const mesh = this.cardMeshes.get(cellId);
            if (!mesh) return;

            const start = mesh.rotation.y;
            const end = hiddenAfter ? Math.PI : 0;

            const anim = new BABYLON.Animation(
                `flip-${cellId}`,
                "rotation.y",
                60,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );

            anim.setKeys([
                { frame: 0, value: start },
                { frame: 12, value: start + Math.PI / 2 },
                { frame: 24, value: end },
            ]);

            mesh.animations = [anim];
            await this.beginAnimationAsync(mesh, 0, 24);
        }

        async animatePosition(cellId, defenseAfter) {
            const mesh = this.cardMeshes.get(cellId);
            if (!mesh) return;

            const isTop = cellId.startsWith("a") || cellId.startsWith("b");
            const end = defenseAfter ? (isTop ? Math.PI / 2 : -Math.PI / 2) : 0;

            const anim = new BABYLON.Animation(
                `pos-${cellId}`,
                "rotation.z",
                60,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );

            anim.setKeys([
                { frame: 0, value: mesh.rotation.z },
                { frame: 16, value: end },
            ]);

            mesh.animations = [anim];
            await this.beginAnimationAsync(mesh, 0, 16);
        }

        setPerspective(playerIndex) {
            this.currentPerspective = Number(playerIndex) || 0;
            this.camera.alpha = this.currentPerspective === 0 ? -Math.PI / 2 : Math.PI / 2;
            this.camera.beta = 1.08;
            this.camera.radius = 16.9;
        }

        beginAnimationAsync(target, from, to) {
            return new Promise((resolve) => {
                this.scene.beginAnimation(target, from, to, false, 1, resolve);
            });
        }
    }

    globalScope.BabylonBoardRenderer = BabylonBoardRenderer;
})(window);
