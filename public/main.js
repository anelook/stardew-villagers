// public/main.js

window.onload = function () {
    const canvas = document.getElementById('mapCanvas');
    const context = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const mapImage = new Image();
    mapImage.src = '/assets/map.png';
    let mapLoaded = false;

    // Define your basic villager data (name and image path).
    // Later, we’ll load each villager’s narrative metadata from a separate JSON file.
    const villagerData = [
        { name: "Jodi", imagePath: "/assets/villagers/Jodi.png" },
        { name: "Lewis", imagePath: "/assets/villagers/Lewis.png" },
        { name: "Linus", imagePath: "/assets/villagers/Linus.png" },
        { name: "Marnie", imagePath: "/assets/villagers/Marnie.png" },
        { name: "Maru", imagePath: "/assets/villagers/Maru.png" },
        { name: "Pierre", imagePath: "/assets/villagers/Pierre.png" },
        { name: "Robin", imagePath: "/assets/villagers/Robin.png" },
        { name: "Sam", imagePath: "/assets/villagers/Sam.png" },
        { name: "Sebastian", imagePath: "/assets/villagers/Sebastian.png" },
        { name: "Shane", imagePath: "/assets/villagers/Shane.png" },
        { name: "Snail", imagePath: "/assets/villagers/Snail.png" }
    ];

    let villagers = [];

    // Helper to draw forbidden zones as red outlines.
    function drawForbiddenZones(ctx, xOffset, scaleFactor) {
        if (window.CONFIG.NO_GO_ZONES) {
            ctx.save();
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            window.CONFIG.NO_GO_ZONES.forEach(zone => {
                ctx.beginPath();
                zone.forEach((point, index) => {
                    const cx = xOffset + point.x * scaleFactor;
                    const cy = point.y * scaleFactor;
                    if (index === 0) ctx.moveTo(cx, cy);
                    else ctx.lineTo(cx, cy);
                });
                ctx.closePath();
                ctx.stroke();
            });
            ctx.restore();
        }
    }

    // Wait until the map image has loaded.
    mapImage.onload = function () {
        mapLoaded = true;
        // Compute the scaling factor so the map height fills the canvas.
        const scaleFactor = canvas.height / mapImage.height;
        const imageWidth = mapImage.width * scaleFactor;
        const xOffset = (canvas.width - imageWidth) / 2;

        // Save transformation values globally for use in villagers.js.
        window.mapScaleFactor = scaleFactor;
        window.mapXOffset = xOffset;

        // Now load narrative metadata for each villager.
        // We fetch each villager's JSON file, then create a Villager instance with its metadata.
        Promise.all(
            villagerData.map(data =>
                fetch(`/data/villagers/${data.name}.json`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`Could not load metadata for ${data.name}`);
                        }
                        console.log("---- 1")
                        return response.json();
                    })
                    .then(metadata => {
                        console.log("---- 2")
                        // Use the Utils helper function to generate a valid starting position.
                        const pos = window.Utils.generateValidPosition(
                            canvas.width,
                            canvas.height,
                            xOffset,
                            scaleFactor,
                            SPRITE_FRAME_WIDTH,
                            SPRITE_FRAME_HEIGHT,
                            NO_GO_ZONES
                        );
                        // Create a new Villager with its metadata.
                        // Note: The Villager constructor in villagers.js can be adjusted to accept metadata as an optional parameter.
                        return new Villager(data.name, data.imagePath, pos.x, pos.y, metadata);
                    })
                    .catch(error => {
                        console.log("---- 3")
                        console.error(error);
                        // Fallback: create the villager with empty metadata.
                        const pos = window.Utils.generateValidPosition(
                            canvas.width,
                            canvas.height,
                            xOffset,
                            scaleFactor,
                            SPRITE_FRAME_WIDTH,
                            SPRITE_FRAME_HEIGHT,
                            NO_GO_ZONES
                        );
                        return new Villager(data.name, data.imagePath, pos.x, pos.y, {});
                    })
            )
        ).then(loadedVillagers => {
            villagers = loadedVillagers;
            console.log("subscribe to villagersProximityIOEvent");
            socket.on('villagersProximityIOEvent', ({ villager1: name1, villager2: name2, areClose }) => {
                const v1 = villagers.find(v => v.name === name1);
                const v2 = villagers.find(v => v.name === name2);

                if (!v1 || !v2) {
                    console.warn(`Villager not found: ${!v1 ? name1 : name2}`);
                    return;
                }
                // make sure nextTo arrays exist
                v1.nextTo = v1.nextTo || [];
                v2.nextTo = v2.nextTo || [];

                if (areClose) {
                    // only add if not already next to each other
                    if (!v1.nextTo.includes(v2)) v1.nextTo.push(v2);
                    if (!v2.nextTo.includes(v1)) v2.nextTo.push(v1);
                } else {
                    // remove each from the other’s nextTo
                    v1.nextTo = v1.nextTo.filter(v => v !== v2);
                    v2.nextTo = v2.nextTo.filter(v => v !== v1);
                }

            });

            // Start the game loop once all villagers have been created.
            requestAnimationFrame(gameLoop);
        });
    };

    let lastTimestamp = 0;

    function gameLoop(timestamp) {
        const deltaTime = timestamp - lastTimestamp;
        lastTimestamp = timestamp;
        context.clearRect(0, 0, canvas.width, canvas.height);

        if (mapLoaded) {
            const scaleFactor = canvas.height / mapImage.height;
            const imageWidth = mapImage.width * scaleFactor;
            const xOffset = (canvas.width - imageWidth) / 2;
            window.mapScaleFactor = scaleFactor;
            window.mapXOffset = xOffset;

            // Draw the map.
            context.drawImage(mapImage, xOffset, 0, imageWidth, canvas.height);
            // Draw forbidden zones as red outlines.
            drawForbiddenZones(context, xOffset, scaleFactor);


            // ─── INSERTED: draw proximity‐boxes ───
            const rawRadius    = Math.sqrt(1024);           // ≃100.12 world units
            const screenRadius = rawRadius * scaleFactor;     // px on screen
            const side         = screenRadius * 2;

            context.save();
            context.strokeStyle = 'blue';
            context.lineWidth   = 1;
            context.setLineDash([5,5]);

            villagers.forEach(v => {
                // assume v.x/v.y are already in screen coords; if not, convert:
                const sx = v.x;
                const sy = v.y ;

                context.strokeRect(
                    sx - screenRadius,
                    sy - screenRadius,
                    side,
                    side
                );
            });

            context.restore();
            // ────────────────────────────────────────────
        }

        // Update and draw each villager.
        villagers.forEach(villager => {
            villager.update(deltaTime, canvas.width, canvas.height, context);
        });

        requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop);
};
