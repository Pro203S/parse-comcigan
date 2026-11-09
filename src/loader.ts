import axios from "axios";
import { inspect } from "node:util";
import iconv from "iconv-lite";
import { load } from "cheerio";
import ScriptSandbox from "./sandbox.js";
import ComciganError from "./error.js";
import type { ComciganOptions, ComciganRawData, ComciganSchool } from "./types/index.js";

export const STUDENT_URL = "http://comci.net:4082/st";

export async function request(url: string, headers: Record<string, string> = {}, options: ComciganOptions = {}): Promise<{
    "text": string;
    "url": string;
}> {
    try {
        if (options.debug) {
            options.debug(`[parse-comcigan] Request ${JSON.stringify({ "method": "GET", url, headers })}`);
        }
        const response = await axios.get<ArrayBuffer>(url, {
            headers,
            "responseType": "arraybuffer",
            "timeout": 15000,
            "maxContentLength": 8 * 1024 * 1024
        });
        const bytes = Buffer.from(response.data);
        const charset = String(response.headers["content-type"] ?? "").match(/charset\s*=\s*["']?([^\s;"']+)/i)?.[1];
        const encoding = charset ?? (/charset\s*=\s*["']?euc-kr/i.test(bytes.toString("ascii")) ? "euc-kr" : "utf-8");
        const result = {
            "text": iconv.decode(bytes, encoding),
            "url": response.request?.res?.responseUrl ?? url
        };
        if (options.debug) {
            options.debug(`[parse-comcigan] Response ${JSON.stringify({ "url": result.url, "status": response.status, "headers": response.headers, "body": result.text })}`);
        }
        return result;
    } catch (error) {
        if (options.debug) {
            options.debug(`[parse-comcigan] Request error ${inspect({ url, error }, { "depth": null, "maxStringLength": null, "maxArrayLength": null })}`);
        }
        throw new ComciganError("컴시간 서버에 요청하지 못했습니다.", error);
    }
}

type Metadata = {
    "search": string;
    "timetable": string;
    "decrypt"?: string;
    "render": string;
    "schools": string;
    "prefix": string;
    "original": string;
    "current": string;
    "modifiedAt": string;
};

export default class ComciganPage {
    private constructor(private readonly sandbox: ScriptSandbox, private readonly url: string, private readonly metadata: Metadata, private readonly options: ComciganOptions) {}

    public static async load(options: ComciganOptions = {}): Promise<ComciganPage> {
        const sandbox = await ScriptSandbox.create();
        try {
            const page = await request(STUDENT_URL, {}, options);
            const $ = load(page.text);
            for (const element of $("script").toArray()) {
                const src = $(element).attr("src");
                if (src && /jquery/i.test(src)) {
                    continue;
                }
                const source = src ? (await request(new URL(src, page.url).href, {}, options)).text : $(element).text();
                if (source.trim()) {
                    sandbox.run(`__sources.push(${JSON.stringify(source)});\n${source}`);
                }
            }
            const metadata = sandbox.run<Metadata>(String.raw`
                (function () {
                    var functions = Object.getOwnPropertyNames(globalThis)
                        .filter(function (key) {
                            return typeof globalThis[key] === "function";
                        })
                        .map(function (key) {
                            return {
                                "name": key,
                                "source": String(globalThis[key]),
                                "arity": globalThis[key].length
                            };
                        });
                    function find(predicate) {
                        var found = functions.find(predicate);
                        if (!found) {
                            throw new Error("지원하지 않는 컴시간 스크립트 구조입니다.");
                        }
                        return found;
                    }
                    var search = find(function (f) {
                        return /\$\.ajax\s*\(/.test(f.source) && f.arity === 2;
                    });
                    var timetable = find(function (f) {
                        return /\$\.ajax\s*\(/.test(f.source) && f.arity === 5;
                    });
                    var decrypt = functions.find(function (f) {
                        return /\.AES\.decrypt\s*\(/.test(f.source);
                    });
                    var render = find(function (f) {
                        return f.arity === 3 && /\.일과시간\s*\[/.test(f.source) && /<table/i.test(f.source) && /<\s*6\s*;/.test(f.source);
                    });
                    var schools = find(function (f) {
                        return /<a\s/i.test(f.source) && /Math\.floor/.test(f.source) && /\.append\s*\(/.test(f.source);
                    });
                    var prefix = __sources.join("\n").match(/['"](\d+_)['"]/);
                    if (!prefix) {
                        throw new Error("학교 요청 접두사를 찾을 수 없습니다.");
                    }
                    var fields = Array.from(render.source.matchAll(/\.([\p{ID_Start}][\p{ID_Continue}]*)\s*(?:\[[^\]]+\]\s*){4}/gu), function (m) {
                        return m[1];
                    });
                    fields = fields.filter(function (key, index) {
                        return fields.indexOf(key) === index;
                    });
                    if (fields.length < 2) {
                        throw new Error("시간표 필드를 찾을 수 없습니다.");
                    }
                    var modifiedAt = __sources.join("\n").match(/\.text\(\s*['"][^'"]*수정일[^'"]*['"]\s*\+\s*[\p{ID_Start}][\p{ID_Continue}]*\.([\p{ID_Start}][\p{ID_Continue}]*)/u);
                    if (!modifiedAt) {
                        throw new Error("수정 시각 필드를 찾을 수 없습니다.");
                    }
                    return {
                        "search": search.name,
                        "timetable": timetable.name,
                        "decrypt": decrypt && decrypt.name,
                        "render": render.name,
                        "schools": schools.name,
                        "prefix": prefix[1],
                        "original": fields[0],
                        "current": fields[1],
                        "modifiedAt": modifiedAt[1]
                    };
                })();
            `);
            return new ComciganPage(sandbox, page.url, metadata, options);
        } catch (error) {
            sandbox.dispose();
            throw error instanceof ComciganError ? error : new ComciganError("컴시간 페이지를 분석하지 못했습니다.", error);
        }
    }

    private async query(name: string, args: unknown[]): Promise<unknown> {
        this.sandbox.run(`__requests = []; globalThis[${JSON.stringify(name)}].apply(null, ${JSON.stringify(args)}.concat(function(){}));`);
        const requests = this.sandbox.run<
            {
                "url": string;
                "headers": Record<string, string>;
            }[]
        >("__requests");
        if (requests.length !== 1 || typeof requests[0].url !== "string") {
            throw new ComciganError("컴시간 API 요청을 확인할 수 없습니다.");
        }
        const response = await request(new URL(requests[0].url, this.url).href, requests[0].headers, this.options);
        const decoded = this.metadata.decrypt ? this.sandbox.run<string>(`globalThis[${JSON.stringify(this.metadata.decrypt)}](${JSON.stringify(response.text)})`) : response.text;
        try {
            return JSON.parse(decoded.replace(/\x00+$/, ""));
        } catch (error) {
            throw new ComciganError("컴시간 응답이 올바른 JSON이 아닙니다.", error);
        }
    }

    public async search(query: string): Promise<ComciganSchool[]> {
        const data = (await this.query(this.metadata.search, [query])) as {
            "학교검색"?: unknown[];
        };
        if (!data || !Array.isArray(data.학교검색)) {
            throw new ComciganError("학교 검색 응답이 올바르지 않습니다.");
        }
        const html = this.sandbox.run<string>(`__html = ''; globalThis[${JSON.stringify(this.metadata.schools)}](${JSON.stringify(data.학교검색)}); __html;`);
        const $ = load(`<table>${html}</table>`);
        return $("tr")
            .toArray()
            .flatMap((row) => {
                const cells = $(row).find("td");
                const link = cells.find("a[onclick]");
                if (!link.length) {
                    return [];
                }
                const code = Number(link.attr("onclick")?.match(/\(\s*(\d+)\s*\)/)?.[1]);
                if (!Number.isSafeInteger(code) || code <= 0) {
                    return [];
                }
                return [
                    {
                        code,
                        "region": cells.eq(0).text().trim(),
                        "name": link.text().trim()
                    }
                ];
            });
    }

    public async data(code: number, week: number): Promise<ComciganRawData> {
        const data = (await this.query(this.metadata.timetable, [this.metadata.prefix, code, "0", week])) as ComciganRawData;
        if (!data || typeof data !== "object" || !Object.keys(data).length) {
            throw new ComciganError("학교를 찾을 수 없습니다.");
        }
        if (!Array.isArray(data.학급수) || !Array.isArray(data.일과시간)) {
            throw new ComciganError("학교 정보 응답이 올바르지 않습니다.");
        }
        return data;
    }

    public render(data: ComciganRawData, grade: number, classNum: number, original = false): string {
        const value = original
            ? {
                  ...data,
                  [this.metadata.current]: data[this.metadata.original]
              }
            : data;
        return this.sandbox.run<string>(`globalThis[${JSON.stringify(this.metadata.render)}](${JSON.stringify(value)},${grade},${classNum})`);
    }

    public modifiedAt(data: ComciganRawData): unknown {
        return data[this.metadata.modifiedAt];
    }

    public dispose(): void {
        this.sandbox.dispose();
    }
}
