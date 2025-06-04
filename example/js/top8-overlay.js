$(function() {
    const jsonPath = 'json/top8.json';

    // Opcional: mapea personaje a imagen (ajusta según tus assets)
    const charImgs = {
        "akatsuki": "img/akatsuki.png",
        // agrega más personajes aquí...
    };

    function getCharImg(personaje, juego) {
        if (!personaje || !juego) return "";
        return `personajes/${juego.toUpperCase()}/${personaje.toLowerCase()}.png`;
    }

    function getTwitter(twitter, nombre) {
        if (twitter && twitter.trim()) return twitter.startsWith('@') ? twitter : '@' + twitter;
        return '@' + (nombre || '').replace(/\s/g, '_');
    }

    function renderTop8(data) {
        $('#top8-title').text(data.evento || 'Top 8');
        $('#top8-footer').text(data.fecha ? `Fecha: ${data.fecha}` : '');

        // Orden de posiciones estándar para Top 8
        const posiciones = [1, 2, 3, 4, 5, 5, 7, 7];
        const top8 = (data.top8 || []).slice(0, 8);

        $('#top8-list').empty();
        top8.forEach((p, i) => {
            const rank = posiciones[i] || (i+1);
            const charImg = getCharImg(p.personaje, p.juego);
            const $slot = $(`
                <div class="top8-slot">
                    <span class="top8-rank">${rank}°</span>
                    <img class="top8-character" src="${charImg}" alt="${p.personaje}">
                    <div class="top8-info">
                        <span class="top8-name">${p.nombre}</span>
                        <span class="top8-twitter">${getTwitter(p.twitter, p.nombre)}</span>
                    </div>
                </div>
            `);
            $('#top8-list').append($slot);
        });

        // Animación de aparición
        gsap.to('.top8-slot', {
            opacity: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.10,
            ease: "power2.out"
        });
    }

    function updateTop8() {
        $.getJSON(jsonPath, function(data) {
            renderTop8(data);
        });
    }

    updateTop8();
    setInterval(updateTop8, 2000);
    window.updateTop8 = updateTop8;
});