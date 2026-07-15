import { AxiError } from "./errors.js";

function eq(flag) {
  return `${flag}=`;
}

/** Read --flag value or --flag=value without mutating args. */
export function getFlag(args, name) {
  const prefix = eq(name);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === name) return i + 1 < args.length ? args[i + 1] : undefined;
    if (a.startsWith(prefix)) return a.slice(prefix.length);
  }
  return undefined;
}

/** Read and remove --flag value or --flag=value. */
export function takeFlag(args, flag) {
  const prefix = eq(flag);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === flag) {
      const v = args[i + 1];
      args.splice(i, 2);
      return v;
    }
    if (a.startsWith(prefix)) {
      const v = a.slice(prefix.length);
      args.splice(i, 1);
      return v;
    }
  }
  return undefined;
}

/** Presence check for a boolean flag. */
export function hasFlag(args, flag) {
  return args.includes(flag);
}

/** Presence check that also removes the flag. */
export function takeBoolFlag(args, flag) {
  const i = args.indexOf(flag);
  if (i === -1) return false;
  args.splice(i, 1);
  return true;
}

/** Collect every value of a repeatable flag. */
export function getAllFlags(args, flag) {
  const out = [];
  const prefix = eq(flag);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === flag && i + 1 < args.length) {
      out.push(args[i + 1]);
      i++;
    } else if (a.startsWith(prefix)) {
      out.push(a.slice(prefix.length));
    }
  }
  return out;
}

/** First non-flag positional at or after startIndex. */
export function getPositional(args, startIndex = 0) {
  for (let i = startIndex; i < args.length; i++) {
    if (!args[i].startsWith("-")) return args[i];
  }
  return undefined;
}

/** Require a positional arg or throw. */
export function requirePositional(args, startIndex, label) {
  const v = getPositional(args, startIndex);
  if (!v) throw new AxiError(`Missing ${label}`, "VALIDATION_ERROR");
  return v;
}
