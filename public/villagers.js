
const {
    VILLAGER_SPEED,
    MOVING_MIN_DURATION,
    MOVING_MAX_DURATION,
    PAUSED_MIN_DURATION,
    PAUSED_MAX_DURATION,
    FRAME_INTERVAL,
    SPRITE_FRAME_WIDTH,
    SPRITE_FRAME_HEIGHT,
    DIRECTIONS,
    NO_GO_ZONES
} = window.CONFIG;

class Villager {
    constructor(name, imagePath, x, y, metadata = {}) {
        this.name = name;
        this.img = new Image();
        this.img.src = imagePath;
        this.x = x;
        this.y = y;
        this.metadata = metadata;
        // this.isTaking = false;
        // this.talkingState = {
        //
        // }

        this.speed = VILLAGER_SPEED;

        // set initial random values for movement
        this.movementState = "moving";
        this.movementStateTimer = MOVING_MIN_DURATION + Math.random() * (MOVING_MAX_DURATION - MOVING_MIN_DURATION);
        this.frameIndex = 0;

        // Choose an initial random direction.
        this.direction = Math.floor(Math.random() * DIRECTIONS);

        // Animation timing.
        this.frameInterval = FRAME_INTERVAL;
        this.frameTimer = 0;

        this._lastKafkaSend = -Infinity;
        this._kafkaInterval = 3000; // ms
    }

    getProximityState() {

    }




    setNextMovement(deltaTime, canvasWidth, canvasHeight) {
        // Get the map transformation values computed in main.js.
        const mapScaleFactor = window.mapScaleFactor;
        const mapXOffset = window.mapXOffset;

        if (this.movementState === "moving") {
            this.movementStateTimer -= deltaTime;

            // Update walking animation.
            this.frameTimer += deltaTime;
            if (this.frameTimer >= this.frameInterval) {
                this.frameTimer = 0;
                this.frameIndex = (this.frameIndex + 1) % 4;
            }

            const distance = (this.speed * deltaTime) / 1000;
            let newX = this.x;
            let newY = this.y;
            switch (this.direction) {
                case 0: newY += distance; break; // down
                case 1: newX += distance; break; // right
                case 2: newY -= distance; break; // up
                case 3: newX -= distance; break; // left
            }

            // Validate the entire sprite rectangle using Utils.
            let validMove = true;
            if (mapScaleFactor && (mapXOffset !== undefined)) {
                validMove = Utils.isValidRect(newX, newY, SPRITE_FRAME_WIDTH, SPRITE_FRAME_HEIGHT, mapXOffset, mapScaleFactor, NO_GO_ZONES);
            }

            if (validMove) {
                this.x = newX;
                this.y = newY;
            } else {
                this.direction = Math.floor(Math.random() * DIRECTIONS);
            }

            // Clamp position to the canvas boundaries.
            if (this.x < 0) { this.x = 0; this.direction = 1; }
            if (this.y < 0) { this.y = 0; this.direction = 0; }
            if (this.x > canvasWidth - SPRITE_FRAME_WIDTH) { this.x = canvasWidth - SPRITE_FRAME_WIDTH; this.direction = 3; }
            if (this.y > canvasHeight - SPRITE_FRAME_HEIGHT) { this.y = canvasHeight - SPRITE_FRAME_HEIGHT; this.direction = 2; }

            if (this.movementStateTimer <= 0) {
                this.movementState = "paused";
                this.movementStateTimer = PAUSED_MIN_DURATION + Math.random() * (PAUSED_MAX_DURATION - PAUSED_MIN_DURATION);
                this.frameIndex = 0;
            }
        } else if (this.movementState === "paused") {
            this.movementStateTimer -= deltaTime;
            this.frameIndex = 0;

            if (this.movementStateTimer <= 0) {
                this.movementState = "moving";
                this.movementStateTimer = MOVING_MIN_DURATION + Math.random() * (MOVING_MAX_DURATION - MOVING_MIN_DURATION);
                this.direction = Math.floor(Math.random() * DIRECTIONS);
                this.frameTimer = 0;
            }
        }

        // send only after a delay
        const now = performance.now();
        if (now - this._lastKafkaSend > this._kafkaInterval) {
            this.sendVillagerLocationToKafka();
            this._lastKafkaSend = now;
        }
    }

    sendVillagerLocationToKafka() {
        if (window.socket && this.movementState === 'moving') {
            window.socket.emit('villagerLocationUpdated', {
                name: this.name,
                x: this.x,
                y: this.y
            });
        }
    }
}


// consumer from their topic or a huge single topic (maybe latter)
// to / from / message
// listen() {
// react and maybe response  ---send to OpenAI
// }




// getVillagerPosition() {
//     return {
//         x: this.x,
//         y: this.y,
//         direction: this.direction
//     }
// }
