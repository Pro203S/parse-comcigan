export default class Cache {
    private _cacheStorage;
    register(id: string, data: any, duration: number): void;
    delete(id: string): void;
    clear(): void;
    has(id: string): boolean;
    get(id: string): any;
}
