import ComciganError from "./error.js";
import axios from "axios";
import iconv from "iconv-lite";
import { ComciganSchool, ComciganSearchRaw } from "./types/index.js";

export default class Comcigan {
    constructor() {

    }

    public static async search(query: string) {
        const euckr = Array.from(iconv.encode(query, "euc-kr"))
            .map(byte => '%' + byte.toString(16).toUpperCase().padStart(2, '0'))
            .join('');

        const r = await axios.get<string>("http://comci.net:4082/36179?17384l" + euckr, {
            "validateStatus": status => {
                if (status !== 200) throw new ComciganError(status, `${query}의 검색에 실패했습니다.`);
                return true;
            }
        });

        const obj: ComciganSearchRaw = JSON.parse(r.data.substring(0, r.data.lastIndexOf("}") + 1));
        return obj.학교검색
            .filter(v => v[3] !== 0)
            .map(v => ({
                "code": v[3],
                "region": v[1],
                "name": v[2]
            } satisfies ComciganSchool));
    }
}