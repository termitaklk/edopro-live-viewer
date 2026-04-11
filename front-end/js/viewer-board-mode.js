(function initViewerBoardMode(globalScope) {
    'use strict';

    function renderBoardScene(context) {
        if (!context) return;
        const {
            state,
            getPerspectivePlayer,
            getRenderedPlayerOrder,
            renderHand,
            renderField,
            renderGraves,
            renderDeckCounts,
            updatePhaseButtons,
            updateTopBar,
            updateBoardOrientation,
        } = context;

        if (
            !state ||
            typeof getPerspectivePlayer !== 'function' ||
            typeof getRenderedPlayerOrder !== 'function' ||
            typeof renderHand !== 'function' ||
            typeof renderField !== 'function' ||
            typeof renderGraves !== 'function' ||
            typeof renderDeckCounts !== 'function' ||
            typeof updatePhaseButtons !== 'function' ||
            typeof updateTopBar !== 'function' ||
            typeof updateBoardOrientation !== 'function'
        ) {
            return;
        }

        const { topPlayerIndex, bottomPlayerIndex } = getRenderedPlayerOrder();

        renderHand('player1Row1', state.hands[topPlayerIndex] || [], true);
        renderHand('player2Row1', state.hands[bottomPlayerIndex] || [], false);
        renderField();
        renderGraves();
        renderDeckCounts();
        updatePhaseButtons();
        updateTopBar();
        updateBoardOrientation();
    }

    globalScope.ViewerBoardMode = {
        renderBoardScene,
    };
})(window);
