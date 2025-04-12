# parse-comcigan

컴시간을 파싱하는 라이브러리입니다.  
안드로이드 컴시간알리미 앱에서 파싱합니다.  
아직 학생 시간표밖에 지원하지 않습니다.  

## 경고
본 라이브러리는 **비공식적**으로 컴시간알리미의 데이터를 파싱합니다.  
상업적으로 사용하다 문제가 발생할경우, **제작자는 책임을 지지 않습니다.**

## 설치
```npm install parse-comcigan```

## 개발

### Comcigan

Comcigan 클래스의 인스턴스를 생성하여 사용합니다.  
인스턴스를 생성할 때 옵션을 지정할 수 있습니다.

|옵션|타입|기본값|설명|
|------|------|------|-----------|
|cacheMs|number|0|캐시될 시간(밀리초)입니다. 0일때 캐시를 비활성화합니다.|
|doNotThrow|boolean|true|[Axios](https://axios-http.com/)에서 validateStatus를 항상 true로 반환할 지에 대한 여부입니다.|
|debug|(msg: string) => any|undefined|디버그 메시지를 처리하는 콜백입니다. 이 콜백은 주로 컴시간과 통신할 때 호출됩니다.|

```typescript
import Comcigan from 'parse-comcigan';

const comci = new Comcigan({
    "cacheMs": 10000, // 10초동안 캐시됩니다.
    "doNotThrow": true, // true일때, status가 4 또는 5로 시작하면 throw 됩니다.
    "debug": (msg) => console.log(msg) // 모듈에서 디버그 메시지를 보내면 콘솔에 출력합니다.
});
```
---
### SearchSchool

학교를 검색합니다.  
마지막 "없으면 추가 검색 하세요." 문구는 자동으로 빠져서 나옵니다.  
당연하지만 컴시간을 사용하는 학교만 검색됩니다.  

|파라메터|타입|필수|설명|
|------|------|------|-----------|
|query|string|Yes|검색어|

```typescript
comci.SearchSchool("서울").then(data => {
    console.log(data);
});
```

다음을 Promise 형태로 리턴합니다.  
|키|타입|설명|
|-----|----|-----|
|region|string|학교의 지역|
|name|string|학교 이름|
|code|number|학교 코드|

---
### GetTimetable

시간표를 가져옵니다.  

|파라메터|타입|필수|설명|
|------|------|------|-----------|
|schoolCode|number|Yes|학교 코드|
|criteria|"weekday" or "period"|Yes|리스트 반환을 어떻게 할지 여부입니다.|
|grade|number|Yes|학년|
|classN|number|Yes|반|

```typescript
comci.GetTimetable(96211, "weekday", 3, 5).then(data => {
    console.log(data[0][5]); // [요일][교시] 월요일 5교시
});
comci.GetTimetable(96211, "period", 3, 5).then(data => {
    console.log(data[5][0]); // [교시][요일] 월요일 5교시
});
```

다음을 Promise 형태로 리턴합니다.  
|키|타입|설명|
|-----|----|-----|
|latestVersion|string|컴시간 앱 최신버전|
|changed|string|수정된 날짜 시간|
|timetable|[ComciganTimetableObject](#ComciganTimetableObject)[][]|시간표|

---
### GetClassList

학급 리스트를 가져옵니다.  

|파라메터|타입|필수|설명|
|------|------|------|-----------|
|schoolCode|number|Yes|학교 코드|

```typescript
comci.GetClassList(96211).then(data => {
    console.log(data[0]); // 1-1
});
```

리턴 타입: ```Promise<string>```

## 타입

### ComciganTimetableObject

|키|타입|설명|필수|
|-----|----|-----|-----|
|subject|string|과목|Yes|
|changed|string|교사|Yes|
|original|여기서 original만 빠진 오브젝트|원래 시간표|No|

## 업데이트 로그
### 0.0.2
- package.json 수정
### 0.0.1
- 첫번째 릴리즈