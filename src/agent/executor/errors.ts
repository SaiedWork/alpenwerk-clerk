export type LegacyDriverErrorCode =
  | "LEGACY_NOT_CONFIGURED"
  | "LEGACY_LOGIN_FAILED"
  | "LEGACY_UNEXPECTED_PAGE"
  | "LEGACY_PARSE_FAILED";

/** Failure of the browser driver. `code` ends up on the event row and in the console. */
export class LegacyDriverError extends Error {
  constructor(
    readonly code: LegacyDriverErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "LegacyDriverError";
  }
}
