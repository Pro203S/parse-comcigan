import Comcigan from 'parse-comcigan';

(async () => {
    // 학교를 검색합니다.
    await Comcigan.search("컴시간");

    // 컴시간 인스턴스를 만듭니다.
    const comci = new Comcigan(24966);

    // 시간표를 가져옵니다.
    await comci.timetable({ "grade": 1, "classNum": 1 });
})();