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

// import { generateVillagerReply } from "./openaiClient.js";

class Villager {
    constructor(name, imagePath, x, y, metadata = {}) {
        this.name        = name;
        this.img         = new Image();
        this.img.src     = imagePath;
        this.x           = x;
        this.y           = y;
        this.speed       = VILLAGER_SPEED;
        this.frameIndex  = 0;
        this.frameTimer  = 0;
        this.frameInterval = FRAME_INTERVAL;

        this._lastKafkaSend = -Infinity;
        this._kafkaInterval = 1000; // ms

        this.metadata    = metadata;
        this.nextTo      = [];
        
        this.inConversation = false;
        this.inConversationWith = null;
        this.ongoingConversation = [];

        // how many ms to wait between conversations:
        this._conversationCooldown = 10000;//(Math.random() * (40 - 10) + 10) * 1000;
        this.maxMessagesPerConversation = 4;
        // when was the last conversation ended?
        this._lastConversationEnd = null//Date.now(); //prevent conversations during first 30 sec

        this._initMovement();

        // subscribe once to “villagerMessage” topic:
        socket.on('villagerMessage', (msg) => {
            // console.log("villagerMessage", msg);
            this._listen(msg)
        })

    }

    // ——— Public API ———

    /**
     * Call once per tick.
     */


    update(deltaTime, canvasWidth, canvasHeight, context) {
        this._maybeAbortConversation();

        // 1) Have we just exceeded our max‐length conversation?
        if ( this._maybeFinishConversation(deltaTime, canvasWidth, canvasHeight) ) {
            return;
        }

        // 2) If we’re near someone, handle the “conversation” branch
        if ( this._isNearSomeone() ) {
            this._drawVillager(context);

            // if we’re already talking, do nothing else
            if ( this.inConversation ) {
                return;
            }

            if ( this._isInCooldown() ) {
                console.log("cooldown - continue walking")
                this._resumeOrContinueMovement(deltaTime, canvasWidth, canvasHeight, context);
                return;
            } else {


                 if(this._startConversation()) {
                   return
                 }

            }
        }

        // 3) Otherwise, fall back to normal movement+drawing
        console.log("fallback - continue walking")
        this._resumeOrContinueMovement(deltaTime, canvasWidth, canvasHeight, context);
    }

    _maybeAbortConversation() {
        if ( this.inConversation && !this._isNearSomeone() ) {
            console.log("_maybeAbortConversation - abort")
            this.ongoingConversation = [];
            this.inConversationWith = null;
            this.inConversation = false;
            console.log(this.name.toUpperCase() , "in conversation but not near anyone");
        }
    }

    _maybeFinishConversation(dt, w, h) {
        if ( this._isNearSomeone()
            && this.inConversation
            && this.ongoingConversation.length > this.maxMessagesPerConversation )
        {
            console.log(this.name.toUpperCase(), "_maybeFinishConversation - finish, because length: ", this.ongoingConversation.length)
            this._finishConversation();
            this.inConversation = false;
            this.inConversationWith = null;
            this.ongoingConversation = [];
            this._lastConversationEnd = Date.now();
            this._handleResumeMovement();
            this._handleMoving(dt, w, h);
            console.log(this.name.toUpperCase() , "ended conversation after max messages", this._lastConversationEnd );
            return true;
        }
        return false;
    }

    _isInCooldown() {
        return Date.now() - this._lastConversationEnd < this._conversationCooldown;
    }

    _resumeOrContinueMovement(dt, w, h, ctx) {
        if ( this._shouldResumeMovement() ) {
            this._handleResumeMovement();
        }
        if ( this.movementState === 'moving' ) {
            this._handleMoving(dt, w, h);
        } else {
            this._handlePaused(dt);
        }
        this._drawVillagerOnCanvas(ctx);
        this._throttledKafkaEmit();
    }

    _drawVillager(ctx) {
        this._drawVillagerOnCanvas(ctx);
    }


    sendVillagerLocationToKafka() {
        socket.emit('villagerLocationUpdated', {
            name: this.name,
            x: this.x,
            y: this.y
        });
    }


    // Conversations
    _listen({ from, to, message }) {
        // console.log("_listen", from, to, message);
        if (to === this.name) {

            if(this._isInCooldown() || !this.nextTo.find(villager => villager.name === from)) {
                console.log("_listen - stop talking!", this._isInCooldown(), !this.nextTo.find(villager => villager.name === from) );
                return;
                //stop talking
            }

            // console.log("got message from ", from, message);
            this.ongoingConversation.push(`${from} said to me: ${message}`);
            this._reply(from, message);
        }
    }

    _startConversation() {
        // only if another villager is not in conversation
        //if(!this.nextTo[0].inConversation){

        const availablePartner = this.nextTo.find(villager => villager.inConversation === false && villager._isInCooldown() === false);
        const someOneTalksToMe = this.nextTo.find(villager => villager.inConversationWith === this);
        if(availablePartner || someOneTalksToMe) {
            this.inConversationWith = availablePartner || someOneTalksToMe;
        } else {
            console.log(this.name.toUpperCase() , "availablePartner not found");
            return false; // everyone else is busy
        }
        console.log(this.name.toUpperCase() , "has availablePartner - ", this.inConversationWith.name);
        console.log(this.name.toUpperCase() , "start conversation");
        this.inConversation = true;

        if (this.name < this.inConversationWith.name) {
            // give prio by name
            console.log(this.name.toUpperCase() , "Sends first message")
            this._sendFirstPhrase(this.inConversationWith.name, "hi!");
        }

        return true
    }

    _sendFirstPhrase(to) {
        // console.log("_sendFirstPhrase from", this.name)
        // this._drawSpeechBubble(this.context, `Hi, my name is ${this.name}`);
        socket.emit('villagerMessage', {
            from: this.name,
            to,
            message: "Hi!"
        });
        this.ongoingConversation.push(`I said to ${to}: Hi!`);

    }

