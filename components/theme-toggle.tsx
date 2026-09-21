"use client";

import {useSyncExternalStore} from "react";

import {Moon, Sun} from "lucide-react";
import {useTranslations} from "next-intl";
import {useTheme} from "next-themes";

import {cn} from "@/lib/utils";

interface ThemeToggleProps {
    className?: string;
}

const emptySubscribe = () => () => {
};

export function ThemeToggle({className}: ThemeToggleProps) {
    const {resolvedTheme, setTheme} = useTheme();

    const t = useTranslations("common");

    const mounted = useSyncExternalStore(
        emptySubscribe,
        () => true,
        () => false,
    );

    /*
     * Prevent hydration mismatch because
     * the active theme only exists client-side.
     */
    if (!mounted) {
        return (
            <div
                aria-hidden
                className={cn("h-9 w-9 shrink-0 rounded-full", className)}
            />
        );
    }

    const isDark = resolvedTheme === "dark";

    const label = isDark ? t("switchToLightMode") : t("switchToDarkMode");

    return (
        <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={label}
            title={label}
            className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-card text-muted-foreground transition-colors",
                "hover:bg-secondary hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20",
                className,
            )}
        >
            {isDark ? (
                <Sun className="h-3.5 w-3.5" strokeWidth={1.7}/>
            ) : (
                <Moon className="h-3.5 w-3.5" strokeWidth={1.7}/>
            )}
        </button>
    );
}
