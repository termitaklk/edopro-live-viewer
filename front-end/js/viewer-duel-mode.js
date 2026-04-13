(function initViewerDuelMode(globalScope) {
    'use strict';

    function applyModeVisibility(context) {
        if (!context) return false;
        const {
            viewerRoot,
            waitingLobby,
            cardPanel,
            duelWindow,
            duelBoard,
            lpContainer,
            buttonContainer,
            phaseBar,
            player1Container,
            player2Container,
            duelStarted,
            onModeChanged,
        } = context;

        if (!viewerRoot) {
            return false;
        }

        const wasWaitingMode = viewerRoot.classList.contains('waiting-mode');
        viewerRoot.classList.toggle('waiting-mode', !duelStarted);
        const isWaitingMode = viewerRoot.classList.contains('waiting-mode');

        if (waitingLobby) waitingLobby.classList.toggle('hidden', duelStarted);
        if (cardPanel) cardPanel.classList.toggle('hidden', !duelStarted);
        if (duelWindow) duelWindow.classList.toggle('hidden', !duelStarted);
        if (duelBoard) duelBoard.classList.add('hidden');
        const babylonCanvas = document.getElementById('babylonBoardCanvas');
        if (babylonCanvas) {
            babylonCanvas.classList.toggle('hidden', !duelStarted);
            if (duelStarted) {
                requestAnimationFrame(() => {
                    if (globalScope.babylonRenderer?.engine) {
                        globalScope.babylonRenderer.engine.resize();
                    }
                });
            }
        }
        if (lpContainer) lpContainer.classList.toggle('hidden', !duelStarted);
        if (buttonContainer) buttonContainer.classList.add('hidden');
        if (phaseBar) phaseBar.classList.toggle('hidden', !duelStarted);
        if (player1Container) player1Container.classList.toggle('hidden', !duelStarted);
        if (player2Container) player2Container.classList.toggle('hidden', !duelStarted);

        if (wasWaitingMode !== isWaitingMode && typeof onModeChanged === 'function') {
            onModeChanged({ wasWaitingMode, isWaitingMode, duelStarted });
        }

        return isWaitingMode;
    }

    globalScope.ViewerDuelMode = {
        applyModeVisibility,
    };
})(window);

