$(function() {
    const jsonPath = 'json/bracket.json';
    let lastData = '';

    function cargarEvento(selector, valor) {
        gsap.to(selector, { opacity: 0, duration: 0.3, onComplete: function() {
            $(selector).text(valor);
            gsap.to(selector, { opacity: 1, duration: 0.3 });
        }});
    }

    function crearMatch(match) {
        return $(`
            <div class="match">
                <div class="player-row">
                    <span class="player-name">${match.player1_name || ''}</span>
                    <span class="player-score">${match.player1_sc || '0'}</span>
                </div>
                <div class="player-row">
                    <span class="player-name">${match.player2_name || ''}</span>
                    <span class="player-score">${match.player2_sc || '0'}</span>
                </div>
            </div>
        `);
    }

    function renderBracket(data) {
        if (data.torneo) cargarEvento('#nEvento', data.torneo);

        // Limpia todos los bloques
        $('#winners-semis, #winners-final, #grand-final, #grand-final-reset, #losers-r1, #losers-quarters, #losers-semis, #losers-final').empty();
        // Si existe, elimina el bloque de Grand Final Reset
        $('#grand-final-reset').parent('.bracket-cell').remove();

        // Mapea rounds a divs
        const roundToDiv = {
            "Winners Semis": "#winners-semis",
            "Winners Final": "#winners-final",
            "Grand Final": "#grand-final",
            "Losers Top 8": "#losers-r1",           // <--- CORREGIDO
            "Losers Quarters": "#losers-quarters",
            "Losers Quarter Finals": "#losers-quarters",
            "Losers Semis": "#losers-semis",
            "Losers Semi Final": "#losers-semis",
            "Losers Finals": "#losers-final",
            "Losers Final": "#losers-final"
        };

        // Renderiza los bloques normales
        data.matches.forEach(match => {
            const sel = roundToDiv[match.round_name];
            if (sel) {
                $(sel).append(crearMatch(match));
            }
        });

        // Si hay Grand Final Reset, crea el bloque dinámicamente
        const gfResetMatches = data.matches.filter(m => m.round_name === "Grand Final Reset");
        if (gfResetMatches.length > 0) {
            // Crea el bloque y lo inserta después de Grand Final
            const $cell = $(`
                <div class="bracket-cell" style="grid-column:4;grid-row:1;">
                    <div class="round-title">GRAND FINAL RESET</div>
                    <div id="grand-final-reset"></div>
                </div>
            `);
            $('.bracket-cell[style*="grid-column:3"][style*="grid-row:1"]').after($cell);
            gfResetMatches.forEach(match => {
                $('#grand-final-reset').append(crearMatch(match));
            });
        }

        gsap.to('.match', {
            opacity: 1,
            duration: 0.6,
            stagger: 0.12,
            ease: "power2.out"
        });
    }

    function updateBracket() {
        $.getJSON(jsonPath, function(data) {
            const dataStr = JSON.stringify(data);
            if (dataStr !== lastData) {
                lastData = dataStr;
                renderBracket(data);
            }
        });
    }

    // Llama una vez al cargar
    updateBracket();

    // Y revisa cada 2 segundos si hay cambios
    setInterval(updateBracket, 2000);

    // También puedes exponer updateBracket para llamada manual
    window.updateBracket = updateBracket;
});