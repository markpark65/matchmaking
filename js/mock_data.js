// --- Mock API Mode ---
// This file provides mock data and functions to test frontend logic without a backend.

const mock_db = {
    users: {
        'student1': { id: 1, name: '김학생', userType: 'student' },
        'teacher1': { id: 2, name: '최강사', userType: 'teacher', career: '서울대 졸업', subjects: ['math_g12'] },
        'teacher2': { id: 3, name: '박강사', userType: 'teacher', career: '경력 10년', subjects: ['eng_g12'] }
    },
    subjects: [
        { id: 'math_g12', name: '고3 수학' },
        { id: 'eng_g12', name: '고3 영어' },
        { id: 'kor_g12', name: '고3 국어' }
    ],
    requests: [],
    matches: [],
    curriculum: {},
    chat: {}
};

// Mock API function mapping
const mockAPI = {
    '/subjects': async () => ({
        success: true,
        subjects: mock_db.subjects
    }),
    '/login': async (options) => {
        const { username, userType } = JSON.parse(options.body);
        const user = mock_db.users[username];
        if (user && user.userType === userType) {
            return { success: true, user: user };
        }
        return { success: false, message: '가상 로그인 실패' };
    },
    '/teachers': async () => ({
        success: true,
        teachers: Object.values(mock_db.users).filter(u => u.userType === 'teacher')
    }),
    '/requests': async (options) => {
        const data = JSON.parse(options.body);
        const newRequest = {
            id: Date.now(),
            studentId: data.studentId,
            subjectId: data.subjectId,
            level: data.level,
            testResult: data.testResult,
            applicants: [],
            status: 'pending'
        };
        mock_db.requests.push(newRequest);
        return { success: true, message: '가상 과외 신청 완료' };
    },
    '/requests/student/:studentId': async (options, params) => {
        const studentId = parseInt(params.studentId);
        const request = mock_db.requests.find(r => r.studentId === studentId && r.status === 'pending');
        if (!request) return { success: true, request: null };
        
        const populatedRequest = { ...request };
        populatedRequest.subjectName = mock_db.subjects.find(s => s.id === request.subjectId)?.name;
        populatedRequest.applicants = request.applicants.map(teacherId => 
            Object.values(mock_db.users).find(u => u.id === teacherId)
        );
        return { success: true, request: populatedRequest };
    },
    '/requests/teacher/:teacherId': async (options, params) => {
        const teacherId = parseInt(params.teacherId);
        const teacher = Object.values(mock_db.users).find(u => u.id === teacherId);
        if (!teacher) return { success: true, requests: [] };

        const requests = mock_db.requests.filter(r => 
            teacher.subjects.includes(r.subjectId) &&
            r.status === 'pending' &&
            !r.applicants.includes(teacherId)
        ).map(r => {
            const student = Object.values(mock_db.users).find(u => u.id === r.studentId);
            const subject = mock_db.subjects.find(s => s.id === r.subjectId);
            return { ...r, studentName: student.name, subjectName: subject.name };
        });
        return { success: true, requests: requests };
    },
    '/apply': async (options) => {
        const { requestId, teacherId } = JSON.parse(options.body);
        const request = mock_db.requests.find(r => r.id === requestId);
        if (request && !request.applicants.includes(teacherId)) {
            request.applicants.push(teacherId);
        }
        return { success: true, message: '가상 지원 완료' };
    },
    '/match': async (options) => {
        const { requestId, teacherId, studentId } = JSON.parse(options.body);
        const request = mock_db.requests.find(r => r.id === requestId);
        if (request) {
            request.status = 'matched';
            const matchId = Date.now();
            const newMatch = { id: matchId, requestId, studentId, teacherId };
            mock_db.matches.push(newMatch);
            // Add default curriculum and chat
            mock_db.curriculum[matchId] = [
                { id: 1, title: '1주차: 레벨 테스트 결과 분석', completed: false },
                { id: 2, title: '2주차: 기본 개념 다지기', completed: false }
            ];
            mock_db.chat[matchId] = [];
        }
        return { success: true, message: '가상 매칭 완료!' };
    },
    '/matches/user/:userId': async (options, params) => {
        const userId = parseInt(params.userId);
        const match = mock_db.matches.find(m => m.studentId === userId || m.teacherId === userId);
        if (!match) return { success: true, match: null };

        const request = mock_db.requests.find(r => r.id === match.requestId);
        const student = Object.values(mock_db.users).find(u => u.id === match.studentId);
        const teacher = Object.values(mock_db.users).find(u => u.id === match.teacherId);
        const subject = mock_db.subjects.find(s => s.id === request.subjectId);
        const populatedMatch = { ...match, subjectName: subject.name, studentName: student.name, teacherName: teacher.name };
        return { success: true, match: populatedMatch };
    },
    '/lecture/:matchId': async (options, params) => {
        const matchId = parseInt(params.matchId);
        const match = mock_db.matches.find(m => m.id === matchId);
        if (!match) return { success: false, message: '강의실 정보 없음' };

        const request = mock_db.requests.find(r => r.id === match.requestId);
        const student = Object.values(mock_db.users).find(u => u.id === match.studentId);
        const teacher = Object.values(mock_db.users).find(u => u.id === match.teacherId);
        const subject = mock_db.subjects.find(s => s.id === request.subjectId);
        
        return {
            success: true,
            match: { ...match, subjectName: subject.name, studentName: student.name, teacherName: teacher.name },
            curriculum: mock_db.curriculum[matchId] || [],
            chatMessages: mock_db.chat[matchId] || []
        };
    },
    '/lecture/:matchId/chat': async (options, params) => {
        const matchId = parseInt(params.matchId);
        return { success: true, chatMessages: mock_db.chat[matchId] || [] };
    }
};

// --- Mock Fetch Interceptor ---
const originalFetch = window.fetch;
window.fetch = async (url, options) => {
    const path = new URL(url).pathname.replace('/api', '');
    console.log(`%c[Mock API] Intercepted: ${path}`, 'color: #00AACC', options ? JSON.parse(options.body || '{}') : '');

    for (const mockPath in mockAPI) {
        const pathRegex = new RegExp(`^${mockPath.replace(/:\w+/g, '([^/]+)')}$`);
        const match = path.match(pathRegex);
        
        if (match) {
            const params = {};
            const paramNames = (mockPath.match(/:\w+/g) || []).map(name => name.substring(1));
            paramNames.forEach((name, index) => {
                params[name] = match[index + 1];
            });
            
            return {
                ok: true,
                status: 200,
                json: async () => mockAPI[mockPath](options, params)
            };
        }
    }
    console.warn(`[Mock API] No mock found for ${path}. Trying original fetch.`);
    return originalFetch(url, options);
};