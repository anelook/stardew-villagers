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
        this.ongoingConversation = [];

        this._initMovement();

        // this.inbox = [];              // all incoming msgs
        // this._conversations = {};     // track state per partner

        // subscribe once to “villagerMessage” topic:
        console.log("subscribe to villagerMessage");
        // window.socket.on('villagerMessage', msg => this._listen(msg));
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
        //able to start or already in an ongoing conversation
        if(this.inConversation && !this._isNearSomeone()) {
            // end conversation
            this.inConversation = false;
        }

        if (this._isNearSomeone() ) {
            //continue drawing the character on map
            this._drawVillagerOnCanvas(context);

            // but stop any movement and focus on speaking
            if(this.inConversation) {
                return;
            }
            this._startConversation();

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
        this._drawVillagerOnCanvas(context);
        this._throttledKafkaEmit();
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
        console.log("_listen", from, to, message);
        if (to === this.name) {
            console.log("got message from ", from, message);
            this.ongoingConversation.push(`${from} said to me: ${message}`);
            this._reply(from, message);
        }
    }

    _startConversation() {
        this.inConversation = true;
        const partner = this.nextTo[0];
        if (!partner) {
            console.log("suspicious - no conversation partner ")
        }

        if (this.name < partner.name) {
            // give prio by name
            this._sendFirstPhrase(partner.name, "hi!");
        }

    }

    _sendFirstPhrase(to) {
        console.log("_sendFirstPhrase from", this.name)
        // this._drawSpeechBubble(this.context, `Hi, my name is ${this.name}`);
        socket.emit('villagerMessage', {
            from: this.name,
            to,
            message: "Hi!"
        });
        this.ongoingConversation.push(`I said to ${to}: Hi!`);

    }

    async _reply(to, heard_message) {
        const partner = this.nextTo[0];
        if (!partner) return;

        // record incoming
        this.ongoingConversation.push(
            `${partner.name} said to me: ${heard_message}`
        );

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
        //
        // // record & emit
        // this.ongoingConversation.push(`${this.name} said to ${to}: ${reply}`);
        // socket.emit("villagerMessage", {
        //     from: this.name,
        //     to,
        //     message: reply
        // });
    }

    // _reply(to, heard_message) {
    //
    //     const otherPerson = this.nextTo[0];
    //     const prompt = `
    //     Your are ${this.name}. You're talking to ${to}.
    //     This is conversation so far: ${this.ongoingConversation.join(" | ")}
    //     Some background about you,${this.name} :  ${this.metadata.background}.
    //     You love: ${this.metadata.loves}.
    //
    //     Now, some background about the person you talk to, ${otherPerson.name},  ${otherPerson.metadata.background}:
    //     `;
    //
    //     console.log("prompt", prompt)
    //
    //     const message = `I heard you said ${heard_message}!`
    //     this.ongoingConversation.push(`I said to ${to}: ${message}`);
    //     this.currentMessage = `Hi, my name is ${this.name}`;
    //     // this._drawSpeechBubble(this.context, this.currentMessage);
    //
    //     // give a bit of time for us to read the message
    //     setTimeout(() => {
    //         console.log('1 second later', this.metadata);
    //         console.log("_reply from", this.name)
    //         socket.emit('villagerMessage', {
    //             from: this.name,
    //             to,
    //             message
    //         });
    //         this.currentMessage = null;
    //         // …anything you want to do after the pause…
    //     }, 2000);
    //
    //
    // }

    // async _reply(to, heard_message) {
    //     const partner = this.nextTo[0];
    //     if (!partner) return;
    //
    //     // record the incoming bit
    //     this.ongoingConversation.push(`${partner.name} said to me: ${heard_message}`);
    //
    //     try {
    //         // get a response from the LLM
    //         const reply = await generateVillagerReply({
    //             name: this.name,
    //             metadata: this.metadata,
    //             partnerName: partner.name,
    //             partnerMetadata: partner.metadata,
    //             history: this.ongoingConversation,
    //             heardMessage: heard_message
    //         });
    //
    //         // record and emit
    //         this.ongoingConversation.push(`I said to ${to}: ${reply}`);
    //         this._drawSpeechBubble(this.context, `Hi, my name is ${this.currentMessage}`);
    //
    //         setTimeout(() => {
    //             console.log('1 second later', this.metadata);
    //             console.log("_reply from", this.name)
    //             socket.emit("villagerMessage", {
    //                 from: this.name,
    //                 to,
    //                 message: reply
    //             });
    //             this.currentMessage = null;
    //             // …anything you want to do after the pause…
    //         }, 2000);
    //
    //
    //
    //     } catch (err) {
    //         console.error("LLM error:", err);
    //         // fallback to a safe default
    //         const fallback = "Sorry, I’m not sure what to say!";
    //         socket.emit("villagerMessage", {
    //             from: this.name,
    //             to,
    //             message: fallback
    //         });
    //     }
    // }



    // ——— Internal Helpers ———

    _drawSpeechBubble(context, message) {
        const padding    = 8;               // space between text and box edge
        const lineHeight = 18;              // px between text lines
        const maxWidth   = 150;             // max text width before wrapping
        const charSpeed  = 50;              // ms per character

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
