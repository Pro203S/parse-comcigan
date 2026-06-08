export type ComciganSchool = {
    /** 지역 */
    "region": string,
    /** 이름 */
    "name": string,
    /** 코드 */
    "code": number
};

export type ComciganSearchRaw = {
    "학교검색": [number, string, string, number][];
};

export type ComciganTimetableItem = {
    /** 과목 */
    "subject": string,
    /** 교사 */
    "teacher": string,
    /** 특별실 */
    "classRoom"?: string,
    /** 원래 시간표 */
    "original"?: Omit<ComciganTimetableItem, "original" | "classRoom">,
}

export type ComciganTimetable = {
    /** 총 교시 수 */
    "total": number,
    /** 시간표 아이템 */
    "items": ComciganTimetableItem[]
}[];

export type ComciganSchoolInfo = {
    /** 일과시간 */
    "times": {
        /** 교시 */
        "number": number,
        /** 시:분 */
        "start": `${number}:${number}`
    }[],
    /** 학년 마다 학급 수 */
    "classes": number[],
    /** 시간표 변경 날짜 */
    "changedAt": Date,
    /** 학교 코드 */
    "code": number
};

export type ComciganClassInfo = {

};

export interface ComciganRawData {
    "교사수": number;
    "학급수": number[];
    "요일별시수": number[][];

    "전일제": number[];

    "버젼": string;
    "동시수업수": number;

    "담임": number[][];
    "가상학급수": number[];
    "전체학년": number[];

    "특별실수": number;
    "열람제한일": string;

    "학기시작일자": string;
    "학교명": string;
    "지역명": string;
    "학년도": number;

    "분리": number;
    "강의실": number;
    "소규모학급": number;
    "변경알림": number;

    "시작일": string;

    "일과시간": string[];

    "일자자료": [number, string][];

    "오늘r": number;

    "자료147": any;
    "자료244": string;
    "자료245": any;
    "자료446": string[];
    "자료481": any;
    "자료492": any;
    "자료542": any;

    "동시그룹": (number | number[])[];
}