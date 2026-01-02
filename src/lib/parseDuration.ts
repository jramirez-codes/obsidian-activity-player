// Parse duration from format: "- [ ] 15s Rest"
export function parseDuration(text: string): number | undefined {
    // Match pattern: optional "- [ ]" followed by number and time unit
    const match = text.match(/(?:-\s*\[\s*\]\s*)?(\d+)\s*([smh])/i);

    if (!match) {
        return undefined;
    }

    // @ts-ignore
    const value = parseInt(match[1], 10);
    // @ts-ignore
    const unit = match[2].toLowerCase();

    // Convert to milliseconds
    switch (unit) {
        case 's':
            return value * 1000;
        case 'm':
            return value * 60 * 1000;
        case 'h':
            return value * 3600 * 1000;
        default:
            return undefined;
    }
}
