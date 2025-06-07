var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import axios from 'axios';
import iconv from 'iconv-lite';
import Cache from './cache.js';
//#endregion
export default class Comcigan {
    mSb(mm, m2) { if (m2 == 100) {
        return mm % m2;
    } return Math.floor(mm / m2); }
    mTh(mm, m2) { if (m2 == 100) {
        return Math.floor(mm / m2);
    } return mm % m2; }
    request(route, doNotParse) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._cache.has(route)) {
                this._options.debug ? this._options.debug(`[request] Return cache with id registered as ${route}`) : 0;
                return this._cache.get(route);
            }
            this._options.debug ? this._options.debug(`[request] Requesting to http://comci.kr:4081/${route}`) : 0;
            const r = yield axios.get(`http://comci.kr:4081/${route}`, Object.assign({}, (this._options.doNotThrow && { "validateStatus": () => true })));
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
        });
    }
    EUC_KR_encodeURI(str) {
        const buffer = iconv.encode(str, 'euc-kr');
        return Array.from(buffer)
            .map((byte) => '%' + byte.toString(16).toUpperCase().padStart(2, '0'))
            .join('');
    }
    /**
     * 파서를 초기화 합니다.
     * @param options 파서의 옵션입니다.
     */
    constructor(options) {
        this._options = {
            "cacheMs": 0,
            "doNotThrow": false
        };
        this._cache = new Cache();
        this._options = Object.assign(Object.assign({}, this._options), options);
    }
    /**
     * 학교를 검색합니다.
     * 마지막 "없으면 추가 검색 하세요" 문구는 빠져서 나옵니다.
     * @param query 검색어
     * @returns 검색된 학교들
     */
    SearchSchool(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const r = yield this.request(`sc_${this.EUC_KR_encodeURI(query)}`);
            return r.학교검색.map(v => ({
                "region": v[1],
                "name": v[2],
                "code": v[3]
            })).filter(v => v.code !== 0);
        });
    }
    /**
     * 시간표를 가져옵니다.
     *
     * @param schoolCode
     * @param criteria
     */
    GetTimetable(options) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { schoolCode, criteria, grade, classN, without8th } = options;
            const str = `36174_${schoolCode}_1_4_0_3_1.00`;
            const route = (str.substring(9) + str.substring(0, 9)).split("").reverse().join("");
            const data = yield this.request(`7813?${route}`, true);
            const [latestVersion, step1] = data.split("^");
            const edited = step1.substring(0, step1.indexOf("{"));
            const step2 = step1.slice(step1.indexOf("{"));
            const json = JSON.parse(step2.slice(0, step2.indexOf("}") + 1));
            const WEEKDAY = ["월", "화", "수", "목", "금"];
            const sep = (_a = json.분리) !== null && _a !== void 0 ? _a : 100;
            if (!json.시간표)
                return undefined;
            // 시간표[학년][반][요일][교시]
            const origin = json.시간표[grade][classN];
            const today = json.학급시간표[grade][classN];
            const toReturn = [];
            if (criteria === "period") {
                for (let weekday = 1; weekday < WEEKDAY.length + 1; weekday++) {
                    const weekdayList = [];
                    for (let period = 1; period < (without8th ? 8 : 9); period++) {
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
            }
            else {
                for (let period = 1; period < (without8th ? 8 : 9); period++) {
                    const periodList = [];
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
        });
    }
    /**
     * 학급 목록을 가져옵니다.
     *
     * @param schoolCode 학교 코드입니다.
     * @returns (학년)-(반) 문자열이 모인 배열
     */
    GetClassList(schoolCode) {
        return __awaiter(this, void 0, void 0, function* () {
            const str = `36174_${schoolCode}_1_4_0_3_1.00`;
            const route = (str.substring(9) + str.substring(0, 9)).split("").reverse().join("");
            const data = yield this.request(`7813?${route}`, true);
            const step1 = data.split("^")[1];
            const step2 = step1.slice(step1.indexOf("{"));
            const json = JSON.parse(step2.slice(0, step2.indexOf("}") + 1));
            const rawClasses = json.학급수;
            if (!rawClasses)
                return [];
            const toReturn = [];
            for (let g = 1; g < rawClasses.length; g++) {
                for (let c = 1; c < rawClasses[g] + 1; c++) {
                    toReturn.push(`${g}-${c}`);
                }
            }
            return toReturn;
        });
    }
}
//# sourceMappingURL=index.js.map