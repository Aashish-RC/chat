export class FilterBlockError extends Error {
  public readonly code = 'FILTER_BLOCKED';
  public readonly statusCode = 400;
  public readonly filterId: string;
  public readonly reason: string;

  constructor(filterId: string, reason: string) {
    super(`Blocked by filter '${filterId}': ${reason}`);
    this.name = 'FilterBlockError';
    this.filterId = filterId;
    this.reason = reason;
    Object.setPrototypeOf(this, FilterBlockError.prototype);
  }
}
