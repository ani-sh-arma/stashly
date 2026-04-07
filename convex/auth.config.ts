if (!process.env.CLERK_JWT_ISSUER_DOMAIN) {
  throw new Error(
    "Missing required environment variable: CLERK_JWT_ISSUER_DOMAIN. " +
      "Set it to your Clerk JWT issuer URL (e.g. https://your-instance.clerk.accounts.dev).",
  );
}

const authConfig = {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
