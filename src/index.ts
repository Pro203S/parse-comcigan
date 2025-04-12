import axios from 'axios';
import iconv from 'iconv-lite';

class Cache {
    private _cacheStorage: {
        [id: string]: {
            "timeout": NodeJS.Timeout;
            "data": any;
        }
    } = {};

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

//#region 내부 타입
type RawComciganSearched = {
    "학교검색": [
        number,
        string,
        string,
        number
    ][];
};
type RawComciganTimetable = {
    교사수: number;
    성명: string[];
    학급수: number[];
    요일별시수: number[][];
    과목명: any[];
    시간표: any;
    전일제: number[];
    버젼: string;
    동시수업수: number;
    담임: number[][];
    가상학급수: number[];
    특별실수: number;
    열람제한일: string;
    저장일: string;
    학기시작일자: string;
    학교명: string;
    지역명: string;
    학년도: number;
    분리?: number;
    강의실: number;
    시작일: string;
    일과시간: string[];
    일자자료: [number, string][];
    오늘r: number;
    학급시간표: any;
    교사시간표: any[];
    강의실시간표: any;
    동시그룹: number[][];
    컴시간?: string;
};
//#endregion

//#region 외부 타입
export interface ComciganInitializeType {
    /**
     * 이 기간동안 컴시간과 통신한 데이터가 캐시됩니다.  
     *   
     * 기본값은 0ms이며, 0ms일때는 캐시를 하지 않습니다.
     */
    cacheMs?: number;
    /**
     * axios에서 요청을 보내고 status가 오류 status일 때 throw할 지 여부입니다.  
     * 만약 false일 때 요청에 status가 오류 status면 그 타입에서 빈 값을 리턴합니다.
     *   
     * 기본값은 false입니다.
     */
    doNotThrow?: boolean;
    /**
     * 디버그 메시지를 파라메터로 받습니다.  
     *   
     * 기본값은 없습니다.
     */
    debug?: (msg: string) => any;
}
export type ComciganSearched = {
    /**
     * 학교의 지역입니다.
     */
    region: string;
    /**
     * 학교의 이름입니다.
     */
    name: string;
    /**
     * 학교의 코드입니다.
     */
    code: number;
};
export type ComciganTimetableObject = {
    /**
     * 과목입니다.
     */
    subject: string;
    /**
     * 교사 성명입니다.
     */
    teacher: string;
    /**
     * 만약 변경되었을때 이 값이 주어집니다.
     */
    original?: {
        /**
         * 과목입니다.
         */
        subject: string;
        /**
         * 교사 성명입니다.
         */
        teacher: string;
    }
};
export type ComciganTimetable = {
    /**
     * 컴시간알리미 앱의 최신 버전입니다.
     */
    latestVersion: string;
    /**
     * 수정일입니다.
     */
    changed: string;
    /**
     * 시간표입니다.
     */
    timetable: ComciganTimetableObject[][];
};
//#endregion

export default class Comcigan {
    private _options: ComciganInitializeType = {
        "cacheMs": 0,
        "doNotThrow": false
    };
    private _cache = new Cache();

    private mSb(mm: number, m2: number) { if (m2 == 100) { return mm % m2; } return Math.floor(mm / m2); }
    private mTh(mm: number, m2: number) { if (m2 == 100) { return Math.floor(mm / m2); } return mm % m2; }

    private async request<T = any>(route: string, doNotParse?: boolean): Promise<T> {
        if (this._cache.has(route)) {
            this._options.debug ? this._options.debug(`[request] Return cache with id registered as ${route}`) : 0;
            return this._cache.get(route);
        }

        this._options.debug ? this._options.debug(`[request] Requesting to http://comci.kr:4081/${route}`) : 0;
        const r = await axios.get<any>(`http://comci.kr:4081/${route}`, {
            ...(this._options.doNotThrow && { "validateStatus": () => true })
        });

        if (doNotParse) {
            if (this._options.cacheMs && this._options.cacheMs !== 0) {
                this._options.debug ? this._options.debug(`[request] Registered cache with id ${route}`) : 0;
                this._cache.register(route, r.data, this._options.cacheMs);
            }
            return r.data;
        }

        const data = JSON.parse(r.data.slice(0, r.data.indexOf("}") + 1));
        if (this._options.cacheMs && this._options.cacheMs !== 0) {
            this._options.debug ? this._options.debug(`[request] Registered cache with id ${route}`) : 0;
            this._cache.register(route, data, this._options.cacheMs);
        }
        return data;
    }

    private EUC_KR_encodeURI(str: string): string {
        const buffer = iconv.encode(str, 'euc-kr');
        return Array.from(buffer)
            .map((byte) => '%' + byte.toString(16).toUpperCase().padStart(2, '0'))
            .join('');
    }

    /**
     * 파서를 초기화 합니다.
     * @param options 파서의 옵션입니다.
     */
    constructor(options?: ComciganInitializeType) {
        this._options = {
            ...this._options,
            ...options
        };
    }

