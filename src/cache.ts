export default class Cache {
    private _cacheStorage: Collection<{
        "timeout": NodeJS.Timeout;
        "data": any;
    }> = {};

    public register(id: string, data: any, duration: number) {
        this._cacheStorage[id] = {
            "timeout": setTimeout(() => {
                delete this._cacheStorage[id];
            }, duration),
            "data": data
        };
    }
    public delete(id: string) {
        clearTimeout(this._cacheStorage[id].timeout);
        delete this._cacheStorage[id];
    }
    public clear() {
        const caches = Object.keys(this._cacheStorage);
        for (let cache of caches) {
            clearTimeout(this._cacheStorage[cache].timeout);
            delete this._cacheStorage[cache];
        }
    }
    public has(id: string) {
        return Boolean(this._cacheStorage[id]);
    }
    public get(id: string) {
        return this._cacheStorage[id]?.data;
    }
}