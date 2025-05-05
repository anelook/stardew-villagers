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
        this.name        = name;
        this.img         = new Image();
        this.img.src     = imagePath;
        this.x           = x;
        this.y           = y;
        this.metadata    = metadata;
        this.nextTo      = [];

        this.speed       = VILLAGER_SPEED;
        this.frameIndex  = 0;
        this.frameTimer  = 0;
        this.frameInterval = FRAME_INTERVAL;

        this._lastKafkaSend = -Infinity;
        this._kafkaInterval = 3000; // ms

        this._initMovement();
    }

    // ——— Public API ———

    /**
     * Call once per tick.
     */
    update(deltaTime, canvasWidth, canvasHeight) {
        if (this._isSpeaking()) {
            this._handleSpeaking();
            return;
        }

        if (this._shouldResumeMovement()) {
            this._handleResumeMovement();
        }

        if (this.movementState === 'moving') {
            this._handleMoving(deltaTime, canvasWidth, canvasHeight);
        } else if (this.movementState === 'paused') { // paused
            this._handlePaused(deltaTime);
        }

        this._throttledKafkaEmit();
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


    // ——— Internal Helpers ———

    _initMovement() {
        this.movementState      = 'moving'; // moving | paused | speaking
        this.movementStateTimer = this._randomDuration(MOVING_MIN_DURATION, MOVING_MAX_DURATION);
        this.direction          = this._randomDirection();
    }

    _isSpeaking() {
        return this.nextTo.length > 0;
    }

    _handleSpeaking() {
        if (this.movementState !== 'speaking') {
            // initiate speaking
            console.log(`${this.name} → starts speaking to ${this.nextTo[0].name}`);
            this.movementState = 'speaking';
            this._resetAnimation();
        }
        // TODO: add talking animation here
    }

    _shouldResumeMovement() {
        return this.movementState === 'speaking' && this.nextTo.length === 0;
    }

    _handleResumeMovement() {
        // console.log(`${this.name} speaking → moving`);
        this.movementState = 'moving';
        this.movementStateTimer = this._randomDuration(MOVING_MIN_DURATION, MOVING_MAX_DURATION);
        this.direction = this._randomDirection();
        this._resetAnimation();
    }

    _handleMoving(deltaTime, canvasWidth, canvasHeight) {
        // 1) animation & timer
        this.movementStateTimer -= deltaTime;
        this._updateWalkingAnimation(deltaTime);

        // 2) compute & validate new position
        const { newX, newY } = this._computeNewPosition(deltaTime);
        if (this._isValidMove(newX, newY)) {
            [this.x, this.y] = [newX, newY];
        } else {
            this.direction = this._randomDirection();
        }

        // 3) keep on canvas and bounce off edges
        this._enforceCanvasBounds(canvasWidth, canvasHeight);

        // 4) maybe switch to paused
        if (this.movementStateTimer <= 0) {
            this.movementState = 'paused';
            this.movementStateTimer = this._randomDuration(PAUSED_MIN_DURATION, PAUSED_MAX_DURATION);
            this.frameIndex = 0; // standing frame
        }
    }

    _handlePaused(deltaTime) {
        this.movementStateTimer -= deltaTime;
        this.frameIndex = 0; // standing

        if (this.movementStateTimer <= 0) {
            this.movementState = 'moving';
            this.movementStateTimer = this._randomDuration(MOVING_MIN_DURATION, MOVING_MAX_DURATION);
            this.direction = this._randomDirection();
            this._resetAnimation();
        }
    }

    _throttledKafkaEmit() {
        const now = performance.now();
        if (now - this._lastKafkaSend > this._kafkaInterval) {
            this.sendVillagerLocationToKafka();
            this._lastKafkaSend = now;
        }
    }


    // ——— Utility methods ———

    _randomDuration(min, max) {
        return min + Math.random() * (max - min);
    }

    _randomDirection() {
        return Math.floor(Math.random() * DIRECTIONS);
    }

    _resetAnimation() {
        this.frameTimer = 0;
        this.frameIndex = 0;
    }

    _updateWalkingAnimation(deltaTime) {
        this.frameTimer += deltaTime;
        if (this.frameTimer >= this.frameInterval) {
            this.frameTimer = 0;
            this.frameIndex = (this.frameIndex + 1) % 4;
        }
    }

    _computeNewPosition(deltaTime) {
        const dist = (this.speed * deltaTime) / 1000;
        let newX = this.x, newY = this.y;
        switch (this.direction) {
            case 0: newY += dist; break; // down
            case 1: newX += dist; break; // right
            case 2: newY -= dist; break; // up
            case 3: newX -= dist; break; // left
        }
        return { newX, newY };
    }

    _isValidMove(newX, newY) {
        const mapScale = window.mapScaleFactor,
            mapOffset = window.mapXOffset;
        if (mapScale && mapOffset != null) {
            return Utils.isValidRect(
                newX, newY,
                SPRITE_FRAME_WIDTH, SPRITE_FRAME_HEIGHT,
                mapOffset, mapScale,
                NO_GO_ZONES
            );
        }
        return true;
    }

    _enforceCanvasBounds(canvasWidth, canvasHeight) {
        const maxX = canvasWidth  - SPRITE_FRAME_WIDTH,
            maxY = canvasHeight - SPRITE_FRAME_HEIGHT;

        if (this.x < 0)               { this.x = 0;    this.direction = 1; }
        if (this.y < 0)               { this.y = 0;    this.direction = 0; }
        if (this.x > maxX)            { this.x = maxX; this.direction = 3; }
        if (this.y > maxY)            { this.y = maxY; this.direction = 2; }
    }
}
