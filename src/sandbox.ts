import { getQuickJS, type QuickJSContext } from "quickjs-emscripten";
import ComciganError from "./error.js";

const browser = String.raw`
    var window = globalThis,
        self = globalThis;
    var localStorage = {
            "ba": "1-1"
        },
        storage = localStorage;
    var navigator = {
        "userAgent": "Mozilla/5.0"
    };
    var location = {
        "href": "",
        "reload": function () {}
    };
    var document = {
        "getElementById": function () {
            return {
                "value": "",
                "style": {}
            };
        }
    };
    var __sources = [],
        __requests = [],
        __html = "";
    var __nativeEval = eval;
    eval = function (source) {
        __sources.push(source);
        return (0, __nativeEval)(source);
    };
    function alert(message) {
        throw new Error(String(message));
    }
    function confirm() {
        return false;
    }
    function setTimeout() {
        return 0;
    }
    function clearTimeout() {}
    function $(value) {
        if (typeof value === "function") {
            return;
        }
        var chain = new Proxy(
            {},
            {
                "get": function (_, key) {
                    if (key === "append" || key === "html" || key === "text") {
                        return function (value) {
                            __html += String(value || "");
                            return chain;
                        };
                    }
                    return function () {
                        return chain;
                    };
                }
            }
        );
        return chain;
    }
    $.ajax = function (options) {
        __requests.push({
            "url": options.url,
            "headers": options.headers || {}
        });
        return {};
    };
    $.ajaxSetup = function () {};
    var jQuery = $;
`;

export default class ScriptSandbox {
    private deadline = 0;

    private constructor(private readonly context: QuickJSContext) {}

    public static async create(): Promise<ScriptSandbox> {
        try {
            const engine = await getQuickJS();
            const context = engine.newContext();
            const sandbox = new ScriptSandbox(context);
            context.runtime.setMemoryLimit(32 * 1024 * 1024);
            context.runtime.setMaxStackSize(1024 * 1024);
            context.runtime.setInterruptHandler(() => Date.now() > sandbox.deadline);
            for (const [name, fn] of Object.entries({
                "btoa": (value: string) => Buffer.from(value, "binary").toString("base64"),
                "atob": (value: string) => Buffer.from(value, "base64").toString("binary")
            })) {
                const handle = context.newFunction(name, (value) => context.newString(fn(String(context.dump(value)))));
                context.setProp(context.global, name, handle);
                handle.dispose();
            }
            try {
                sandbox.run(browser);
                return sandbox;
            } catch (error) {
                sandbox.dispose();
                throw error;
            }
        } catch (error) {
            throw new ComciganError("스크립트 실행 환경을 생성할 수 없습니다.", error);
        }
    }

    public run<T = unknown>(source: string): T {
        this.deadline = Date.now() + 1500;
        const result = this.context.evalCode(source);
        if (result.error) {
            const error = this.context.dump(result.error);
            result.error.dispose();
            throw new ComciganError("컴시간 스크립트를 실행할 수 없습니다.", error);
        }
        try {
            return this.context.dump(result.value) as T;
        } finally {
            result.value.dispose();
        }
    }

    public dispose(): void {
        this.context.dispose();
    }
}
