(function initBoardEngine(globalScope) {
    'use strict';

    const BABYLON = globalScope.BABYLON;
    if (!BABYLON) {
        return;
    }

    const LOCATION = {
        DECK: 0x01,
        HAND: 0x02,
        MZONE: 0x04,
        SZONE: 0x08,
        GRAVE: 0x10,
        REMOVED: 0x20,
        EXTRA: 0x40,
        OVERLAY: 0x80,
    };

    const POSITION = {
        FACEUP_ATTACK: 0x01,
        FACEDOWN_ATTACK: 0x02,
        FACEUP_DEFENSE: 0x04,
        FACEDOWN_DEFENSE: 0x08,
    };

    function getZoneName(location) {
        switch (location) {
            case LOCATION.DECK: return 'deck';
            case LOCATION.HAND: return 'hand';
            case LOCATION.MZONE: return 'mzone';
            case LOCATION.SZONE: return 'szone';
            case LOCATION.GRAVE: return 'grave';
            case LOCATION.REMOVED: return 'removed';
            case LOCATION.EXTRA: return 'extra';
            case LOCATION.OVERLAY: return 'overlay';
            default: return 'unknown';
        }
    }

    function createZones() {
        return {
            deck: [],
            hand: [],
            mzone: Array.from({ length: 7 }, function() { return null; }),
            szone: Array.from({ length: 8 }, function() { return null; }),
            grave: [],
            removed: [],
            extra: [],
            overlay: [],
        };
    }

    function cloneCard(card) {
        return card ? { ...card } : card;
    }

    function cloneZonesShallow(zones) {
        return {
            deck: zones.deck.map(cloneCard),
            hand: zones.hand.map(cloneCard),
            mzone: zones.mzone.map(cloneCard),
            szone: zones.szone.map(cloneCard),
            grave: zones.grave.map(cloneCard),
            removed: zones.removed.map(cloneCard),
            extra: zones.extra.map(cloneCard),
            overlay: zones.overlay.map(cloneCard),
        };
    }

    function safeId() {
        try {
            if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
                return crypto.randomUUID();
            }
        } catch (_) {}
        return String(Date.now()) + '-' + Math.random().toString(16).slice(2);
    }

    class BoardStateStore {
        constructor(options) {
            this.options = options || {};
            this.shouldRenderLocation = typeof this.options.shouldRenderLocation === 'function'
                ? this.options.shouldRenderLocation
                : function(location) { return Number(location) !== LOCATION.HAND; };
            this.state = this.createInitialState();
        }

        applyEvent(event) {
            const effects = [];
            if (!event || !event.type) {
                return effects;
            }

            switch (event.type) {
                case 'CATCHUP':
                    this.state.catchingUp = !!event.active;
                    break;
                case 'WATCH_CHANGE':
                    this.state.watchCount = Number(event.count) || 0;
                    break;
                case 'MSG_START':
                    this.reset(event.lp);
                    this.seedHiddenStack(0, LOCATION.DECK, event.deckP0);
                    this.seedHiddenStack(0, LOCATION.EXTRA, event.extraP0);
                    this.seedHiddenStack(1, LOCATION.DECK, event.deckP1);
                    this.seedHiddenStack(1, LOCATION.EXTRA, event.extraP1);
                    effects.push({ type: 'lp', lp: this.state.lp.slice() });
                    effects.push({ type: 'full_render' });
                    break;
                case 'MSG_NEW_TURN':
                    this.state.turnPlayer = event.player;
                    break;
                case 'MSG_NEW_PHASE':
                    this.state.phase = event.phase;
                    break;
                case 'MSG_MOVE': {
                    const moveEffect = this.moveCard(event);
                    if (moveEffect) effects.push(moveEffect);
                    break;
                }
                case 'MSG_POS_CHANGE': {
                    const posEffect = this.updateCardPosition(event);
                    if (posEffect) effects.push(posEffect);
                    break;
                }
                case 'MSG_UPDATE_DATA':
                    effects.push({
                        type: 'debug',
                        payload: {
                            type: 'BOARD_UPDATE_ZONE_TODO',
                            player: event.player,
                            location: event.location,
                            queryBufferLength: event.queryBuffer && event.queryBuffer.length || 0,
                        },
                    });
                    break;
                case 'MSG_UPDATE_CARD':
                    effects.push({
                        type: 'debug',
                        payload: {
                            type: 'BOARD_UPDATE_CARD_TODO',
                            controller: event.controller,
                            location: event.location,
                            sequence: event.sequence,
                            queryBufferLength: event.queryBuffer && event.queryBuffer.length || 0,
                        },
                    });
                    break;
                case 'MSG_DAMAGE':
                    this.state.lp[event.player] = Math.max(0, this.state.lp[event.player] - event.amount);
                    effects.push({ type: 'lp', lp: this.state.lp.slice() });
                    break;
                case 'MSG_PAY_LPCOST':
                    this.state.lp[event.player] = Math.max(0, this.state.lp[event.player] - event.cost);
                    effects.push({ type: 'lp', lp: this.state.lp.slice() });
                    break;
                case 'MSG_RECOVER':
                    this.state.lp[event.player] += event.amount;
                    effects.push({ type: 'lp', lp: this.state.lp.slice() });
                    break;
                case 'MSG_LPUPDATE':
                    this.state.lp[event.player] = event.lp;
                    effects.push({ type: 'lp', lp: this.state.lp.slice() });
                    break;
                case 'MSG_SET': {
                    const card = this.resolveEffectTargetCard(event);
                    if (card) effects.push({ type: 'pulse', cardId: card.id, scale: 1.08 });
                    break;
                }
                case 'MSG_SUMMONING':
                case 'MSG_SPSUMMONING':
                case 'MSG_FLIPSUMMONING': {
                    const card = this.resolveEffectTargetCard(event);
                    if (card) effects.push({ type: 'pulse', cardId: card.id, scale: 1.15 });
                    break;
                }
                default:
                    break;
            }

            return effects;
        }

        reloadFromSnapshot(snapshot) {
            if (!snapshot || typeof snapshot !== 'object') {
                return [{ type: 'debug', payload: { type: 'BOARD_RELOAD_SNAPSHOT_INVALID' } }];
            }

            this.reset(Number(snapshot.playerLp && snapshot.playerLp[0]) || 8000);
            this.state.lp = [
                Number(snapshot.playerLp && snapshot.playerLp[0]) || 8000,
                Number(snapshot.playerLp && snapshot.playerLp[1]) || 8000,
            ];
            this.state.turnPlayer = snapshot.turnPlayer ?? null;
            this.state.phase = snapshot.phase ?? null;
            this.state.watchCount = Number(snapshot.spectators || 0);

            const deckCounts = snapshot.pileCounts && snapshot.pileCounts.deck || {};
            this.seedHiddenStack(0, LOCATION.DECK, Math.max(0, Number(deckCounts[0] || 0)));
            this.seedHiddenStack(1, LOCATION.DECK, Math.max(0, Number(deckCounts[1] || 0)));

            this.seedZoneFromList(0, LOCATION.HAND, snapshot.hands && snapshot.hands[0], true);
            this.seedZoneFromList(1, LOCATION.HAND, snapshot.hands && snapshot.hands[1], true);
            this.seedZoneFromList(0, LOCATION.GRAVE, snapshot.graves && snapshot.graves[0], false);
            this.seedZoneFromList(1, LOCATION.GRAVE, snapshot.graves && snapshot.graves[1], false);
            this.seedZoneFromList(0, LOCATION.REMOVED, snapshot.banished && snapshot.banished[0], false);
            this.seedZoneFromList(1, LOCATION.REMOVED, snapshot.banished && snapshot.banished[1], false);

            const field = snapshot.field || {};
            Object.keys(field).forEach((fieldKey) => {
                const fieldCard = field[fieldKey];
                if (fieldCard) {
                    this.seedSingleCard(fieldCard);
                }
            });

            return [
                { type: 'lp', lp: this.state.lp.slice() },
                { type: 'full_render' },
            ];
        }

        snapshot() {
            return {
                players: [
                    cloneZonesShallow(this.state.players[0]),
                    cloneZonesShallow(this.state.players[1]),
                ],
                lp: [this.state.lp[0], this.state.lp[1]],
                turnPlayer: this.state.turnPlayer,
                phase: this.state.phase,
                watchCount: this.state.watchCount,
                catchingUp: this.state.catchingUp,
            };
        }

        getAllRenderableCards() {
            return this.state.players.reduce(function(acc, player) {
                return acc.concat(
                    player.deck,
                    player.hand,
                    player.mzone.filter(Boolean),
                    player.szone.filter(Boolean),
                    player.grave,
                    player.removed,
                    player.extra,
                    player.overlay
                );
            }, []);
        }

        createInitialState(lp) {
            return {
                players: [createZones(), createZones()],
                lp: [lp || 8000, lp || 8000],
                turnPlayer: null,
                phase: null,
                watchCount: 0,
                catchingUp: false,
            };
        }

        reset(lp) {
            this.state = this.createInitialState(lp || 8000);
        }

        createStateCard(input) {
            return {
                id: 'card-' + safeId(),
                code: input.code,
                controller: input.controller,
                location: input.location,
                sequence: input.sequence,
                position: input.position,
                visible: !!input.visible && input.code !== null,
            };
        }

        seedHiddenStack(controller, location, count) {
            if (!this.shouldRenderLocation(location)) return;
            for (let sequence = 0; sequence < count; sequence += 1) {
                const card = this.createStateCard({
                    code: null,
                    controller,
                    location,
                    sequence,
                    position: null,
                    visible: false,
                });
                this.insertCard(card, { controller, location, sequence, position: 0 });
            }
        }

        seedZoneFromList(controller, location, list, hiddenByDefault) {
            if (!this.shouldRenderLocation(location) || !Array.isArray(list)) {
                return;
            }
            for (let i = 0; i < list.length; i += 1) {
                this.seedSingleCard({
                    code: list[i] && list[i].code !== undefined ? list[i].code : null,
                    controller,
                    location,
                    sequence: list[i] && list[i].sequence !== undefined ? list[i].sequence : i,
                    position: list[i] && list[i].position !== undefined ? list[i].position : null,
                    hiddenByDefault,
                });
            }
        }

        seedSingleCard(raw) {
            if (!raw || raw.controller === undefined || raw.location === undefined || raw.sequence === undefined) {
                return;
            }
            if (!this.shouldRenderLocation(raw.location)) {
                return;
            }
            const code = raw.code !== undefined ? raw.code : null;
            const position = raw.position !== undefined ? raw.position : null;
            const card = this.createStateCard({
                code: code || null,
                controller: raw.controller,
                location: raw.location,
                sequence: raw.sequence,
                position,
                visible: !raw.hiddenByDefault && code !== null && code !== 0,
            });
            this.insertCard(card, {
                controller: raw.controller,
                location: raw.location,
                sequence: raw.sequence,
                position: position || 0,
            });
        }

        moveCard(event) {
            if (!event || !event.from || !event.to) {
                return null;
            }
            if (!this.shouldRenderLocation(event.from.location) && !this.shouldRenderLocation(event.to.location)) {
                return null;
            }

            let card = this.findCard(event.from);
            if (!card) {
                if (!this.shouldRenderLocation(event.to.location)) {
                    return null;
                }
                card = this.createStateCard({
                    code: event.code || null,
                    controller: event.to.controller,
                    location: event.to.location,
                    sequence: event.to.sequence,
                    position: event.to.position,
                    visible: event.code !== 0,
                });
            } else {
                this.removeCard(event.from);
                card.code = event.code || null;
                card.visible = event.code !== 0;
                card.controller = event.to.controller;
                card.location = event.to.location;
                card.sequence = event.to.sequence;
                card.position = event.to.position;
            }

            this.insertCard(card, event.to);
            return {
                type: 'move',
                cardId: card.id,
                controller: card.controller,
                location: card.location,
                sequence: card.sequence,
            };
        }

        updateCardPosition(event) {
            if (!event || !this.shouldRenderLocation(event.location)) {
                return null;
            }
            const card = this.findCard({
                controller: event.controller,
                location: event.location,
                sequence: event.sequence,
            });
            if (!card) {
                return null;
            }
            card.position = event.currentPosition;
            if (event.code !== 0) {
                card.code = event.code;
                card.visible = true;
            }
            return { type: 'card_changed', cardId: card.id };
        }

        resolveEffectTargetCard(event) {
            const loc = this.resolveEventCardLocation(event);
            return loc ? this.findCard(loc) : null;
        }

        resolveEventCardLocation(event) {
            if (!event || typeof event !== 'object') {
                return null;
            }
            if (event.card && event.card.controller !== undefined && event.card.location !== undefined && event.card.sequence !== undefined) {
                return event.card;
            }
            if (event.to && event.to.controller !== undefined && event.to.location !== undefined && event.to.sequence !== undefined) {
                return event.to;
            }
            if (event.controller !== undefined && event.location !== undefined && event.sequence !== undefined) {
                return {
                    controller: event.controller,
                    location: event.location,
                    sequence: event.sequence,
                    position: event.position !== undefined ? event.position : (event.currentPosition !== undefined ? event.currentPosition : 0),
                };
            }
            return null;
        }

        findCard(loc) {
            if (!loc || loc.controller === undefined || loc.location === undefined || loc.sequence === undefined) {
                return null;
            }
            if (!this.shouldRenderLocation(loc.location)) {
                return null;
            }
            const zone = this.getZone(loc.controller, loc.location);
            if (!zone) return null;

            if (loc.location === LOCATION.MZONE || loc.location === LOCATION.SZONE) {
                return zone[loc.sequence] || null;
            }

            for (let i = 0; i < zone.length; i += 1) {
                if (zone[i].sequence === loc.sequence) return zone[i];
            }
            return null;
        }

        removeCard(loc) {
            if (!loc || loc.controller === undefined || loc.location === undefined || loc.sequence === undefined) {
                return null;
            }
            if (!this.shouldRenderLocation(loc.location)) {
                return null;
            }
            const zone = this.getZone(loc.controller, loc.location);
            if (!zone) return null;

            if (loc.location === LOCATION.MZONE || loc.location === LOCATION.SZONE) {
                const zoneCard = zone[loc.sequence] || null;
                zone[loc.sequence] = null;
                return zoneCard;
            }

            for (let i = 0; i < zone.length; i += 1) {
                if (zone[i].sequence === loc.sequence) {
                    const removed = zone.splice(i, 1)[0] || null;
                    this.resequence(zone);
                    return removed;
                }
            }
            return null;
        }

        insertCard(card, loc) {
            if (!loc || loc.controller === undefined || loc.location === undefined || loc.sequence === undefined) {
                return;
            }
            if (!this.shouldRenderLocation(loc.location)) {
                return;
            }
            const zone = this.getZone(loc.controller, loc.location);
            if (!zone) return;

            card.controller = loc.controller;
            card.location = loc.location;
            card.sequence = loc.sequence;
            card.position = loc.position;

            if (loc.location === LOCATION.MZONE || loc.location === LOCATION.SZONE) {
                zone[loc.sequence] = card;
                return;
            }

            for (let i = 0; i < zone.length; i += 1) {
                if (zone[i].id === card.id) {
                    zone.splice(i, 1);
                    break;
                }
            }

            if (loc.sequence >= 0 && loc.sequence <= zone.length) {
                zone.splice(loc.sequence, 0, card);
            } else {
                zone.push(card);
            }

            this.resequence(zone);
        }

        getZone(controller, location) {
            if (!this.shouldRenderLocation(location)) {
                return null;
            }
            const player = this.state.players[controller];
            if (!player) return null;
            const name = getZoneName(location);
            if (name === 'unknown') return null;
            return player[name];
        }

        resequence(list) {
            for (let i = 0; i < list.length; i += 1) {
                list[i].sequence = i;
            }
        }
    }

    class BoardEngine {
        constructor(options) {
            this.options = options || {};
            this.scene = this.options.scene;
            this.cardImageBaseUrl = this.options.cardImageBaseUrl || '/cards';
            this.cardBackUrl = this.options.cardBackUrl || '/cards/back.jpg';
            this.getCardImageUrl = typeof this.options.getCardImageUrl === 'function'
                ? this.options.getCardImageUrl
                : function(code) { return this.cardImageBaseUrl + '/' + code + '.jpg'; }.bind(this);
            this.cardWidth = this.options.cardWidth || 0.8;
            this.cardHeight = this.options.cardHeight || 1.15;
            this.cardY = this.options.cardY || 0.05;
            this.frontMaterials = new Map();
            this.backMaterial = null;
            this.meshesByCardId = new Map();
            this.store = new BoardStateStore({
                shouldRenderLocation: this.options.shouldRenderLocation,
            });
        }

        applyEvent(event) {
            this.options.onDebugEvent && this.options.onDebugEvent({ type: 'BOARD_LOGIC_EVENT', event: event });
            this.consumeEffects(this.store.applyEvent(event));
        }

        reloadFromSnapshot(snapshot) {
            this.consumeEffects(this.store.reloadFromSnapshot(snapshot));
        }

        render() {
            const cards = this.store.getAllRenderableCards();
            const activeIds = new Set();

            for (let i = 0; i < cards.length; i += 1) {
                const card = cards[i];
                const mesh = this.ensureMesh(card);
                activeIds.add(card.id);
                mesh.position.copyFrom(this.getWorldPosition(card.controller, card.location, card.sequence));
                this.applyCardOrientation(mesh, card);
                this.applyCardVisual(mesh, card);
                mesh.setEnabled(true);
            }

            for (const [cardId, mesh] of this.meshesByCardId.entries()) {
                if (!activeIds.has(cardId)) {
                    mesh.dispose(false, true);
                    this.meshesByCardId.delete(cardId);
                }
            }
        }

        snapshot() {
            return this.store.snapshot();
        }

        consumeEffects(effects) {
            if (!Array.isArray(effects)) {
                return;
            }
            for (let i = 0; i < effects.length; i += 1) {
                this.applyRenderEffect(effects[i]);
            }
        }

        applyRenderEffect(effect) {
            if (!effect || !effect.type) {
                return;
            }

            if (effect.type === 'debug') {
                this.options.onDebugEvent && this.options.onDebugEvent(effect.payload);
                return;
            }

            if (effect.type === 'lp') {
                this.options.onLifePointsChange && this.options.onLifePointsChange(effect.lp);
                return;
            }

            if (effect.type === 'move') {
                const card = this.findCardById(effect.cardId);
                if (!card) return;
                const mesh = this.ensureMesh(card);
                this.applyCardVisual(mesh, card);
                this.applyCardOrientation(mesh, card);
                this.animateMeshTo(mesh, this.getWorldPosition(card.controller, card.location, card.sequence));
                return;
            }

            if (effect.type === 'card_changed') {
                const card = this.findCardById(effect.cardId);
                if (!card) return;
                const mesh = this.ensureMesh(card);
                this.applyCardVisual(mesh, card);
                this.applyCardOrientation(mesh, card);
                return;
            }

            if (effect.type === 'pulse') {
                const mesh = this.meshesByCardId.get(effect.cardId);
                if (mesh) {
                    this.pulse(mesh, effect.scale || 1.1);
                }
                return;
            }

            if (effect.type === 'full_render') {
                this.render();
            }
        }

        findCardById(cardId) {
            const cards = this.store.getAllRenderableCards();
            for (let i = 0; i < cards.length; i += 1) {
                if (cards[i].id === cardId) return cards[i];
            }
            return null;
        }

        ensureMesh(card) {
            let mesh = this.meshesByCardId.get(card.id);
            if (!mesh) {
                mesh = BABYLON.MeshBuilder.CreatePlane(card.id, {
                    width: this.cardWidth,
                    height: this.cardHeight,
                }, this.scene);
                this.meshesByCardId.set(card.id, mesh);
            }
            return mesh;
        }

        getWorldPosition(controller, location, sequence) {
            if (typeof this.options.getZoneWorldPosition === 'function') {
                return this.options.getZoneWorldPosition(controller, location, sequence);
            }

            const side = controller === 0 ? 1 : -1;
            switch (location) {
                case LOCATION.MZONE:
                    return new BABYLON.Vector3((sequence - 2) * 1.4, this.cardY, side * 2);
                case LOCATION.SZONE:
                    return new BABYLON.Vector3((sequence - 2) * 1.4, this.cardY, side * 3.4);
                case LOCATION.GRAVE:
                    return new BABYLON.Vector3(4.5, this.cardY, side * 3.4);
                case LOCATION.DECK:
                    return new BABYLON.Vector3(-4.5, this.cardY, side * 3.4);
                case LOCATION.EXTRA:
                    return new BABYLON.Vector3(-5.8, this.cardY, side * 2);
                case LOCATION.REMOVED:
                    return new BABYLON.Vector3(5.8, this.cardY, side * 2);
                case LOCATION.HAND:
                    return new BABYLON.Vector3((sequence - 3) * 0.8, this.cardY, side * 5);
                case LOCATION.OVERLAY:
                    return new BABYLON.Vector3((sequence - 2) * 1.4, this.cardY + 0.03, side * 2);
                default:
                    return new BABYLON.Vector3(0, this.cardY, 0);
            }
        }

        animateMeshTo(mesh, target) {
            BABYLON.Animation.CreateAndStartAnimation(
                'move-card',
                mesh,
                'position',
                60,
                20,
                mesh.position.clone(),
                target,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
        }

        pulse(mesh, scale) {
            const from = mesh.scaling.clone();
            const to = from.scale(scale || 1.1);
            BABYLON.Animation.CreateAndStartAnimation(
                'pulse-card-up',
                mesh,
                'scaling',
                60,
                8,
                from,
                to,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
                undefined,
                function() {
                    BABYLON.Animation.CreateAndStartAnimation(
                        'pulse-card-down',
                        mesh,
                        'scaling',
                        60,
                        8,
                        to,
                        from,
                        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
                    );
                }
            );
        }

        applyCardOrientation(mesh, card) {
            mesh.rotation.x = Math.PI / 2;
            mesh.rotation.y = card.controller === 1 ? Math.PI : 0;
            switch (card.position) {
                case POSITION.FACEUP_ATTACK:
                case POSITION.FACEDOWN_ATTACK:
                    mesh.rotation.z = 0;
                    break;
                case POSITION.FACEUP_DEFENSE:
                case POSITION.FACEDOWN_DEFENSE:
                    mesh.rotation.z = Math.PI / 2;
                    break;
                default:
                    mesh.rotation.z = 0;
                    break;
            }
        }

        applyCardVisual(mesh, card) {
            if (!card.visible || !card.code) {
                mesh.material = this.getBackMaterial();
                return;
            }
            mesh.material = this.getFrontMaterial(card.code);
        }

        getBackMaterial() {
            if (this.backMaterial) return this.backMaterial;
            const mat = new BABYLON.StandardMaterial('card-back-material', this.scene);
            mat.diffuseTexture = new BABYLON.Texture(this.cardBackUrl, this.scene);
            mat.specularColor = BABYLON.Color3.Black();
            this.backMaterial = mat;
            return mat;
        }

        getFrontMaterial(code) {
            if (this.frontMaterials.has(code)) {
                return this.frontMaterials.get(code);
            }
            const mat = new BABYLON.StandardMaterial('card-front-' + code, this.scene);
            mat.diffuseTexture = new BABYLON.Texture(this.getCardImageUrl(code), this.scene);
            mat.specularColor = BABYLON.Color3.Black();
            this.frontMaterials.set(code, mat);
            return mat;
        }
    }

    globalScope.BoardStateStore = BoardStateStore;
    globalScope.BoardEngine = BoardEngine;
})(window);
