const PATCH_MARKER = '__pbSafeDomMutationsInstalled__';

type PatchedWindow = Window & {
  [PATCH_MARKER]?: boolean;
};

const patchedWindow = window as PatchedWindow;

if (!patchedWindow[PATCH_MARKER]) {
  patchedWindow[PATCH_MARKER] = true;

  const originalRemoveChild = Node.prototype.removeChild;
  const originalInsertBefore = Node.prototype.insertBefore;
  const originalAppendChild = Node.prototype.appendChild;

  // Android/WebView helpers and page translators can move text nodes between
  // React commits. Keep those external mutations from crashing the whole app.
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) return child;
    return originalRemoveChild.call(this, child) as T;
  };

  Node.prototype.insertBefore = function <T extends Node>(
    this: Node,
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      return originalAppendChild.call(this, newNode) as T;
    }

    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}
