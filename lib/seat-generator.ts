interface SeatPosition {
    seat_index: number;
    relative_x: number;
    relative_y: number;
}

export function generateSeatPositions(
    shape: 'round' | 'rectangle' | 'square',
    seatCount: number,
    width: number,
    height: number
): SeatPosition[] {
    if (shape === 'round') {
        const radius = Math.max(width, height) / 2 + 32;
        const centerX = width / 2;
        const centerY = height / 2;
        return Array.from({ length: seatCount }, (_, i) => {
            const angle = (i / seatCount) * 2 * Math.PI - Math.PI / 2;
            return {
                seat_index: i,
                relative_x: Math.round(centerX + Math.cos(angle) * radius),
                relative_y: Math.round(centerY + Math.sin(angle) * radius),
            };
        });
    }

    const perimeter: SeatPosition[] = [];
    const seatGap = 36;

    const topCount = Math.ceil(seatCount * (width / (2 * (width + height))));
    const bottomCount = topCount;
    const sideCount = Math.floor((seatCount - topCount - bottomCount) / 2);
    const leftCount = sideCount;
    const rightCount = seatCount - topCount - bottomCount - leftCount;

    let idx = 0;

    for (let i = 0; i < topCount; i++) {
        perimeter.push({
            seat_index: idx++,
            relative_x: Math.round(((i + 1) / (topCount + 1)) * width),
            relative_y: -24,
        });
    }
    for (let i = 0; i < rightCount; i++) {
        perimeter.push({
            seat_index: idx++,
            relative_x: width + 24,
            relative_y: Math.round(((i + 1) / (rightCount + 1)) * height),
        });
    }
    for (let i = 0; i < bottomCount; i++) {
        perimeter.push({
            seat_index: idx++,
            relative_x: Math.round((1 - (i + 1) / (bottomCount + 1)) * width),
            relative_y: height + 24,
        });
    }
    for (let i = 0; i < leftCount; i++) {
        perimeter.push({
            seat_index: idx++,
            relative_x: -24,
            relative_y: Math.round((1 - (i + 1) / (leftCount + 1)) * height),
        });
    }

    return perimeter;
}