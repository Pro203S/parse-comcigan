import ComciganError from "./error.js";
import axios from "axios";
import iconv from "iconv-lite";
import { ComciganRawData, ComciganSchool, ComciganSearchRaw } from "./types/index.js";
axios.defaults.validateStatus = () => true;

export default class Comcigan {
    constructor(
        public code: number
    ) { }

    private _data?: ComciganRawData;

    /**
     * 학교를 검색합니다.
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

    private async _getdata() {
        if (this._data) return;

        const route = btoa(`73629_${this.code}_0_1`);

        const r = await axios.get<string>(`http://comci.net:4082/36179?${route}`);

        if (r.data.startsWith("{}")) throw new ComciganError(`학교 정보를 가져오는데 실패했어요. 학교 코드가 올바른지 확인해주세요.`);

        const obj: ComciganRawData = JSON.parse(r.data.substring(0, r.data.lastIndexOf("}") + 1));

        this._data = obj;
    }

    public async schoolInfo() {

    }

    public async timetable(grade: number, classNum: number) {
        await this._getdata();


    }
}