// public/utils.js

// Classic ray-casting algorithm to check if a point is within a polygon.
function pointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        const intersect = ((yi > point.y) !== (yj > point.y)) &&
            (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// Check that the entire sprite rectangle (its corners plus center) is valid.
function isValidRect(x, y, width, height, xOffset, scaleFactor, noGoZones) {
    const points = [
        { x: x, y: y },
        { x: x + width, y: y },
        { x: x, y: y + height },
        { x: x + width, y: y + height },
        { x: x + width / 2, y: y + height / 2 }
    ];
    for (const pt of points) {
        // Transform the canvas coordinate into the map's coordinate system.
        const mapPt = { x: (pt.x - xOffset) / scaleFactor, y: pt.y / scaleFactor };
        for (const zone of noGoZones) {
            if (pointInPolygon(mapPt, zone)) {
                return false;
            }
        }
    }
    return true;
}

// Generate a valid random position (top-left corner of the sprite)
// that is entirely outside any forbidden zone.
function generateValidPosition(canvasWidth, canvasHeight, xOffset, scaleFactor, spriteWidth, spriteHeight, noGoZones) {
    let attempts = 0;
    const maxAttempts = 1000;
    while (attempts < maxAttempts) {
        const x = Math.random() * (canvasWidth - spriteWidth);
        const y = Math.random() * (canvasHeight - spriteHeight);
        if (isValidRect(x, y, spriteWidth, spriteHeight, xOffset, scaleFactor, noGoZones)) {
            return { x, y };
        }
        attempts++;
    }
    // Fallback: return any random position if a valid one isn’t found.
    return {
        x: Math.random() * (canvasWidth - spriteWidth),
        y: Math.random() * (canvasHeight - spriteHeight)
    };
}

window.Utils = {
    pointInPolygon,
    isValidRect,
    generateValidPosition
};
