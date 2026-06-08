export default class ComciganError extends Error {
    constructor(
        public status: number,
        public message: string
    ) { super(`${status}: ${message}`); }

    
}