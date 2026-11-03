import ComciganError from "./error.js";
import axios from "axios";
import iconv from "iconv-lite";
import { ComciganRawData, ComciganSchool, ComciganSchoolInfo, ComciganSearchRaw, ComciganTimetable, ComciganTimetableItem } from "./types/index.js";
import dayjs from "dayjs";
axios.defaults.validateStatus = () => true;

const API_URL = "http://comci.net:4082/165823";

function splitData(dat: unknown) {
    const value = Number(String(dat ?? 0).replace(/^>/, ""));
    if (!Number.isSafeInteger(value) || value <= 0) return undefined;
    return [value % 1000, Math.floor(value / 1000)] as const;
}

function teacherName(name: string = "") {
    if ((name.includes("*") && !name.startsWith("*") && !name.endsWith("*"))
        || (name.length === 2 && name[1] === "*")) return name;
    return name.replace("*", "");
}

export default class Comcigan {
    constructor(
        public code: number
    ) { }

    private _data: ComciganRawData[] = [];

    /**
     * 학교를 검색합니다.
     * 
     * @param query 검색어
     * @returns 검색 결과
     */
    public static async search(query: string) {
        const euckr = Array.from(iconv.encode(query, "euc-kr"))
            .map(byte => '%' + byte.toString(16).toUpperCase().padStart(2, '0'))
            .join('');

        const r = await axios.get<string>(`${API_URL}?47241l${euckr}`);
        const obj: ComciganSearchRaw = JSON.parse(r.data.substring(0, r.data.lastIndexOf("}") + 1));
        return obj.학교검색
            .filter(v => v[3] !== 0)
            .map(v => ({
                "code": v[3],
                "region": v[1],
                "name": v[2]
            } satisfies ComciganSchool));
    }

    private async _getdata(index?: number) {
        const idx = index ?? 1;
        if (this._data[idx]) return this._data[idx];
        const route = btoa(`107225_${this.code}_0_${idx}`);

        const r = await axios.get<string>(`${API_URL}?${route}`);
        if (r.data.startsWith("{}")) throw new ComciganError(`학교 정보를 가져오는데 실패했어요. 학교 코드가 올바른지 확인해주세요.`);
        const obj: ComciganRawData = JSON.parse(r.data.substring(0, r.data.lastIndexOf("}") + 1));
        this._data[idx] = obj;
    }

    /**
     * 학교의 정보를 가져옵니다.
     * 
     * @returns 학교의 정보
     */
    public async schoolInfo() {
        await this._getdata();

        const data = this._data[1];

        return {
            "changedAt": dayjs(data.자료108, "YYYY-MM-DD HH:mm:ss").toDate(),
            "classes": data.학급수.slice(1).map((count, index) => count - (data.가상학급수?.[index + 1] ?? 0)),
            "times": data.일과시간.map(v => ({
                "number": Number(v.slice(0, 1)),
                "start": v.slice(2, 7) as `${number}:${number}`,
            })),
            "code": this.code
        } satisfies ComciganSchoolInfo;
    }

    /**
     * 시간표를 조회합니다.
     * 
     * @param options 시간표 옵션
     * @returns 시간표
     */
    public async timetable(options: {
        "grade": number,
        "classNum": number,
        "week"?: number
    }) {
        const { grade, classNum, week } = options;
        if (!grade || !classNum) throw new ComciganError("학년 (grade), 반 (classNum)을 제공해주세요.");
        await this._getdata(week);
        const data = this._data[week ?? 1];

        const toReturn: ComciganTimetable = [];

        const division = data.분리 ?? 100;

        for (let day = 1; day <= 5; day++) {
            const dayItems: ComciganTimetableItem[] = [];

            for (let time = 1; time <= 8; time++) {
                const current = data.자료158?.[grade]?.[classNum]?.[day]?.[time];
                const now = splitData(current);
                if (!now || now[0] === 0) continue;

                const subject = String(data.자료123[now[1] % division] ?? "");
                const teacher = teacherName(data.자료119[now[0]]);
                const room = data.강의실 === 1
                    ? data.자료150?.[grade]?.[classNum]?.[day]?.[time]
                    : undefined;
                const roomParts = typeof room === "string" ? room.split("_") : [];
                const classRoom = Number(roomParts[0]) > 0 ? roomParts[1] : undefined;

                const original = data.자료167?.[grade]?.[classNum]?.[day]?.[time];
                const origin = splitData(original);
                const changed = data.변경알림 === 1
                    ? String(current).startsWith(">")
                    : String(current) !== String(original);

                dayItems.push({
                    subject,
                    teacher,
                    classRoom,
                    original: changed && origin && origin[0] > 0 ? {
                        subject: String(data.자료123[origin[1] % division] ?? ""),
                        teacher: teacherName(data.자료119[origin[0]]),
                    } : undefined,
                });
            }

            toReturn[day - 1] = {
                "total": dayItems.length,
                "items": dayItems
            };
        }

        return toReturn;
    }
}
