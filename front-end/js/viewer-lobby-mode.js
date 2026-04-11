(function initViewerLobbyMode(globalScope) {
    'use strict';

    function safeValue(value, fallback) {
        if (value === null || value === undefined || value === '') {
            return fallback;
        }
        return value;
    }

    function isTagRoom(room) {
        return Number(room?.team1) === 2 || Number(room?.team2) === 2 || Number(room?.roommode) === 2;
    }

    function renderLobby(context) {
        if (!context) return;
        const {
            state,
            lobbyRoomTitle,
            spectatorMeta,
            roomMeta,
            slots,
            safe = safeValue,
        } = context;
        if (!state || !lobbyRoomTitle || !spectatorMeta || !roomMeta || !Array.isArray(slots)) {
            return;
        }

        const room = state.room || {};
        const players = [...(state.players || [])].sort((a, b) => a.position - b.position);
        const duelTime = room.time_limit ?? room.timeLimit ?? room.time ?? room.timelimit ?? '-';
        lobbyRoomTitle.textContent = `Room #${safe(room.roomid, '?')} ${room.roomname || ''}`.trim();
        spectatorMeta.textContent = `Spectators: ${state.spectators}`;

        roomMeta.innerHTML = `
            <strong>Client:</strong> ${safe(room.roomClient)}<br>
            <strong>Flow:</strong> ${safe(state.clientFlow)}<br>
            <strong>Banlist:</strong> ${safe(room.banlist_hash)}<br>
            <strong>Notes:</strong> ${safe(room.roomnotes)}<br>
            <strong>Duel Mode:</strong> ${safe(room.best_of)}<br>
            <strong>Time Limit:</strong> ${safe(duelTime)}<br>
            <div class="divider"></div>
            <strong>Starting LP:</strong> ${safe(room.start_lp)}<br>
            <strong>Starting Hand:</strong> ${safe(room.start_hand)}<br>
            <strong>Draw Count:</strong> ${safe(room.draw_count)}<br>
            <strong>Rule:</strong> ${safe(room.rule)}<br>
            <strong>Room Mode:</strong> ${safe(room.roommode)}<br>
            <strong>Type Change:</strong> ${safe(state.typeChange)}<br>
            <strong>RPS:</strong> ${state.rps ? `${state.rps.choice1Name} vs ${state.rps.choice2Name} -> ${state.rps.result}` : '-'}
        `;

        const slotCount = isTagRoom(room) ? 4 : 2;
        slots.forEach((slot, index) => {
            if (!slot) return;
            slot.classList.toggle('hidden', index >= slotCount);
            const player = players[index];
            if (player) {
                slot.textContent = `${player.name || `Player ${player.position}`} ${player.status ? `(${player.status})` : ''}`.trim();
                slot.classList.remove('empty');
            } else {
                slot.textContent = index === 0 ? 'Host slot' : 'Waiting for player...';
                slot.classList.add('empty');
            }
        });
    }

    globalScope.ViewerLobbyMode = {
        isTagRoom,
        renderLobby,
    };
})(window);

