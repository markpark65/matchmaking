//예시 코드
const db = {
    // 사용자 정보 (학생, 강사, 관리자)
    users: {
        "student1": { pw: "1234", name: "김학생", type: "student", subjects: [], phoneNumber: "010-1234-5678" },
        "teacher1": { pw: "1234", name: "최강사", type: "teacher", subjects: ["math_g12", "eng_g12"], career: "서울대 수학과 졸업, 5년 경력", availableTime: "주말 오후", phoneNumber: "010-9876-5432" },
        "teacher2": { pw: "1234", name: "박강사", type: "teacher", subjects: ["ap_econ", "ib_math"], career: "AP/IB 전문 강사, 8년 경력", availableTime: "평일 저녁", phoneNumber: "010-1111-2222" },
        "admin": { pw: "admin", name: "관리자", type: "admin" }
    },
    // 과외 요청 정보
    requests: [],
    // 매칭 정보
    matches: [],
    // 과목 정보
    subjects: [
        { id: "math_g12", name: "고3 수학" },
        { id: "eng_g12", name: "고3 영어" },
        { id: "kor_g12", name: "고3 국어" },
        { id: "sci_g12", name: "고3 과탐" },
        { id: "ap_econ", name: "AP 경제학" },
        { id: "ib_math", name: "IB 수학" },
        { id: "sat_math", name: "SAT 수학" },
        { id: "elem_kor", name: "유아/초등 국어" },
        { id: "elem_math", name: "유아/초등 수학" },
        { id: "elem_eng", name: "유아/초등 영어" }
    ],
    // 테스트 문제 (임시)
    testQuestions: {
        "math_g12": [
            { question: "lim(x->2) (x^2 - 4)/(x - 2)의 값은?", options: ["2", "4", "0", "정의되지 않음"], answer: "4", level: "중급" },
            { question: "미분 가능한 함수 f(x)에 대해 f'(x) = 2x + 3 이고 f(0) = 1 일 때, f(1)의 값은?", options: ["3", "4", "5", "6"], answer: "5", level: "고급" }
        ],
        "eng_g12": [
            { question: "다음 문장의 빈칸에 들어갈 가장 적절한 단어는? 'She is very good ___ languages.'", options: ["at", "in", "on", "for"], answer: "at", level: "초급" }
        ]
    }
};

// 모든 과목을 가져오는 함수 (나중에 백엔드 API가 됨)
function getAllSubjects() {
    return db.subjects;
}

// 특정 과목의 테스트 문제를 가져오는 함수
function getTestQuestions(subjectId, level) {
    if (!db.testQuestions[subjectId]) return [];
    if (!level) return db.testQuestions[subjectId]; // 난이도 지정 없으면 모두
    return db.testQuestions[subjectId].filter(q => q.level === level);
}

// 사용자 로그인 (백엔드 API 시뮬레이션)
function loginUser(username, password) {
    if (db.users[username] && db.users[username].pw === password) {
        return { success: true, user: { id: username, name: db.users[username].name, type: db.users[username].type } };
    }
    return { success: false, message: "아이디 또는 비밀번호가 틀렸습니다." };
}

// 회원가입 (백엔드 API 시뮬레이션)
function registerUser(userData) {
    if (db.users[userData.username]) {
        return { success: false, message: "이미 존재하는 아이디입니다." };
    }
    db.users[userData.username] = {
        pw: userData.password,
        name: userData.name,
        type: userData.userType,
        subjects: userData.subjects || [],
        career: userData.career || '',
        availableTime: userData.availableTime || '',
        phoneNumber: userData.phoneNumber
    };
    return { success: true, message: "회원가입이 완료되었습니다!" };
}

// 과외 요청 생성 (백엔드 API 시뮬레이션)
function createTutoringRequest(studentId, subjectId, testResult, level) {
    const existingRequest = db.requests.find(r => r.studentId === studentId && !db.matches.some(m => m.requestId === r.id));
    if (existingRequest) {
        return { success: false, message: "이미 진행 중인 과외 신청이 있습니다." };
    }

    const newRequest = {
        id: Date.now(), // 고유 ID로 현재 시간을 사용
        studentId: studentId,
        subject: subjectId,
        testResult: testResult,
        level: level,
        applicants: [], // 지원한 강사 목록
    };
    db.requests.push(newRequest);
    return { success: true, request: newRequest };
}

// 강사가 과외 요청에 지원 (백엔드 API 시뮬레이션)
function applyToRequest(requestId, teacherId) {
    const request = db.requests.find(r => r.id === requestId);
    if (!request) return { success: false, message: "요청을 찾을 수 없습니다." };
    if (request.applicants.includes(teacherId)) return { success: false, message: "이미 지원했습니다." };

    request.applicants.push(teacherId);
    return { success: true, message: "지원이 완료되었습니다." };
}

// 학생이 강사 수락 (백엔드 API 시뮬레이션)
function acceptTeacher(requestId, studentId, teacherId) {
    const newMatch = {
        id: Date.now(),
        requestId: requestId,
        studentId: studentId,
        teacherId: teacherId,
        chatMessages: [] // 초기 채팅 메시지
    };
    db.matches.push(newMatch);

    // 이메일 발송 시뮬레이션
    const teacher = db.users[teacherId];
    const student = db.users[studentId];
    const subject = db.subjects.find(s => s.id === db.requests.find(r => r.id === requestId).subject).name;
    console.log(`
        --- 이메일 발송 시뮬레이션 ---
        To: ${teacherId}@email.com (실제로는 이메일 주소 사용)
        Subject: [MatchMaker] ${student.name} 학생과의 ${subject} 과외가 매칭되었습니다.
        Body: 안녕하세요, ${teacher.name} 강사님!
              ${student.name} 학생과의 ${subject} 과외가 매칭되었습니다.
              커리큘럼과 교재 정보를 확인하고 첫 수업을 준비해주세요.
              학생과 채팅방을 통해 세부 일정을 조율할 수 있습니다.
        -----------------------------
    `);

    return { success: true, match: newMatch };
}

// 강사 프로필 리스트 가져오기 (메인 페이지용)
function getTeacherProfiles() {
    return Object.keys(db.users)
        .filter(userId => db.users[userId].type === 'teacher')
        .map(userId => ({
            id: userId,
            name: db.users[userId].name,
            career: db.users[userId].career,
            subjects: db.users[userId].subjects.map(subId => db.subjects.find(s => s.id === subId)?.name || subId),
            profileImage: `https://api.dicebear.com/7.x/initials/svg?seed=${db.users[userId].name}` // 임시 프로필 이미지
        }));
}

// 현재 로그인한 사용자 정보를 가져오는 함수 (세션 시뮬레이션)
function getCurrentUser() {
    const userId = sessionStorage.getItem('currentUser');
    if (userId && db.users[userId]) {
        return { id: userId, ...db.users[userId] };
    }
    return null;
}

// 사용자 로그인 상태 저장 (세션 시뮬레이션)
function setCurrentUser(userId) {
    sessionStorage.setItem('currentUser', userId);
}

// 사용자 로그아웃 (세션 시뮬레이션)
function clearCurrentUser() {
    sessionStorage.removeItem('currentUser');
}