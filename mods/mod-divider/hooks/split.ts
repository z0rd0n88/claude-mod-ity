// Mods share the band by nesting: each returns a column Box holding its own rows and, as its last or first child,
// the band of the mods beneath it. That nested, unkeyed column Box is where one mod ends and the next begins.
// ponytail: this reads the shape other mods happen to draw, so a mod that nests differently gets no divider.
type Node = { type?: string; props?: Record<string, unknown>; children?: unknown }

const isBand = (node: unknown): node is Node => {
  const n = node as Node | null
  return !!n && n.type === 'Box' && n.props?.flexDirection === 'column' && n.props?.key === undefined
}

export function withDividers<T>(tree: T, divider: () => unknown): T {
  if (!isBand(tree) || !Array.isArray(tree.children)) return tree
  const kids = tree.children.filter(Boolean)
  if (kids.length < 2) return tree
  const last = kids[kids.length - 1]
  if (isBand(last)) return { ...tree, children: [...kids.slice(0, -1), divider(), withDividers(last, divider)] }
  const first = kids[0]
  if (isBand(first)) return { ...tree, children: [withDividers(first, divider), divider(), ...kids.slice(1)] }
  return tree
}
