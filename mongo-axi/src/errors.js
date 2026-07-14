import { AxiError } from "axi-sdk-js";

export { AxiError };

/** Raised when no MongoDB connection URI is configured. */
export function tokenMissingError() {
  return new AxiError("No MongoDB connection URI found", "AUTH", [
    "Set env MONGO_AXI_URI to a full connection string (mongodb://... or mongodb+srv://...)",
    "Or add a uri field to ~/.config/mongo-axi/config.json",
    "Or run `mongo-axi auth login` and paste it",
  ]);
}

/** Map a MongoDB driver error into a structured AxiError. */
export function mapMongoError(err) {
  const message = err?.message || String(err);
  const name = err?.name || "";

  if (name === "MongoParseError") {
    return new AxiError(`Invalid connection string: ${message}`, "VALIDATION_ERROR", [
      "Check the URI starts with mongodb:// or mongodb+srv://",
    ]);
  }
  if (
    name === "MongoServerSelectionError" ||
    name === "MongoNetworkError" ||
    name === "MongoNetworkTimeoutError"
  ) {
    return new AxiError(`Could not reach MongoDB: ${message}`, "API_ERROR", [
      "Check the host/port in the connection string",
      "If using Atlas, check Network Access allows this IP",
      "Check the cluster/server is running",
    ]);
  }
  if (name === "MongoServerError") {
    if (err.code === 18 || /auth(entication)? fail/i.test(message)) {
      return new AxiError(`Authentication failed: ${message}`, "AUTH", [
        "Check the username/password in MONGO_AXI_URI or your stored connection string",
      ]);
    }
    if (err.code === 13) {
      return new AxiError(`Not authorized: ${message}`, "AUTH", [
        "The connected user lacks permission for this operation or database",
      ]);
    }
  }
  return new AxiError(`MongoDB error: ${message}`, "API_ERROR");
}
