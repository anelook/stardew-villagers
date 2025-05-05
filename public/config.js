// public/config.js
const CONFIG = {
    // Movement & Animation Constants
    VILLAGER_SPEED: 25,             // pixels per second
    INITIAL_PAUSE_PROBABILITY: 0.2,   // 50% chance to start paused
    INITIAL_PAUSED_MAX_DURATION: 2000, // milliseconds for initial pause

    MOVING_MIN_DURATION: 1000,      // min moving duration in ms
    MOVING_MAX_DURATION: 13000,      // max moving duration in ms
    PAUSED_MIN_DURATION: 2000,      // min paused duration in ms
    PAUSED_MAX_DURATION: 7000,      // max paused duration in ms

    FRAME_INTERVAL: 250,            // ms per walking frame
    SPRITE_FRAME_WIDTH: 16,         // sprite frame width in pixels
    SPRITE_FRAME_HEIGHT: 32,        // sprite frame height in pixels
    DIRECTIONS: 4,                  // 0: down, 1: right, 2: up, 3: left

    // Forbidden (No-Go) Zones defined in the original map coordinate system.
    NO_GO_ZONES: [
        [
            {x: 520, y: 0},
            {x: 765, y: 0},
            {x: 765, y: 135},
            {x: 520, y: 135}
        ],

        [
            {x: 810, y: 0},
            {x: 1065, y: 0},
            {x: 1065, y: 80},
            {x: 810, y: 80}
        ],
        [
            {x: 1120, y: 0},
            {x: 1700, y: 0},
            {x: 1700, y: 800},
            {x: 1120, y: 800}
        ],

        // Blue-roof house (top-right, next to river)
        [
            {x: 855, y: 120},
            {x: 1060, y: 120},
            {x: 1060, y: 250},
            {x: 855, y: 250}
        ],

        // Saloon (center-right, wooden sign “SALOO” visible)
        [
            {x: 610, y: 240},
            {x: 757, y: 240},
            {x: 757, y: 390},
            {x: 610, y: 390}
        ],

        // House with driveway and car (bottom-right)
        [
            {x: 880, y: 435},
            {x: 1100, y: 435},
            {x: 1100, y: 650},
            {x: 880, y: 650}
        ],
        // Purple-roof house (bottom-left)
        [
            {x: 100, y: 480},
            {x: 250, y: 480},
            {x: 250, y: 620},
            {x: 100, y: 620}
        ],

        // systers house (bottom-left)
        [
            {x: 305, y: 530},
            {x: 440, y: 530},
            {x: 440, y: 660},
            {x: 305, y: 660}
        ],

        [
            {x: 515, y: 580},
            {x: 850, y: 580},
            {x: 850, y: 760},
            {x: 515, y: 760}
        ],
        [
            {x: 0, y: 0},
            {x: 200, y: 0},
            {x: 200, y: 100},
            {x: 0, y: 100}
        ],
        [
            {x: 200, y: 0},
            {x: 310, y: 0},
            {x: 310, y: 50},
            {x: 200, y: 50}
        ],
        [{x: 250, y: 310},
            {x: 350, y: 310},
            {x: 350, y: 415},
            {x: 250, y: 415}],


        // Tree in bottom-left corner
        [{x: 0, y: 300}, {x: 105, y: 300}, {x: 105, y: 695}, {x: 0, y: 695}],

        // bench area
        [{x: 615, y: 430},
            {x: 790, y: 430},
            {x: 790, y: 500},
            {x: 615, y: 500}],
        // Fenced animal area to the right of the saloon
        [{x: 820, y: 290},
            {x: 890, y: 290},
            {x: 890, y: 375},
            {x: 820, y: 375}]
    ]
    // You can add more no-go zones (polygons) here.

};

window.CONFIG = CONFIG;
