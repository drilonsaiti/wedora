import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

/*
 * Every admin/couple auth page (login, forgot-password,
 * reset-password) is a standalone `<main>` with no shared
 * header, so ThemeToggle/LanguageSwitcher -- both used
 * everywhere else in the app -- were never reachable here.
 * A guest stuck on a dark screen or a non-English browser
 * had no way to fix either before signing in.
 */
export function AuthPageToolbar() {
    return (
        <div className="absolute right-4 top-4 z-20 flex items-center gap-2 sm:right-6 sm:top-6">
            <LanguageSwitcher />
            <ThemeToggle />
        </div>
    );
}
