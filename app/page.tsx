"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AddLink } from "./AddLink";

export default function Home() {
  const links = useQuery(api.links.getLinks);

  if (!links) return <div>Loading...</div>;

  return (
    <div>
      {links.map((link) => (
        <div key={link._id}>
          <h2>{link.title}</h2>
          <a href={link.url}>{link.url}</a>
        </div>
      ))}

      <AddLink></AddLink>
    </div>
  );
}
