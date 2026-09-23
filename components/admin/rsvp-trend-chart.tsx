"use client";

import { TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import { cn } from "@/lib/utils";
import type { RsvpTrendPoint } from "@/actions/seating";

interface RsvpTrendChartProps {
    data: RsvpTrendPoint[];
    stats: {
        total: number;
        confirmed: number;
        declined: number;
        pending: number;
    };
}

/*
 * Renders a `YYYY-MM-DD` bucket date as a short, locale-formatted
 * label ("Sep 12") for the chart axis and tooltip.
 */
function formatAxisDate(value: string) {
    const date = new Date(`${value}T00:00:00Z`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
    });
}

/*
 * Cumulative "RSVPs responded" trend for a wedding's dashboard.
 * Data is bucketed/cumulative-summed server-side (see
 * bucketRsvpResponsesByDay in actions/seating.ts) from
 * `rsvp_responded_at` -- there is no full status-change history,
 * so this shows when guests first responded, not every status
 * flip since.
 */
export function RsvpTrendChart({ data, stats }: RsvpTrendChartProps) {
    const t = useTranslations("rsvpTrend");

    const hasData = data.length > 0;

    return (
        <section className="rounded-[1.5rem] border border-border/70 bg-card/85 p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground">
                    <TrendingUp className="h-4 w-4" strokeWidth={1.7} />
                </div>

                <div>
                    <h2 className="font-serif text-lg font-light text-foreground">
                        {t("title")}
                    </h2>

                    <p className="text-xs text-muted-foreground">{t("description")}</p>
                </div>
            </div>

            {/* Stat row */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <TrendStat value={stats.total} label={t("totalInvited")} />

                <TrendStat
                    value={stats.confirmed}
                    label={t("confirmed")}
                    accent="primary"
                />

                <TrendStat
                    value={stats.declined}
                    label={t("declined")}
                    accent="destructive"
                />

                <TrendStat value={stats.pending} label={t("pending")} />
            </div>

            {/* Chart */}
            <div className="mt-5 h-64 rounded-xl bg-secondary/30 p-3">
                {hasData ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={data}
                            margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient
                                    id="rsvpTrendConfirmed"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="5%"
                                        stopColor="hsl(var(--primary))"
                                        stopOpacity={0.35}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor="hsl(var(--primary))"
                                        stopOpacity={0}
                                    />
                                </linearGradient>

                                <linearGradient
                                    id="rsvpTrendDeclined"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="5%"
                                        stopColor="hsl(var(--destructive))"
                                        stopOpacity={0.3}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor="hsl(var(--destructive))"
                                        stopOpacity={0}
                                    />
                                </linearGradient>
                            </defs>

                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="hsl(var(--border))"
                                vertical={false}
                            />

                            <XAxis
                                dataKey="date"
                                tickFormatter={formatAxisDate}
                                tick={{
                                    fontSize: 10,
                                    fill: "hsl(var(--muted-foreground))",
                                }}
                                tickLine={false}
                                axisLine={false}
                            />

                            <YAxis
                                allowDecimals={false}
                                tick={{
                                    fontSize: 10,
                                    fill: "hsl(var(--muted-foreground))",
                                }}
                                tickLine={false}
                                axisLine={false}
                                width={32}
                            />

                            <Tooltip
                                labelFormatter={(value) => formatAxisDate(String(value))}
                                contentStyle={{
                                    borderRadius: 12,
                                    border: "1px solid hsl(var(--border))",
                                    background: "hsl(var(--card))",
                                    fontSize: 12,
                                }}
                                formatter={(value, name) => [
                                    value,
                                    name === "confirmedCumulative"
                                        ? t("confirmedSeries")
                                        : t("declinedSeries"),
                                ]}
                            />

                            <Area
                                type="monotone"
                                dataKey="confirmedCumulative"
                                name={t("confirmedSeries")}
                                stroke="hsl(var(--primary))"
                                fill="url(#rsvpTrendConfirmed)"
                                strokeWidth={2}
                            />

                            <Area
                                type="monotone"
                                dataKey="declinedCumulative"
                                name={t("declinedSeries")}
                                stroke="hsl(var(--destructive))"
                                fill="url(#rsvpTrendDeclined)"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
                        <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
                    </div>
                )}
            </div>
        </section>
    );
}

function TrendStat({
                       value,
                       label,
                       accent,
                   }: {
    value: number;
    label: string;
    accent?: "primary" | "destructive";
}) {
    return (
        <div className="rounded-xl border border-border/60 bg-card/60 p-3">
            <p
                className={cn(
                    "font-serif text-2xl font-light tracking-tight text-foreground",
                    accent === "primary" && "text-[hsl(var(--primary))]",
                    accent === "destructive" && "text-[hsl(var(--destructive))]",
                )}
            >
                {value}
            </p>

            <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                {label}
            </p>
        </div>
    );
}
