import ComciganError from "./error.js";
import axios from "axios";
import iconv from "iconv-lite";
import { ComciganRawData, ComciganSchool, ComciganSchoolInfo, ComciganSearchRaw, ComciganTimetable, ComciganTimetableItem } from "./types/index.js";
import dayjs from "dayjs";
axios.defaults.validateStatus = () => true;

function splitData(dat: any) {
    const d = String(dat).match(/\d{1,3}(?=(\d{3})+(?!\d))|\d{1,3}$/g);
    if (!d) return -1;
    return d.reverse().map(Number);
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

        const r = await axios.get<string>("http://comci.net:4082/36179?17384l" + euckr);
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
        const route = btoa(`73629_${this.code}_0_${idx}`);

        const r = await axios.get<string>(`http://comci.net:4082/36179?${route}`);
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
            "changedAt": dayjs(data.자료244, "YYYY-MM-DD HH:mm:ss").toDate(),
            "classes": data.학급수.slice(1),
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

        // 자료481: 현재 데이터
        // 자료147: 원본 데이터
        // 자료446: 선생님
        // 자료492: 과목

        for (let day = 1; day <= 5; day++) {
            const dayItems: ComciganTimetableItem[] = [];

            for (let time = 1; time <= 8; time++) {
                const now = splitData(data.자료481[grade][classNum][day][time]);
                if (now === -1) continue;

                const subject = data.자료492[now[1]];
                const teacher = data.자료446[now[0]];
                const classRoom = data.자료245[grade][classNum][day][time];
                const classRoomAvailable = classRoom !== undefined && classRoom !== "";

                const origin = splitData(data.자료147?.[grade]?.[classNum]?.[day]?.[time]);
                if (origin !== -1) {
                    const newSubject = data.자료492[origin[1]];
                    const newTeacher = data.자료446[origin[0]];

                    dayItems.push({
                        subject,
                        teacher,
                        "classRoom": classRoomAvailable ? (classRoom as string).split("_")[1] : undefined,
                        "original": newSubject === subject && newTeacher === teacher ? undefined : {
                            "subject": newSubject,
                            "teacher": newTeacher
                        }
                    });
                    continue;
                }

                dayItems.push({
                    subject,
                    teacher,
                    "classRoom": classRoomAvailable ? classRoom : undefined
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