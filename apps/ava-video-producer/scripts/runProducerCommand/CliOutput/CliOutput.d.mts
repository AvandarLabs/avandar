/** Shared human stderr messages and terminal styling. */
export const CliOutput: Readonly<{
  helpHeading(message: string): string;
  progress(message: string): void;
  success(message: string): void;
  warning(message: string): void;
  error(message: string, recovery: string): void;
  heading(message: string): string;
  selection(message: string): string;
}>;
