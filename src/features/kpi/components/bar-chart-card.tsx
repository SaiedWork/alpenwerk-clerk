"use client";

import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { t } from "@/lib/i18n-de";

export type BarDatum = { label: string; value: number };

const ROW_PX = 36;

/**
 * Horizontal bars for one measure across categories. One series, so there is no legend: the
 * category names sit on the axis and the title names the measure. The color is a theme token.
 * A visually hidden table carries the same numbers for screen readers.
 */
export function BarChartCard({
  title,
  data,
}: {
  title: string;
  data: BarDatum[];
}) {
  const config = {
    value: {
      label: t.console.kpi.charts.cases,
      // Both are theme tokens; the lighter one keeps contrast on the dark surface.
      theme: { light: "var(--chart-3)", dark: "var(--chart-2)" },
    },
  } satisfies ChartConfig;
  const labelWidth = 132;

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4 text-card-foreground">
      <h2 className="font-medium">{title}</h2>
      <ChartContainer
        config={config}
        // The base chart styles force the hover band to `--muted`, which is barely visible on the
        // card. A tint of the text color shows on both the light and the dark surface.
        className="aspect-auto w-full [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-foreground/10!"
        style={{ height: data.length * ROW_PX + 8 }}
        role="img"
        aria-label={title}
      >
        <BarChart
          accessibilityLayer
          data={data}
          layout="vertical"
          margin={{ left: 0, right: 28, top: 0, bottom: 0 }}
          barCategoryGap={10}
        >
          <YAxis
            dataKey="label"
            type="category"
            width={labelWidth}
            tickLine={false}
            axisLine={false}
            tick={<LeftAlignedTick />}
          />
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          {/* minPointSize keeps a 0 visible as a thin stub next to its "0" label. */}
          <Bar
            dataKey="value"
            fill="var(--color-value)"
            radius={4}
            minPointSize={2}
          >
            <LabelList
              dataKey="value"
              position="right"
              className="fill-foreground"
              fontSize={12}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
      <table className="sr-only">
        <caption>
          {t.console.kpi.charts.tableLabel.replace("{title}", title)}
        </caption>
        <thead>
          <tr>
            <th scope="col">{title}</th>
            <th scope="col">{t.console.kpi.charts.cases}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

type TickProps = { y?: number; payload?: { value: string } };

/** Axis label drawn from the left edge, so all category names start on one line. */
function LeftAlignedTick({ y, payload }: TickProps) {
  return (
    <text
      x={0}
      y={y}
      dy="0.32em"
      textAnchor="start"
      fontSize={13}
      className="fill-foreground"
    >
      {payload?.value}
    </text>
  );
}
