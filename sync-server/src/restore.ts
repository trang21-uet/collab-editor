import * as Y from "yjs";
import type { Hocuspocus } from "@hocuspocus/server";
import { prisma } from "./persistence.js";

export class VersionNotFoundError extends Error {}

/**
 * Clones the children of one Y.XmlFragment into another, replacing whatever the
 * target already contains.
 *
 * This is needed rather than a plain Y.applyUpdate because Yjs updates are purely
 * additive at the CRDT operation-log level: applying an old document's state onto a
 * live document that has since diverged does not "revert" it, it just merges old ops
 * back in alongside the new ones. To actually make the live document look like the old
 * version, we express the revert as one new edit — clear the current content and
 * insert a copy of the old content — which flows through Yjs/Hocuspocus exactly like
 * any other edit (broadcast to connected clients, picked up by the debounced autosave).
 *
 * Yjs also does not allow a type instance that already belongs to one Y.Doc to be
 * attached to another, so each node has to be reconstructed rather than moved: text
 * nodes via their delta (formatting-preserving), element nodes via their tag name +
 * attributes, recursing into children.
 */
function cloneXmlFragment(source: Y.XmlFragment, target: Y.XmlFragment) {
  target.delete(0, target.length);
  target.insert(0, source.toArray().map(cloneXmlNode));
}

function cloneXmlNode(
  node: Y.XmlElement | Y.XmlText | Y.XmlHook,
): Y.XmlElement | Y.XmlText {
  if (node instanceof Y.XmlText) {
    const clone = new Y.XmlText();
    clone.applyDelta(node.toDelta());
    return clone;
  }

  if (node instanceof Y.XmlElement) {
    if (!node.nodeName) {
      throw new Error("Cannot clone a Y.XmlElement with no nodeName");
    }
    const clone = new Y.XmlElement(node.nodeName);
    for (const [name, value] of Object.entries(node.getAttributes())) {
      if (value !== undefined) clone.setAttribute(name, value);
    }
    clone.insert(0, node.toArray().map(cloneXmlNode));
    return clone;
  }

  // Y.XmlHook wraps an opaque embedded type Tiptap/StarterKit never produces; fail
  // loudly rather than silently dropping content we don't know how to clone.
  throw new Error(
    `Cannot clone unsupported Yjs XML node type: ${node.constructor.name}`,
  );
}

/**
 * Restores documentId's live Y.Doc to the content of a previously saved
 * DocumentSnapshot version. Works whether or not anyone is currently connected:
 * openDirectConnection loads the document (via the same onLoadDocument hook a real
 * WebSocket connection would use) if it isn't already in memory.
 */
export async function restoreVersion(
  hocuspocus: Hocuspocus,
  documentId: string,
  version: number,
): Promise<void> {
  const snapshot = await prisma.documentSnapshot.findUnique({
    where: { documentId_version: { documentId, version } },
    select: { ydocState: true },
  });
  if (!snapshot) {
    throw new VersionNotFoundError(
      `No snapshot version ${version} for document "${documentId}"`,
    );
  }

  const oldDoc = new Y.Doc();
  Y.applyUpdate(oldDoc, snapshot.ydocState);

  const connection = await hocuspocus.openDirectConnection(documentId);
  try {
    await connection.transact((liveDoc) => {
      cloneXmlFragment(
        oldDoc.getXmlFragment("default"),
        liveDoc.getXmlFragment("default"),
      );
    });
  } finally {
    await connection.disconnect();
  }
}
