import type { KnipConfig } from "knip";

export default {
  ignoreExportsUsedInFile: { "src/schemas/types.ts": true }
} satisfies KnipConfig;
