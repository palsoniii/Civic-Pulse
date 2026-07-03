import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrate: {
    datasource: {
      url: "postgresql://civicpulse:civicpulse_secret@localhost:5434/complaints_db?schema=public",
    },
  },
});
