import { dark } from "@clerk/ui/themes";

export const clerkAppearance = {
  theme: dark,
  variables: {
    colorPrimary: "#06b6d4",
    colorBackground: "#111318",
    colorForeground: "#f3f4f6",
    colorMutedForeground: "#9ca3af",
    colorInput: "#1f2530",
    colorInputForeground: "#f3f4f6",
    colorBorder: "#2f3139",
    colorRing: "#06b6d4",
  },
  elements: {
    card: "bg-surface-primary border border-border-primary shadow-2xl shadow-black/60",
    headerTitle: "text-foreground",
    headerSubtitle: "text-foreground/60",
    formFieldLabel: "text-foreground/80",
    formFieldInput:
      "bg-surface-secondary border-border-primary text-foreground placeholder:text-foreground/35 focus:border-accent-primary/70 focus:ring-accent-primary/20",
    socialButtonsBlockButton:
      "bg-surface-secondary border border-border-primary text-foreground hover:bg-surface-tertiary",
    formButtonPrimary:
      "bg-linear-to-r from-cyan-500 to-emerald-500 text-white hover:from-cyan-400 hover:to-emerald-400",
    footerActionLink: "text-accent-primary hover:text-accent-secondary",
    dividerLine: "bg-border-primary",
    dividerText: "text-foreground/45",
    identityPreviewText: "text-foreground/80",
    identityPreviewEditButton:
      "text-accent-primary hover:text-accent-secondary",
    userButtonPopoverCard:
      "bg-surface-primary border border-border-primary shadow-2xl shadow-black/60",
    userButtonPopoverActionButton:
      "text-foreground hover:bg-surface-secondary focus:bg-surface-secondary",
  },
} as const;

export const clerkUserButtonAppearance = {
  ...clerkAppearance,
  elements: {
    ...clerkAppearance.elements,
    avatarBox: "w-8 h-8",
  },
} as const;
