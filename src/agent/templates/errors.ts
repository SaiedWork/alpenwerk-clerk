export const templateErrorCodes = [
  "TEMPLATE_UNKNOWN",
  "TEMPLATE_VARIABLE_MISSING",
  "TEMPLATE_UNSAFE_OUTPUT",
] as const;

/** Typed error of the reply renderer. Rendering never falls back silently: a bad reply is not sent. */
export class TemplateError extends Error {
  constructor(
    readonly code: (typeof templateErrorCodes)[number],
    message: string,
  ) {
    super(message);
    this.name = "TemplateError";
  }
}
