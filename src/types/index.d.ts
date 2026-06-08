export type ComciganSchool = {
    "region": string,
    "name": string,
    "code": number
};

export type ComciganSearchRaw = {
    "학교검색": [number, string, string, number][];
};

export type ComciganTimetableItem = {
    "subject": string,
    "teacher": string,
    "classRoom"?: string,
    "original"?: Omit<ComciganTimetableItem, "original">,
}

export type ComciganTimetable = [
    ComciganTimetableItem[], // 월요일
    ComciganTimetableItem[], // 화요일
    ComciganTimetableItem[], // 수요일
    ComciganTimetableItem[], // 목요일
    ComciganTimetableItem[]  // 금요일
]

type NestedValue =
    | string
    | number
    | NestedValue[]
    | { [key: string]: NestedValue };

export interface ComciganRawData {
    "교사수": number;
    "자료446": string[];
    "학급수": number[];
    "요일별시수": number[][];

    "자료492": (string | number)[];
    "자료481": NestedValue[];
    "전일제": number[];

    "버젼": string;
    "동시수업수": number;

    "담임": number[][];
    "가상학급수": number[];
    "전체학년": number[];

    "특별실수": number;
    "열람제한일": string;
    "자료244": string;

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

    "자료147": NestedValue[];
    "자료542": NestedValue[];
    "자료245": NestedValue[];

    "동시그룹": (number | number[])[];
}