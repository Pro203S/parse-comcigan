export default class ComciganError extends Error {
    public readonly cause?: unknown;

    constructor(message: string, cause?: unknown) {
        super(message);
        this.name = "ComciganError";
        this.cause = cause;
    }
}