    _finishConversation() {
        console.log(this.name.toUpperCase() , "_finishConversation");
        // this.
        // send data from this.ongoingConversation to llm for summary
        // get vector data
        // and store response in opensearch
        // await fetch("/api/villager/concludeConversation", {
        // this.inConversation = false;
        // this.ongoingConversation = [];
        // this._handleResumeMovement()

    }

    async _reply(to, heard_message) {
        if(this._isInCooldown() || !this.nextTo.find(villager => villager.name === to)) {
            console.log("_reply - stop talking!", this._isInCooldown(), !this.nextTo.find(villager => villager.name === to) );
            return;
            //stop talking
        }

        const partner = this.nextTo[0];

        if (!partner) {
            console.log("suspicious - no conversation partner ")
            return;
        }

        // fire off to your server
        let reply;
        try {
            const res = await fetch("/api/villager/reply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: this.name,
                    metadata: this.metadata,
                    partnerName: partner.name,
                    partnerMetadata: partner.metadata,
                    history: this.ongoingConversation,
                    heardMessage: heard_message
                })
            });
            const { reply: text } = await res.json();
            reply = text;

        } catch (err) {
            console.error("fetch error", err);
            reply = "Umm… I’m not sure what to say.";
        }

        this.currentMessage = reply;
        this.ongoingConversation.push(`I said to ${to}: ${reply}`);

        setTimeout(() => {
            console.log(this.name.toUpperCase() , 'some seconds later');
            socket.emit('villagerMessage', {
                from: this.name,
                to,
                message: reply
            });
            this.currentMessage = null;
            // …anything you want to do after the pause…
        }, 75 * reply.length + 1000);
    }


    _drawSpeechBubble(context, message) {
        const padding    = 8;               // space between text and box edge
        const lineHeight = 18;              // px between text lines
        const maxWidth   = 150;             // max text width before wrapping
        const charSpeed  = 75;              // ms per character

        // ——— speech-animation state ———
        if (!this._speechAnim || this._speechAnim.fullMessage !== message) {
            // new message: reset animation
            this._speechAnim = {
                fullMessage: message,
                charIndex:   0,
                timer:       0,
                lastTime:    performance.now(),
                interval:    charSpeed
            };
        }
        // advance timer
        const now     = performance.now();
        const elapsed = now - this._speechAnim.lastTime;
        this._speechAnim.lastTime = now;
        this._speechAnim.timer   += elapsed;

        // consume intervals
        while (this._speechAnim.timer >= this._speechAnim.interval) {
            this._speechAnim.timer -= this._speechAnim.interval;
            if (this._speechAnim.charIndex < message.length) {
                this._speechAnim.charIndex++;
            }
        }

        // substring to draw
        const displayText = message.slice(0, this._speechAnim.charIndex);

        // ——— wrap displayText into lines ———
        context.font = `${lineHeight - 4}px Arial`;
        const words       = displayText.split(' ');
        const lines       = [];
        let currentLine   = words[0] || '';

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = context.measureText(currentLine + ' ' + word).width;
            if (width < maxWidth) {
                currentLine += ' ' + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        if (currentLine) lines.push(currentLine);

        // ——— compute box size & position ———
        const textWidths = lines.map(l => context.measureText(l).width);
        const boxWidth   = Math.max(...textWidths, 0) + padding * 2;
        const boxHeight  = lines.length * lineHeight + padding * 2;
        let boxX = this.x + (SPRITE_FRAME_WIDTH - boxWidth) / 2;
        let boxY = this.y - boxHeight - 12;
        boxX = Math.max(4, Math.min(boxX, context.canvas.width - boxWidth - 4));
        boxY = Math.max(4, boxY);

        // ——— draw bubble ———
        context.fillStyle   = 'white';
        context.strokeStyle = 'black';
        context.lineWidth   = 2;
        context.beginPath();
        if (context.roundRect) {
            context.roundRect(boxX, boxY, boxWidth, boxHeight, 6);
        } else {
            context.rect(boxX, boxY, boxWidth, boxHeight);
        }
        context.fill();
        context.stroke();

        // ——— draw tail ———
        const tailX = this.x + SPRITE_FRAME_WIDTH / 2;
        const tailY = this.y;
        context.beginPath();
        context.moveTo(tailX - 6, boxY + boxHeight);
        context.lineTo(tailX + 6, boxY + boxHeight);
        context.lineTo(tailX,     tailY - 2);
        context.closePath();
        context.fill();
        context.stroke();

        // ——— draw text lines ———
        context.fillStyle = 'black';
        lines.forEach((line, i) => {
            const textX = boxX + padding;
            const textY = boxY + padding + (i + 1) * lineHeight - 4;
            context.fillText(line, textX, textY);
        });
    }



    _drawVillagerOnCanvas(context) {
        const row = this.direction;
        const sx = this.frameIndex * SPRITE_FRAME_WIDTH;
        const sy = row * SPRITE_FRAME_HEIGHT;
        context.drawImage(this.img, sx, sy, SPRITE_FRAME_WIDTH, SPRITE_FRAME_HEIGHT, this.x, this.y, SPRITE_FRAME_WIDTH, SPRITE_FRAME_HEIGHT);

        if(this.currentMessage) {
            this._drawSpeechBubble(context, this.currentMessage)
        }
    }

    _initMovement() {
        this.movementState      = 'moving'; // moving | paused | speaking
        this.movementStateTimer = this._randomDuration(MOVING_MIN_DURATION, MOVING_MAX_DURATION);
        this.direction          = this._randomDirection();
    }

    _isNearSomeone() {
        return this.nextTo.length > 0;
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
