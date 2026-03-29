"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export default function Home() {
  const message = useQuery(api.hello.getMessage);

  return <div>{message}</div>;
}
