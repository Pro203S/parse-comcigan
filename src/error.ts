export default class ComciganError extends Error {
    constructor(
        public message: string
    ) { super(message); }

    
}