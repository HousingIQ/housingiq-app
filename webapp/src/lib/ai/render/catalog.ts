import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { shadcnComponentDefinitions } from "@json-render/shadcn/catalog";
import { z } from "zod";

export const housingCatalog = defineCatalog(schema, {
  components: {
    Stack: shadcnComponentDefinitions.Stack,
    Card: shadcnComponentDefinitions.Card,
    Grid: shadcnComponentDefinitions.Grid,
    Heading: shadcnComponentDefinitions.Heading,
    Separator: shadcnComponentDefinitions.Separator,
    Badge: shadcnComponentDefinitions.Badge,

    Text: {
      props: z.object({
        content: z.string(),
        muted: z.boolean().nullable(),
      }),
      description: "Text content",
      example: { content: "Here is your data overview." },
    },

    Metric: {
      props: z.object({
        label: z.string(),
        value: z.string(),
        detail: z.string().nullable(),
        trend: z.enum(["up", "down", "neutral"]).nullable(),
      }),
      description:
        "Single metric display with label, value, and optional trend indicator. Use for key housing numbers like current home value, YoY change, rent value.",
      example: {
        label: "Current Home Value",
        value: "$350,000",
        detail: "+5.2% YoY",
        trend: "up",
      },
    },

    LineChart: {
      props: z.object({
        title: z.string().nullable(),
        data: z.array(z.record(z.string(), z.unknown())),
        xKey: z.string(),
        yKey: z.string(),
        aggregate: z.enum(["sum", "count", "avg"]).nullable(),
        color: z.string().nullable(),
        height: z.number().nullable(),
      }),
      description:
        'Line chart for time-series data like home value trends. Use { "$state": "/path" } to bind data. xKey is the x-axis field (usually "date"), yKey is the numeric value field (usually "homeValue").',
    },

    Callout: {
      props: z.object({
        type: z.enum(["info", "tip", "warning", "important"]).nullable(),
        title: z.string().nullable(),
        content: z.string(),
      }),
      description:
        "Highlighted callout box for market insights, tips, or key takeaways",
      example: {
        type: "tip",
        title: "Market Insight",
        content:
          "Home values in this area have been appreciating steadily over the past 2 years.",
      },
    },
  },

  actions: {},
});
