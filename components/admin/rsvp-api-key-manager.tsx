"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, KeyRound, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    createRsvpApiKeyAction,
    listRsvpApiKeysAction,
    revokeRsvpApiKeyAction,
} from "@/actions/rsvp";

interface RsvpApiKeyRow {
    id: string;
    keyPrefix: string;
    label: string | null;
    createdAt: string;
    lastUsedAt: string | null;
    revokedAt: string | null;
}

interface RsvpApiKeyManagerProps {
    weddingId: string;
    weddingSlug: string | null;
}

/*
 * Lets a wedding owner/admin issue and revoke the API key an external
 * RSVP form/site uses to confirm or decline guests by name via
 * POST /api/public/rsvp. The raw key is shown exactly once, right after
 * creation -- only its hash is stored server-side.
 */
export function RsvpApiKeyManager({
                                      weddingId,
                                      weddingSlug,
                                  }: RsvpApiKeyManagerProps) {
    const [keys, setKeys] = useState<RsvpApiKeyRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [label, setLabel] = useState("");
    const [revokingId, setRevokingId] = useState<string | null>(null);
    const [newKey, setNewKey] = useState<string | null>(null);

    const loadKeys = useCallback(async () => {
        setLoading(true);

        try {
            const result = await listRsvpApiKeysAction(weddingId);

            if (result.error) {
                toast.error(result.error);
            }

            setKeys(result.keys);
        } finally {
            setLoading(false);
        }
    }, [weddingId]);

    useEffect(() => {
        void loadKeys();
    }, [loadKeys]);

    const handleCreate = async () => {
        setCreating(true);

        try {
            const result = await createRsvpApiKeyAction(
                weddingId,
                label.trim() || undefined
            );

            if (!result.success || !result.apiKey) {
                toast.error(result.error ?? "Failed to create API key");
                return;
            }

            setNewKey(result.apiKey);
            setLabel("");
            await loadKeys();
            toast.success("RSVP API key created");
        } finally {
            setCreating(false);
        }
    };

    const handleRevoke = async (id: string) => {
        setRevokingId(id);

        try {
            const result = await revokeRsvpApiKeyAction(weddingId, id);

            if (!result.success) {
                toast.error(result.error ?? "Failed to revoke API key");
                return;
            }

            setKeys((current) =>
                current.map((key) =>
                    key.id === id
                        ? { ...key, revokedAt: new Date().toISOString() }
                        : key
                )
            );

            toast.success("API key revoked");
        } finally {
            setRevokingId(null);
        }
    };

    const copyToClipboard = async (value: string) => {
        try {
            await navigator.clipboard.writeText(value);
            toast.success("Copied to clipboard");
        } catch {
            toast.error("Could not copy automatically -- copy it manually");
        }
    };

    const activeKeys = keys.filter((key) => !key.revokedAt);

    return (
        <section className="rounded-[1.5rem] border border-border/70 bg-card/85 p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground">
                    <KeyRound className="h-4 w-4" strokeWidth={1.7} />
                </div>

                <div>
                    <h2 className="font-serif text-lg font-light text-foreground">
                        RSVP API
                    </h2>

                    <p className="text-xs text-muted-foreground">
                        Let an external site confirm or decline guests by name.
                    </p>
                </div>
            </div>

            <div className="mt-4 rounded-xl bg-secondary/40 p-3.5 text-xs leading-5 text-muted-foreground">
                <p>
                    <code className="rounded bg-background/70 px-1 py-0.5">
                        POST /api/public/rsvp
                    </code>{" "}
                    with the key sent as{" "}
                    <code className="rounded bg-background/70 px-1 py-0.5">
                        Authorization: Bearer &lt;api key&gt;
                    </code>{" "}
                    or{" "}
                    <code className="rounded bg-background/70 px-1 py-0.5">
                        X-Api-Key: &lt;api key&gt;
                    </code>{" "}
                    (or{" "}
                    <code className="rounded bg-background/70 px-1 py-0.5">
                        ?api_key=&lt;api key&gt;
                    </code>{" "}
                    for tools that can&apos;t set custom headers), and body{" "}
                    <code className="rounded bg-background/70 px-1 py-0.5">
                        {`{"weddingSlug":"${weddingSlug ?? "your-slug"}","firstName":"...","lastName":"...","status":"confirmed"}`}
                    </code>
                    . See the README for the full request/response reference.
                </p>
            </div>

            {newKey && (
                <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
                    <p className="text-xs font-medium text-foreground">
                        Copy this key now -- it will not be shown again.
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                        <code className="flex-1 truncate rounded-lg bg-background/80 px-3 py-2 text-xs">
                            {newKey}
                        </code>

                        <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={() => void copyToClipboard(newKey)}
                            aria-label="Copy API key"
                        >
                            <Copy className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                    type="text"
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                    placeholder={'Label (optional, e.g. "Squarespace RSVP form")'}
                    maxLength={60}
                    className="input-wedding h-10 flex-1 rounded-xl bg-background text-sm"
                />

                <Button
                    type="button"
                    onClick={() => void handleCreate()}
                    disabled={creating}
                >
                    {creating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <KeyRound className="h-3.5 w-3.5" />
                    )}
                    Create key
                </Button>
            </div>

            <div className="mt-5 space-y-2">
                {loading && (
                    <p className="text-xs text-muted-foreground">Loading keys...</p>
                )}

                {!loading && activeKeys.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                        No active API keys yet.
                    </p>
                )}

                {activeKeys.map((key) => (
                    <div
                        key={key.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/60 px-3.5 py-3"
                    >
                        <div className="min-w-0">
                            <p className="truncate text-sm text-foreground">
                                {key.label || "Untitled key"}
                            </p>

                            <p className="truncate text-[11px] text-muted-foreground">
                                {key.keyPrefix}••••••••••••{" "}
                                {key.lastUsedAt
                                    ? `· last used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                                    : "· never used"}
                            </p>
                        </div>

                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            disabled={revokingId === key.id}
                            onClick={() => void handleRevoke(key.id)}
                            aria-label="Revoke API key"
                        >
                            {revokingId === key.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            )}
                        </Button>
                    </div>
                ))}
            </div>
        </section>
    );
}