// Safe mini-DSL evaluator for branch_simple rules
// Supported operators: {"var":"path"}, {"==":[a,b]}, {">=":[a,b]}, {"<=":[a,b]}, {">":[a,b]}, {"<":[a,b]}, {"and":[...exprs]}, {"or":[...exprs]}, {"not":expr}

export type BranchContext = Record<string, any>;

function getPath(ctx: BranchContext, path: string): any {
  if (!path) return undefined;
  const parts = path.split('.');
  let cur: any = ctx;
  for (let i = 0; i < parts.length; i++) {
    if (cur == null) return undefined;
    const k = parts[i]!;
    cur = cur[k];
  }
  return cur;
}

export function evalRule(rule: unknown, ctx: BranchContext): boolean {
  try {
    return Boolean(evalNode(rule, ctx, 0));
  } catch {
    return false;
  }
}

const MAX_DEPTH = 32;

function evalNode(node: unknown, ctx: BranchContext, depth: number): any {
  if (depth > MAX_DEPTH) throw new Error('Max depth');
  if (typeof node === 'boolean' || typeof node === 'number' || typeof node === 'string' || node == null) return node;
  if (Array.isArray(node)) return node.map((n) => evalNode(n, ctx, depth + 1));
  if (typeof node !== 'object') return undefined;

  const obj = node as Record<string, unknown>;
  const keys = Object.keys(obj);
  if (keys.length !== 1) return undefined;
  const op = keys[0]!;
  const arg = obj[op];

  switch (op) {
    case 'var': {
      if (typeof arg === 'string') return getPath(ctx, arg);
      if (Array.isArray(arg) && typeof arg[0] === 'string') return getPath(ctx, String(arg[0])) ?? arg[1];
      return undefined;
    }
    case '==': {
      const [a, b] = evalPair(arg, ctx, depth);
      return a === b;
    }
    case '!=': {
      const [a, b] = evalPair(arg, ctx, depth);
      return a !== b;
    }
    case '>': {
      const [a, b] = evalPair(arg, ctx, depth);
      return Number(a) > Number(b);
    }
    case '>=': {
      const [a, b] = evalPair(arg, ctx, depth);
      return Number(a) >= Number(b);
    }
    case '<': {
      const [a, b] = evalPair(arg, ctx, depth);
      return Number(a) < Number(b);
    }
    case '<=': {
      const [a, b] = evalPair(arg, ctx, depth);
      return Number(a) <= Number(b);
    }
    case 'and': {
      const arr = Array.isArray(arg) ? arg : [arg];
      for (let i = 0; i < arr.length; i++) {
        if (!evalNode(arr[i], ctx, depth + 1)) return false;
      }
      return true;
    }
    case 'or': {
      const arr = Array.isArray(arg) ? arg : [arg];
      for (let i = 0; i < arr.length; i++) {
        if (evalNode(arr[i], ctx, depth + 1)) return true;
      }
      return false;
    }
    case 'not': {
      return !Boolean(evalNode(arg, ctx, depth + 1));
    }
    default:
      return undefined;
  }
}

function evalPair(arg: unknown, ctx: BranchContext, depth: number): [any, any] {
  const arr = Array.isArray(arg) ? arg : [arg, undefined];
  const a = evalNode(arr[0], ctx, depth + 1);
  const b = evalNode(arr[1], ctx, depth + 1);
  return [a, b];
}
