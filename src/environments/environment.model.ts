export interface Environment {
  /** Fallback for the runtime environment variables. Only the development build sets them */
  readonly defaultEnv: Readonly<Record<string, string>>;
}
