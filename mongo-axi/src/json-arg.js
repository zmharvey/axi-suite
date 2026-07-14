import { getFlag } from "./args.js";
import { AxiError } from "./errors.js";

/**
 * Read a CLI flag (e.g. --filter, --doc, --set) and JSON.parse it.
 * Throws a VALIDATION_ERROR with example syntax when the flag is missing
 * (and required) or fails to parse.
 *
 * @param {string[]} args - remaining positional/flag args for the command
 * @param {string} flagName - flag to read, e.g. "--filter"
 * @param {{required?: boolean, example?: string}} [opts]
 * @returns {*} the parsed JSON value, or undefined if absent and not required
 */
export function parseJsonFlag(args, flagName, { required = false, example } = {}) {
  const raw = getFlag(args, flagName);
  const sample = example || '{"field":"value"}';
  if (raw === undefined) {
    if (!required) return undefined;
    throw new AxiError(`Missing ${flagName} '<json>'`, "VALIDATION_ERROR", [
      `Usage: ${flagName} '${sample}'`,
    ]);
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new AxiError(`Invalid JSON for ${flagName}: ${e.message}`, "VALIDATION_ERROR", [
      `${flagName} must be valid JSON with double-quoted keys/strings`,
      `Example: ${flagName} '${sample}'`,
    ]);
  }
}
