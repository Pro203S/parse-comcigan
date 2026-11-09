import { load } from "cheerio";
import ComciganPage from "./loader.js";
import ComciganError from "./error.js";
import type { ComciganSchoolInfo, ComciganTimetable, ComciganTimetableItem, ComciganTimetableOptions, ComciganTimetableResult } from "./types/index.js";

export { ComciganError };
export type * from "./types/index.js";

async function withPage<T>(operation: (page: ComciganPage) => Promise<T>): Promise<T> {
    let page: ComciganPage | undefined;
    try {
        page = await ComciganPage.load();
        return await operation(page);
    } catch (error) {
        throw error instanceof ComciganError ? error : new ComciganError("컴시간 정보를 처리하지 못했습니다.", error);
    } finally {
        page?.dispose();
    }
}

function lessons(html: string): {
    "item"?: ComciganTimetableItem;
    "changed": boolean;
}[][] {
    const $ = load(html);
    return $("tr")
        .toArray()
        .filter((row) => $(row).children("td.교시").length && $(row).children("td").length === 6)
        .map((row) => $(row)
            .children("td")
            .slice(1)
            .toArray()
            .map((cell) => {
                const parts = $(cell).html()?.split(/<br\s*\/?\s*>/i).map((part) => load(part).text().trim()) ?? [];
                return {
                    "changed": $(cell).hasClass("변경"),
                    "item": parts.length >= 2 && parts[0]
                        ? {
                            "subject": parts[0].replace(/^[A-Z]_/, ""),
                            "teacher": parts[1],
                            "classRoom": parts[2] || undefined
                        }
                        : undefined
                };
            })
        );
}

export default class Comcigan {
    /**
     * 새 컴시간 인스턴스를 생성합니다.
     * 
     * @param code 학교 코드 (Comcigan.search로 검색 가능)
     */
    constructor(public code: number) { }

    /**
     * 학교를 검색합니다.  
     * 
     * @param query 검색어
     * @returns 컴시간 학교 리스트
     */
    public static async search(query: string) {
        if (typeof query !== "string" || !query.trim()) {
            throw new ComciganError("학교 검색어를 입력해주세요.");
        }
        return withPage((page) => page.search(query.trim()));
    }

    /**
     * 학교 정보를 가져옵니다.  
     * 
     * @returns 학교 정보
     */
    public async schoolInfo(): Promise<ComciganSchoolInfo> {
        return withPage(async (page) => {
            const data = await page.data(this.code, 1);
            const changedAt = new Date(String(page.modifiedAt(data)));
            if (!Number.isFinite(changedAt.getTime())) {
                throw new ComciganError("학교 정보의 수정 시각이 올바르지 않습니다.");
            }
            return {
                "code": this.code,
                changedAt,
                "classes": data.학급수.slice(1).map((count, index) => count - (data.가상학급수?.[index + 1] ?? 0)),
                "times": data.일과시간.map((value) => {
                    const match = value.match(/^(\d+)\D+(\d{1,2}:\d{2})/);
                    if (!match) {
                        throw new ComciganError("일과 시간을 해석할 수 없습니다.");
                    }
                    return {
                        "number": Number(match[1]),
                        "start": match[2] as `${number}:${number}`
                    };
                })
            };
        });
    }

    /**
     * 시간표를 가져옵니다.
     * 
     * @param options 학년, 반, 주차
     * @returns 시간표 데이터
     */
    public async timetable(options: ComciganTimetableOptions): Promise<ComciganTimetableResult> {
        const { grade, classNum, week = 1 } = options ?? {};
        return withPage(async (page) => {
            const data = await page.data(this.code, week);
            const classes = data.학급수[grade] - (data.가상학급수?.[grade] ?? 0);
            if (!Number.isFinite(classes) || classNum > classes) {
                throw new ComciganError("해당 학년 또는 반을 찾을 수 없습니다.");
            }
            const current = lessons(page.render(data, grade, classNum));
            const original = lessons(page.render(data, grade, classNum, true));
            if (!current.length) {
                throw new ComciganError("시간표를 해석할 수 없습니다.");
            }
            const times = data.일과시간.map((value) => {
                const match = value.match(/^\d+\s*\(\s*(\d{1,2}:\d{2})\s*\)/);
                if (!match) {
                    throw new ComciganError("일과 시간을 해석할 수 없습니다.");
                }
                return match[1];
            });
            const timetable: ComciganTimetable = Array.from({ "length": 5 }, (_, day) => {
                const items = current.flatMap((row, period) => {
                    const entry = row[day];
                    if (!entry?.item) {
                        return [];
                    }
                    const before = original[period]?.[day]?.item;
                    return [
                        {
                            ...entry.item,
                            "original":
                                entry.changed && before
                                    ? {
                                        "subject": before.subject,
                                        "teacher": before.teacher
                                    }
                                    : undefined
                        }
                    ];
                });
                return {
                    "total": items.length,
                    items
                };
            }
            );
            return {
                timetable,
                times
            };
        });
    }
}
