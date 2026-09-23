import { useEffect, useState } from "react";

/*
 * Returns `value`, but only after it has stopped changing for
 * `delayMs`. Used to keep a search input feeling instant (it's
 * still a normal controlled input, so every keystroke shows up
 * immediately) while delaying the expensive work driven by it
 * -- filtering a large array and re-rendering the whole list --
 * until the person actually pauses typing.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebounced(value);
        }, delayMs);

        return () => clearTimeout(timer);
    }, [value, delayMs]);

    return debounced;
}
