export interface SeatSides {
    top: number
    right: number
    bottom: number
    left: number
}

export interface SeatPosition {
    seat_index: number
    relative_x: number
    relative_y: number
}

export function distributeSeatsEvenly(total: number, width: number, height: number): SeatSides {
    const perimeter = 2 * (width + height)
    const topCount = Math.max(1, Math.round(total * (width / perimeter)))
    const bottomCount = topCount
    const remaining = Math.max(0, total - topCount - bottomCount)
    const leftCount = Math.floor(remaining / 2)
    const rightCount = remaining - leftCount
    return { top: topCount, right: rightCount, bottom: bottomCount, left: leftCount }
}

export function generateSeatPositions(
    shape: 'round' | 'rectangle' | 'square',
    seatCount: number,
    width: number,
    height: number,
    sides?: SeatSides
): SeatPosition[] {
    if (shape === 'round') {
        const radius = Math.max(width, height) / 2 + 32
        const centerX = width / 2
        const centerY = height / 2
        return Array.from({ length: seatCount }, (_, i) => {
            const angle = (i / seatCount) * 2 * Math.PI - Math.PI / 2
            return {
                seat_index: i,
                relative_x: Math.round(centerX + Math.cos(angle) * radius),
                relative_y: Math.round(centerY + Math.sin(angle) * radius),
            }
        })
    }

    const { top: topCount, right: rightCount, bottom: bottomCount, left: leftCount } =
    sides ?? distributeSeatsEvenly(seatCount, width, height)

    const perimeter: SeatPosition[] = []
    let idx = 0
    const OFFSET = 24

    for (let i = 0; i < topCount; i++) {
        perimeter.push({
            seat_index: idx++,
            relative_x: Math.round(((i + 1) / (topCount + 1)) * width),
            relative_y: -OFFSET,
        })
    }
    for (let i = 0; i < rightCount; i++) {
        perimeter.push({
            seat_index: idx++,
            relative_x: width + OFFSET,
            relative_y: Math.round(((i + 1) / (rightCount + 1)) * height),
        })
    }
    for (let i = 0; i < bottomCount; i++) {
        perimeter.push({
            seat_index: idx++,
            relative_x: Math.round((1 - (i + 1) / (bottomCount + 1)) * width),
            relative_y: height + OFFSET,
        })
    }
    for (let i = 0; i < leftCount; i++) {
        perimeter.push({
            seat_index: idx++,
            relative_x: -OFFSET,
            relative_y: Math.round((1 - (i + 1) / (leftCount + 1)) * height),
        })
    }

    return perimeter
}