"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";

export function AddLink() {
  const addLink = useMutation(api.links.addLink);

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");

  return (
    <div>
      <input
        placeholder="URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <input
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <button
        onClick={() =>
          addLink({
            url,
            title,
            tags: [],
          })
        }
      >
        Save
      </button>
    </div>
  );
}
