import { query } from "./_generated/server";

export const getMessage = query({
  handler: async () => {
    return "Hello from Convex!";
  },
});