    /**
     * 학교를 검색합니다.  
     * 마지막 "없으면 추가 검색 하세요" 문구는 빠져서 나옵니다.  
     * @param query 검색어
     * @returns 검색된 학교들
     */
    public async SearchSchool(query: string): Promise<ComciganSearched[]> {
        const r = await this.request<RawComciganSearched>(`sc_${this.EUC_KR_encodeURI(query)}`);

        return r.학교검색.map(v => ({
            "region": v[1],
            "name": v[2],
            "code": v[3]
        })).filter(v => v.code !== 0);
    }

    /**
     * 시간표를 가져옵니다.
     * 
     * @param schoolCode 
     * @param criteria 
     */
    public async GetTimetable(schoolCode: number, criteria: "weekday" | "period", grade: number, classN: number): Promise<ComciganTimetable> {
        const str = `36174_${schoolCode}_1_4_0_3_1.00`;
        const route = (str.substring(9) + str.substring(0, 9)).split("").reverse().join("");
        const data = await this.request<string>(`7813?${route}`, true);

        const [latestVersion, step1] = data.split("^");
        const edited = step1.substring(0, step1.indexOf("{"));
        const step2 = step1.slice(step1.indexOf("{"));
        const json: RawComciganTimetable = JSON.parse(step2.slice(0, step2.indexOf("}") + 1));

        const WEEKDAY = ["월", "화", "수", "목", "금"];
        const sep = json.분리 ?? 100;

        // 시간표[학년][반][요일][교시]
        const origin = json.시간표[grade][classN];
        const today = json.학급시간표[grade][classN];

        const toReturn: ComciganTimetableObject[][] = [];

        if (criteria === "period") {
            for (let weekday = 1; weekday < WEEKDAY.length + 1; weekday++) {
                const weekdayList: ComciganTimetableObject[] = [];
                for (let period = 1; period < 9; period++) {
                    const o = origin[weekday][period];
                    const t = today[weekday][period];

                    if (!o || !t) {
                        weekdayList.push({
                            "subject": "-",
                            "teacher": "-"
                        });
                        continue;
                    }

                    const originSubject = json.과목명[this.mSb(o, sep) % sep];
                    const originTeacher = json.성명[this.mTh(o, sep) % sep];

                    if (o === t) {
                        weekdayList.push({
                            "subject": originSubject,
                            "teacher": originTeacher
                        });
                        continue;
                    }

                    const changedSubject = json.과목명[this.mSb(t, sep) % sep];
                    const changedTeacher = json.성명[this.mTh(t, sep) % sep];

                    weekdayList.push({
                        "subject": originSubject,
                        "teacher": originTeacher,
                        "original": {
                            "subject": changedSubject,
                            "teacher": changedTeacher
                        }
                    });
                }
                toReturn.push(weekdayList);
            }
        } else {
            for (let period = 1; period < 9; period++) {
                const periodList: ComciganTimetableObject[] = [];
                for (let weekday = 1; weekday < WEEKDAY.length + 1; weekday++) {
                    const o = origin[weekday][period];
                    const t = today[weekday][period];

                    if (!o || !t) {
                        periodList.push({
                            "subject": "-",
                            "teacher": "-"
                        });
                        continue;
                    }

                    const originSubject = json.과목명[this.mSb(o, sep) % sep];
                    const originTeacher = json.성명[this.mTh(o, sep) % sep];

                    if (o === t) {
                        periodList.push({
                            "subject": originSubject,
                            "teacher": originTeacher
                        });
                        continue;
                    }

                    const changedSubject = json.과목명[this.mSb(t, sep) % sep];
                    const changedTeacher = json.성명[this.mTh(t, sep) % sep];

                    periodList.push({
                        "subject": originSubject,
                        "teacher": originTeacher,
                        "original": {
                            "subject": changedSubject,
                            "teacher": changedTeacher
                        }
                    });
                }
                toReturn.push(periodList);
            }
        }

        return {
            "changed": edited,
            latestVersion,
            "timetable": toReturn
        };
    }

    /**
     * 학급 목록을 가져옵니다.
     * 
     * @param schoolCode 학교 코드입니다.
     * @returns (학년)-(반) 문자열이 모인 배열
     */
    public async GetClassList(schoolCode: number): Promise<string[]> {
        const str = `36174_${schoolCode}_1_4_0_3_1.00`;
        const route = (str.substring(9) + str.substring(0, 9)).split("").reverse().join("");
        const data = await this.request<string>(`7813?${route}`, true);

        const step1 = data.split("^")[1];
        const step2 = step1.slice(step1.indexOf("{"));
        const json: RawComciganTimetable = JSON.parse(step2.slice(0, step2.indexOf("}") + 1));
        const rawClasses = json.학급수;
        
        const toReturn: string[] = [];
        
        for (let g = 1; g < rawClasses.length; g++) {
            for (let c = 1; c < rawClasses[g] + 1; c++) {
                toReturn.push(`${g}-${c}`);
            }
        }

        return toReturn;
    }
}