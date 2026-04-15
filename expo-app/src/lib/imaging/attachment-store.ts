/**
 * In-memory store of image attachments produced by tool calls.
 *
 * Keeping the base64 bytes out of the LLM conversation — the model only
 * sees `{ image_id: "xray_…" }` and the UI pulls the actual data URI
 * from this store when rendering.
 */
type Attachment = {
  dataUri: string;
  caption: string;
  width: number;
  height: number;
};

const store = new Map<string, Attachment>();

export function putImageAttachment(
  id: string,
  dataUri: string,
  caption: string,
  width: number,
  height: number,
): void {
  store.set(id, { dataUri, caption, width, height });
}

export function getImageAttachment(id: string): Attachment | undefined {
  return store.get(id);
}

/**
 * Extract `[image:...]` refs from an assistant answer. The model is
 * instructed to wrap image ids that way so the UI can swap them out.
 */
export function extractImageIds(text: string): string[] {
  const ids: string[] = [];
  const re = /\[image:([a-zA-Z0-9_-]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) ids.push(m[1]);
  return ids;
}
