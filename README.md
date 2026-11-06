# parse-comcigan

컴시간을 파싱하는 라이브러리입니다.  
아직 학생 시간표밖에 지원하지 않습니다.  

## 경고

본 라이브러리는 **비공식적**으로 컴시간알리미의 데이터를 파싱합니다.  
이 라이브러리를 사용하다가 문제가 발생할경우, **제작자는 책임을 지지 않습니다.**  

## 설치

```npm install parse-comcigan```

## 사용법

## 1. 학교 검색하기

학교를 검색하려면 먼저 `Comcigan` 클래스를 가져오신 후, `search` 메서드를 호출하시면 됩니다.  

반환:
|이름|타입|설명|
|-|-|-|
|code|number|학교 코드|
|region|string|지역|
|name|string|이름|
의 배열

### 예시 코드

```typescript
// Comcigan 가져오기
import Comcigan from 'parse-comcigan';

// 학교 검색
const schools = await Comcigan.search("서울");

for (const school of schools) {
    console.log();
    console.log(`코드: ${school.code}`);
    console.log(`이름: ${school.name}`);
    console.log(`지역: ${school.region}`);
}
```

## 2. 컴시간 인스턴스 생성하기

컴시간 인스턴스를 생성해 학교의 여러 정보를 가져올 수 있습니다.  
`new Comcigan(code)`로 컴시간 인스턴스를 생성할 수 있습니다.  

### 예시 코드

```typescript
import Comcigan from 'parse-comcigan';
import readline from 'readline';

const rl = readline.createInterface({
    "input": process.stdin,
    "output": process.stdout
});

(async () => {
    // 검색어 입력
    const answer = await new Promise<string>(r => rl.question("학교 이름을 입력해주세요: ", r));
    rl.close();
    
    // 학교 검색하기
    const school = (await Comcigan.search(answer))[0];

    console.log(`검색된 학교:`);
    console.log(`- 이름: ${school.name}`);
    console.log(`- 지역: ${school.region}`);
    console.log();

    // 컴시간 인스턴스 생성
    const comci = new Comcigan(school.code);

    // 시간표 조회
    console.log(await comci.timetable({
        "grade": 1,
        "classNum": 6
    }));
})();
```

## 3. 시간표 가져오기

위에서 생성한 컴시간 인스턴스로 학교의 시간표를 조회할 수 있습니다.  

### 예시 코드

```typescript
import Comcigan from 'parse-comcigan';

(async () => {
    // 컴시간 인스턴스 생성
    const comci = new Comcigan(24966);

    // 시간표 조회
    console.log(await comci.timetable({
        "grade": 1,
        "classNum": 6
    }));
})();
```

## 4. 학교 정보 가져오기

위에서 생성한 컴시간 인스턴스로 학교의 여러 정보를 가져올 수 있습니다.  

### 예시 코드

```typescript
import Comcigan from 'parse-comcigan';

(async () => {
    // 컴시간 인스턴스 생성
    const comci = new Comcigan(24966);

    // 학교 정보 조회
    console.log(await comci.schoolInfo());
})();
```

## 업데이트 로그

### 1.3.0

- 컴시간 API 구조 변경에 따른 픽스

### 1.2.0

- 현재 컴시간 API 경로와 데이터 필드명 반영
- 현재 시간표와 원본 시간표 반환 순서 수정
- 변경 표시, 과목 코드 분리, 교사명과 강의실 표시 처리 반영
- 가상 학급을 제외한 학급 수 반환
- 배포 패키지의 타입 선언 경로 수정

### 1.1.2

- 원본 데이터와 현재 데이터가 다른 버그 수정

### 1.1.1

- 외부에서 tsconfig가 제대로 인식되지 않는 버그 수정

### 1.1.0

- 타입 import 가능하게

### 1.0.0

- 갈아엎기

### 0.3.0

- 다음 주 시간표 보기
- 디버그 메시지 수정

### 0.2.0

- 버전 넘버링 수정
- 앱 버전 수정 기능 추가
- 시간표 버그 수정

### 0.0.6

- 모듈이 불러와지지 않던 버그 수정

### 0.0.5

- 문서의 많은 오류 수정
- 8교시 제외 추가

### 0.0.4

- 모듈이 불러와지지 않던 버그 수정

### 0.0.3

- undefined 참조 버그 수정
- 문서 잘못되어있던 버그 수정

### 0.0.2

- package.json 수정

### 0.0.1

- 첫번째 릴리즈
