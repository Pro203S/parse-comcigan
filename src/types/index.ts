export type ComciganSchool = {
    "code": number;
    "region": string;
    "name": string;
};

export type ComciganTimetableItem = {
    "subject": string;
    "teacher": string;
    "classRoom"?: string;
    "original"?: {
        "subject": string;
        "teacher": string;
    };
};

export type ComciganTimetable = {
    "total": number;
    "items": ComciganTimetableItem[];
}[];

export type ComciganTimetableResult = {
    "timetable": ComciganTimetable;
    "times": string[];
};

export type ComciganSchoolInfo = {
    "code": number;
    "changedAt": Date;
    "classes": number[];
    "times": {
        "number": number;
        "start": `${number}:${number}`;
    }[];
};

export type ComciganTimetableOptions = {
    "grade": number;
    "classNum": number;
    "week"?: number;
};

export type ComciganSearchRaw = {
    "학교검색": [number, string, string, ...number[]][];
};

export type ComciganRawData = {
    "학급수": number[];
    "가상학급수"?: number[];
    "일과시간": string[];
    [key: string]: unknown;
};
