const TERMINAL = ['delivered', 'cancelled', 'rejected'];

/** No further status change is coming — safe to stop polling. */
export function isTerminalStatus(status) {
  return TERMINAL.includes(status);
}
