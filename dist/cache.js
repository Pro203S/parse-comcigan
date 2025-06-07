export default class Cache {
    constructor() {
        this._cacheStorage = {};
    }
    register(id, data, duration) {
        this._cacheStorage[id] = {
            "timeout": setTimeout(() => {
                delete this._cacheStorage[id];
            }, duration),
            "data": data
        };
    }
    delete(id) {
        clearTimeout(this._cacheStorage[id].timeout);
        delete this._cacheStorage[id];
    }
    clear() {
        const caches = Object.keys(this._cacheStorage);
        for (let cache of caches) {
            clearTimeout(this._cacheStorage[cache].timeout);
            delete this._cacheStorage[cache];
        }
    }
    has(id) {
        return Boolean(this._cacheStorage[id]);
    }
    get(id) {
        var _a;
        return (_a = this._cacheStorage[id]) === null || _a === void 0 ? void 0 : _a.data;
    }
}
//# sourceMappingURL=cache.js.map