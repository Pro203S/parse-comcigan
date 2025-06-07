declare global {
    type Collection<V = any> = { [key: string]: V };

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
}

export { }