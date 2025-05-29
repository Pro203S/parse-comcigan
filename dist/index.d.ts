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
    };
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
export default class Comcigan {
    private _options;
    private _cache;
    private mSb;
    private mTh;
    private request;
    private EUC_KR_encodeURI;
    /**
     * 파서를 초기화 합니다.
     * @param options 파서의 옵션입니다.
     */
    constructor(options?: ComciganInitializeType);
    /**
     * 학교를 검색합니다.
     * 마지막 "없으면 추가 검색 하세요" 문구는 빠져서 나옵니다.
     * @param query 검색어
     * @returns 검색된 학교들
     */
    SearchSchool(query: string): Promise<ComciganSearched[]>;
    /**
     * 시간표를 가져옵니다.
     *
     * @param schoolCode
     * @param criteria
     */
    GetTimetable(schoolCode: number, criteria: "weekday" | "period", grade: number, classN: number): Promise<ComciganTimetable>;
    /**
     * 학급 목록을 가져옵니다.
     *
     * @param schoolCode 학교 코드입니다.
     * @returns (학년)-(반) 문자열이 모인 배열
     */
    GetClassList(schoolCode: number): Promise<string[]>;
}
