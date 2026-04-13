const fs = require('fs');
const path = require('path');
const assert = require('assert');

const viewerPath = path.join(__dirname, '..', 'front-end', 'viewer.html');
const html = fs.readFileSync(viewerPath, 'utf8');

function expect(pattern, message) {
    assert(pattern.test(html), message);
}

function expectNot(pattern, message) {
    assert(!pattern.test(html), message);
}

function run() {
    expect(/SUCCESS REFERENCE \(LP HUD\)/, 'Missing success reference marker for LP HUD.');
    expect(/SUCCESS REFERENCE \(THREE-PANE LAYOUT\)/, 'Missing success reference marker for three-pane layout.');
    expect(/SUCCESS REFERENCE \(EXTERNAL FRAME COMPACT\)/, 'Missing success reference marker for external compact frame.');
    expect(/#viewerStage\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?inset:\s*0;/, 'Missing responsive viewer stage container.');
    expect(/#viewerRoot\s*\{[\s\S]*?width:\s*1360px;[\s\S]*?height:\s*760px;[\s\S]*?scale\(var\(--viewer-scale,\s*1\)\)/, 'Viewer root no longer uses fixed logical size + scalable transform.');
    expect(/#viewerRoot\.waiting-mode\s*\{[\s\S]*?width:\s*1120px;[\s\S]*?height:\s*640px;/, 'Waiting-mode compact frame reference drifted.');
    expect(/const VIEWER_BASE_DUEL_WIDTH = 1360;[\s\S]*?const VIEWER_BASE_DUEL_HEIGHT = 760;[\s\S]*?const VIEWER_BASE_WAITING_WIDTH = 1120;[\s\S]*?const VIEWER_BASE_WAITING_HEIGHT = 640;/, 'Viewer base constants drifted from duel/waiting frame reference.');
    expect(/function\s+fitViewerToViewport\s*\(/, 'Missing fitViewerToViewport responsive scaler.');
    expect(/<script\s+src="\.\.\/?js\/viewer-lobby-mode\.js"><\/script>|<script\s+src="\.\/js\/viewer-lobby-mode\.js"><\/script>/, 'viewer.html must load separated lobby module.');
    expect(/<script\s+src="\.\.\/?js\/viewer-duel-mode\.js"><\/script>|<script\s+src="\.\/js\/viewer-duel-mode\.js"><\/script>/, 'viewer.html must load separated duel-mode module.');
    expect(/<script\s+src="\.\.\/?js\/viewer-board-mode\.js"><\/script>|<script\s+src="\.\/js\/viewer-board-mode\.js"><\/script>/, 'viewer.html must load separated board module.');
    expect(/function\s+resetViewerScrollPositions\s*\(/, 'Missing startup scroll reset helper for viewer.');
    expect(/history\s*&&\s*'scrollRestoration'\s*in\s*history[\s\S]*?history\.scrollRestoration\s*=\s*'manual'/, 'Viewer must disable browser scroll restoration.');
    expect(/window\.addEventListener\('pageshow',\s*resetViewerScrollPositions\)/, 'Viewer must reset scroll on pageshow/bfcache restore.');
    expect(/function\s+applyBoardFitScale\s*\(/, 'Missing board-fit scaler to prevent panel overlap.');
    expect(/#duelBoard\s*\{[\s\S]*?scale\(var\(--board-fit-scale,\s*0\.9\)\)/, 'Duel board must use dynamic fit scale variable.');
    expect(/#viewerLayout\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*240px minmax\(0,\s*1fr\)\s*286px;/, 'Three-pane grid layout drifted.');
    expect(/#viewerRoot\.waiting-mode\s+#viewerLayout\s*\{[\s\S]*?grid-template-columns:\s*minmax\(560px,\s*760px\)\s*300px;/, 'Waiting-mode layout for lobby drifted.');
    expect(/--side-panel-bottom-gap:\s*170px;/, 'Side panel bottom gap variable drifted.');
    expect(/#cardPanel\s*\{[\s\S]*?height:\s*calc\(100%\s*-\s*var\(--side-panel-bottom-gap\)\);/, 'Card panel no longer stops above hand zone.');
    expect(/#livePanel\s*\{[\s\S]*?height:\s*calc\(100%\s*-\s*var\(--side-panel-bottom-gap\)\);/, 'Live panel no longer stops above hand zone.');
    expectNot(/<link[^>]+styles\.css/i, 'viewer.html should not load legacy styles.css.');
    expectNot(/<script[^>]+script\.js/i, 'viewer.html should not load legacy script.js.');
    expect(/#buttonContainer\s*\{[\s\S]*?display:\s*none\s*!important;/, 'Legacy top debug controls must stay hidden.');
    expectNot(/url\('\.\/Tablero\/Tablero1\.png'\)/, 'Legacy board texture should not be used in board-v2 background.');
    expectNot(/buttonContainer\.classList\.toggle\('hidden',\s*!duelStarted\)/, 'buttonContainer should never be toggled visible during duel.');
    expect(/#duelBoard\.board-v2\s*\.board-row-top-monster::before\s*\{[\s\S]*?border:\s*3px solid rgba\(98,\s*118,\s*255,\s*0\.95\);/, 'Top monster lane must keep blue 5-slot frame.');
    expect(/#duelBoard\.board-v2\s*\.board-row-bottom-spell::before\s*\{[\s\S]*?border:\s*3px solid rgba\(255,\s*80,\s*80,\s*0\.95\);/, 'Bottom spell lane must keep red 5-slot frame.');
    expect(/\.lobby-shell\s*\{[\s\S]*?width:\s*min\(760px,\s*calc\(100%\s*-\s*18px\)\);[\s\S]*?max-height:\s*min\(520px,\s*calc\(100%\s*-\s*28px\)\);/, 'Lobby shell must be constrained to center pane for small screens.');
    expect(/@media\s*\(max-width:\s*1240px\)[\s\S]*?\.lobby-grid\s*\{[\s\S]*?grid-template-columns:\s*1fr;/, 'Lobby grid should collapse to one column on narrow screens.');
    expect(/viewerRoot\.classList\.toggle\('waiting-mode',\s*!duelStarted\)/, 'renderState must toggle waiting-mode class for lobby layout.');
    expect(/window\.ViewerLobbyMode\?\.renderLobby/, 'renderState/renderLobby must delegate lobby logic to separated lobby module.');
    expect(/window\.ViewerDuelMode\?\.applyModeVisibility/, 'renderState must delegate mode toggling to separated duel module.');
    expect(/window\.ViewerBoardMode\?\.renderBoardScene/, 'renderState must delegate board rendering to separated board module.');
    expect(/#duelStage\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?padding:\s*0 20px;[\s\S]*?contain:\s*layout paint;/, 'Duel scene must be wrapped in isolated duelStage container.');
    expect(/#liveLog\s*\{[\s\S]*?overflow-wrap:\s*anywhere;[\s\S]*?word-break:\s*break-word;/, 'Live log must wrap long lines to avoid clipping.');

    // Keep LP HUD centered exactly like hand lanes.
    expect(/#lpContainer\s*\{[\s\S]*?left:\s*50%\s*!important;[\s\S]*?transform:\s*translateX\(-50%\)\s*!important;/, 'LP container must be centered with left:50% + translateX(-50%).');
    expect(/#lpContainer\s*\{[\s\S]*?width:\s*700px\s*!important;/, 'LP container width drifted from success reference (700px).');
    expect(/#lpContainer\s*\{[\s\S]*?top:\s*0\s*!important;/, 'LP container top offset drifted from success reference (0).');
    expect(/#lpContainer\s*\{[\s\S]*?z-index:\s*78\s*!important;/, 'LP container z-index drifted from success reference (78).');

    // Grid geometry and scale guard.
    expect(/#lpContainer\s*\{[\s\S]*?grid-template-columns:\s*56px 230px 88px 230px 56px;/, 'LP HUD grid columns changed unexpectedly.');
    expect(/#lpContainer\s*\{[\s\S]*?grid-template-rows:\s*30px 24px;/, 'LP HUD grid rows changed unexpectedly.');
    expect(/#lpContainer\s*#player1score[\s\S]*?font:\s*700 20px\/1/, 'Player1 time font changed unexpectedly.');
    expect(/#lpContainer\s*#player2score[\s\S]*?font:\s*700 20px\/1/, 'Player2 time font changed unexpectedly.');
    expect(/id="lpBarValueLeft"/, 'Missing LP value label inside left LP bar.');
    expect(/id="lpBarValueRight"/, 'Missing LP value label inside right LP bar.');
    expect(/function\s+formatTimeValue\s*\(/, 'Missing formatter for per-player remaining time.');
    expect(/function\s+getRenderedPlayerOrder\s*\(\)\s*\{[\s\S]*?const perspectivePlayer = getPerspectivePlayer\(\);[\s\S]*?const topPlayerIndex = perspectivePlayer;[\s\S]*?const bottomPlayerIndex = perspectivePlayer === 0 \? 1 : 0;/, 'Missing shared rendered player order helper for perspective-aware HUD/hand mapping.');
    expect(/getRenderedPlayerOrder,/, 'Board module must receive the shared rendered player order helper.');
    expect(/payload\.type === 'MSG_NEW_TURN'[\s\S]*?state\.turnCount\s*=\s*nextTurn;[\s\S]*?state\.turnPlayer\s*=\s*getAuthoritativeTurnPlayer\(\);/, 'Turn ownership must be derived from MSG_NEW_TURN state updates.');
    expectNot(/if\s*\(data\.message === 'time_limit'\)[\s\S]*?state\.turnPlayer\s*=/, 'time_limit must not overwrite turn owner.');
    expect(/#lpContainer\s*\.score-1[\s\S]*?font:\s*700 26px\/1/, 'Turn counter font changed unexpectedly.');

    // Prevent previously breaking compaction on medium screens.
    expectNot(/@media\s*\(max-width:\s*1500px\)[\s\S]*?#lpContainer[\s\S]*?width:\s*500px\s*!important;/, 'Found old media-query override that shrinks LP HUD to 500px.');

    // Ensure old JS-based LP centering helper stays removed (it introduced drift).
    expectNot(/function\s+alignLpContainerToBoard\s*\(/, 'Found deprecated JS LP alignment helper.');

    console.log('visor-layout-guard.test.js: OK');
}

run();
