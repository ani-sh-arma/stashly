"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      appearance={{
        variables: {
          colorPrimary: "#7c3aed",
          colorBackground: "#111827",
          colorText: "#f9fafb",
          colorInputBackground: "#1f2937",
          colorInputText: "#f9fafb",
        },
        elements: {
          card: "bg-gray-900 border border-gray-700/50 shadow-2xl shadow-black/60",
          headerTitle: "text-white",
          headerSubtitle: "text-gray-400",
          socialButtonsBlockButton:
            "bg-gray-800 border border-gray-700/50 text-gray-200 hover:bg-gray-700",
          formButtonPrimary:
            "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500",
          footerActionLink: "text-violet-400 hover:text-violet-300",
        },
      }}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
