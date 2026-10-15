import type { Stories, Story } from "./api";
import { getReaderKey } from "./readerKey";

type PrivateStory = Pick<Story, "lead" | "authors" | "modifiedAt" | "summary" | "body">;
// See scripts/encrypt-stories.mjs: the stories under a content key, wrapped once per reader.
type Package = { v: number; iv: string; data: string; readers: Record<string, { iv: string; key: string }> };

const bytes = (base64: string) =>
  Uint8Array.from(atob(base64.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const base64url = (buffer: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function open(raw: BufferSource, iv: string, data: string) {
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(iv) }, key, bytes(data));
}

/**
 * With the reader's key, add the full stories (Adressa's summary and the article text) from the
 * encrypted package. Without a key, or with one that no longer has access, the stories stay as
 * the public facts.
 */
export async function withFullStories(data: Stories): Promise<Stories> {
  const key = getReaderKey();
  if (!key || !crypto.subtle || data.stories.every((s) => s.imported)) return data;
  try {
    const res = await fetch("/private/stories.enc.json", { cache: "no-cache" });
    if (!res.ok) return data;
    const pkg = (await res.json()) as Package;
    const mine = bytes(key);
    const id = base64url((await crypto.subtle.digest("SHA-256", mine)).slice(0, 9));
    const wrapped = pkg.readers?.[id];
    if (!wrapped) return data;
    const contentKey = await open(mine, wrapped.iv, wrapped.key);
    const unlocked = JSON.parse(new TextDecoder().decode(await open(contentKey, pkg.iv, pkg.data))) as {
      importedAt: string | null;
      stories: Record<string, PrivateStory>;
    };
    return {
      ...data,
      importedAt: data.importedAt ?? unlocked.importedAt,
      stories: data.stories.map((s) => {
        const full = unlocked.stories[s.id];
        if (!full || s.imported) return s;
        return { ...s, ...full, lead: full.lead ?? s.lead, imported: true };
      }),
    };
  } catch {
    // A damaged package or key: show the public stories.
    return data;
  }
}
