// app.js

let loggedInUser = getCurrentUser(); // 현재 로그인한 사용자 정보

// DOMContentLoaded 이벤트 발생 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    updateHeaderUI(); // 헤더 UI 업데이트 (로그인 상태에 따라)
    
    // 메인 페이지일 경우 강사 프로필 로드
    if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
        renderTeacherProfiles();
    }
});

// --- UI 업데이트 함수 ---

// 헤더 UI (로그인/로그아웃 버튼, 마이페이지 링크 등) 업데이트
function updateHeaderUI() {
    const authButtons = document.querySelector('.auth-buttons');
    const loggedInMenu = document.querySelector('.logged-in-menu');
    const welcomeMsg = document.getElementById('welcome-msg');
    
    loggedInUser = getCurrentUser(); // 최신 로그인 상태 반영

    if (loggedInUser) {
        if (authButtons) authButtons.style.display = 'none';
        if (loggedInMenu) {
            loggedInMenu.style.display = 'flex';
            welcomeMsg.textContent = `${loggedInUser.name}님, 환영합니다!`;
            // 마이페이지 링크 업데이트
            const mypageLink = loggedInMenu.querySelector('[data-nav="mypage"]');
            if (mypageLink) {
                if (loggedInUser.type === 'student') mypageLink.href = 'student_mypage.html';
                else if (loggedInUser.type === 'teacher') mypageLink.href = 'teacher_mypage.html';
            }
        }
    } else {
        if (authButtons) authButtons.style.display = 'flex';
        if (loggedInMenu) loggedInMenu.style.display = 'none';
    }
}

// 강사 프로필 렌더링 (메인 페이지)
function renderTeacherProfiles() {
    const profileCarousel = document.querySelector('.profile-carousel');
    if (!profileCarousel) return;

    const teachers = getTeacherProfiles(); // data.js에서 강사 정보 가져오기

    profileCarousel.innerHTML = teachers.map(teacher => `
        <div class="teacher-profile-card">
            <img src="${teacher.profileImage}" alt="${teacher.name} 강사 프로필">
            <h3>${teacher.name} 강사</h3>
            <p>${teacher.career}</p>
            <div class="subjects">
                ${teacher.subjects.map(sub => `<span>${sub}</span>`).join('')}
            </div>
            </div>
    `).join('');
}


// --- 이벤트 리스너 ---

document.addEventListener('click', e => {
    const action = e.target.dataset.action;
    const nav = e.target.dataset.nav; // 네비게이션 링크 클릭 시

    // 네비게이션 링크 클릭 처리
    if (nav) {
        if (nav === 'free-test' || nav === 'tutoring-apply') {
            window.location.href = 'free_test.html';
        } else if (nav === 'teacher-profile') {
            // 메인 페이지의 강사 프로필 섹션으로 스크롤
            const teacherSection = document.querySelector('.teacher-profiles-section');
            if (teacherSection) {
                teacherSection.scrollIntoView({ behavior: 'smooth' });
            } else { // 다른 페이지에서 클릭 시 메인으로 이동 후 스크롤
                 window.location.href = 'index.html#teacher-profiles-section'; // 나중에 hash로 스크롤 처리
            }
        } else if (nav === 'mypage') {
            if (loggedInUser) {
                if (loggedInUser.type === 'student') window.location.href = 'student_mypage.html';
                else if (loggedInUser.type === 'teacher') window.location.href = 'teacher_mypage.html';
            } else {
                alert('로그인이 필요합니다.');
                window.location.href = 'login.html';
            }
        } else {
            alert(`'${e.target.textContent}' 기능은 준비 중입니다.`);
        }
        return;
    }

    // 데이터 액션 버튼 클릭 처리
    switch (action) {
        // 로그인 페이지
        case 'login': {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const userType = document.querySelector('input[name="userType"]:checked')?.value;
            
            if (!username || !password || !userType) {
                alert('아이디, 비밀번호, 사용자 유형을 모두 입력해주세요.');
                return;
            }

            const result = loginUser(username, password);
            if (result.success) {
                if (result.user.type !== userType) {
                    alert('선택하신 사용자 유형과 로그인 정보가 일치하지 않습니다.');
                    return;
                }
                setCurrentUser(username); // 세션에 사용자 저장
                alert(`${result.user.name}님, 로그인 성공!`);
                if (result.user.type === 'student') window.location.href = 'student_mypage.html';
                else if (result.user.type === 'teacher') window.location.href = 'teacher_mypage.html';
                else if (result.user.type === 'admin') window.location.href = 'admin.html'; // 관리자 페이지로
            } else {
                alert(result.message);
            }
            break;
        }
        // 로그아웃
        case 'logout': {
            clearCurrentUser(); // 세션에서 사용자 제거
            alert('로그아웃 되었습니다.');
            window.location.href = 'index.html'; // 메인 페이지로 이동
            break;
        }
        // 메인 페이지에서 무료 테스트 보기 버튼
        case 'go-to-free-test': {
            window.location.href = 'free_test.html';
            break;
        }
        // 회원가입: 휴대폰 인증 전송
        case 'send-phone-auth': {
            const phoneNumber = document.getElementById('phone-number').value;
            if (!phoneNumber) {
                alert('휴대폰 번호를 입력해주세요.');
                return;
            }
            alert(`[${phoneNumber}]로 인증번호가 전송되었습니다. (실제 기능 아님)`);
            // 다음 단계로 넘어가기 위한 UI 변경 (실제로는 인증번호 입력 필드 활성화)
            document.getElementById('auth-step-1').style.display = 'none';
            document.getElementById('auth-step-2').style.display = 'block';
            break;
        }
        // 회원가입: 다음 단계 (회원 정보 입력)
        case 'next-signup-step': {
            const authNumber = document.getElementById('auth-number').value;
            // if (authNumber !== '1234') { // 실제로는 서버에서 인증번호 확인
            //     alert('인증번호가 올바르지 않습니다.');
            //     return;
            // }
            document.getElementById('auth-step-2').style.display = 'none';
            document.getElementById('signup-form-fields').style.display = 'block';
            break;
        }
        // 회원가입: 강사/학생 선택에 따라 필드 표시
        case 'toggle-teacher-fields': {
            const userType = e.target.value;
            const teacherFields = document.getElementById('teacher-fields');
            if (userType === 'teacher') {
                teacherFields.style.display = 'block';
            } else {
                teacherFields.style.display = 'none';
            }
            break;
        }
        // 회원가입 완료
        case 'complete-signup': {
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const name = document.getElementById('name').value;
            const userType = document.querySelector('input[name="userType"]:checked')?.value;
            const phoneNumber = document.getElementById('phone-number').value; // 첫 단계에서 입력된 번호

            if (!username || !email || !password || !name || !userType || !phoneNumber) {
                alert('모든 필수 정보를 입력해주세요.');
                return;
            }

            const subjects = Array.from(document.querySelectorAll('input[name="subjects"]:checked')).map(cb => cb.value);
            const career = (userType === 'teacher') ? document.getElementById('career').value : '';
            const availableTime = (userType === 'teacher') ? document.getElementById('available-time').value : '';

            const userData = { username, email, password, name, userType, phoneNumber, subjects, career, availableTime };
            const result = registerUser(userData);

            if (result.success) {
                alert(result.message);
                window.location.href = 'login.html';
            } else {
                alert(result.message);
            }
            break;
        }
        // 무료 테스트: 과목 선택 후 테스트 시작
        case 'start-free-test': {
            const selectedSubjectId = document.getElementById('subject-select').value;
            if (!selectedSubjectId) {
                alert('과목을 선택해주세요.');
                return;
            }
            sessionStorage.setItem('temp_test_subject', selectedSubjectId);
            window.location.href = 'free_test.html?step=level';
            break;
        }
        // 무료 테스트: 난이도 선택
        case 'select-level': {
            const level = e.target.dataset.level;
            const selectedSubjectId = sessionStorage.getItem('temp_test_subject');
            if (!selectedSubjectId) {
                alert('과목 선택이 필요합니다. 다시 시작해주세요.');
                window.location.href = 'free_test.html';
                return;
            }
            sessionStorage.setItem('temp_test_level', level);
            window.location.href = `free_test.html?step=quiz`;
            break;
        }
        // 무료 테스트: 테스트 완료 및 과외 신청
        case 'submit-test-and-apply': {
            if (!loggedInUser || loggedInUser.type !== 'student') {
                alert('학생으로 로그인해야 과외를 신청할 수 있습니다.');
                window.location.href = 'login.html';
                return;
            }
            
            const selectedSubjectId = sessionStorage.getItem('temp_test_subject');
            const selectedLevel = sessionStorage.getItem('temp_test_level');
            const testResult = "우수"; // 임시 결과
            
            // TODO: 실제로는 사용자가 푼 문제에 대한 정답 채점 로직 필요

            const result = createTutoringRequest(loggedInUser.id, selectedSubjectId, testResult, selectedLevel);

            if (result.success) {
                alert('과외 신청이 완료되었습니다. 마이페이지에서 강사님들의 지원 현황을 확인하세요!');
                sessionStorage.removeItem('temp_test_subject');
                sessionStorage.removeItem('temp_test_level');
                window.location.href = 'student_mypage.html';
            } else {
                alert(result.message);
            }
            break;
        }

        // 강사: 과외 지원
        case 'apply-to-request': {
            if (!loggedInUser || loggedInUser.type !== 'teacher') {
                alert('강사로 로그인해야 지원할 수 있습니다.');
                window.location.href = 'login.html';
                return;
            }
            const requestId = Number(e.target.dataset.requestId);
            const result = applyToRequest(requestId, loggedInUser.id);
            if (result.success) {
                alert(result.message);
                window.location.reload(); // 새로고침하여 UI 업데이트
            } else {
                alert(result.message);
            }
            break;
        }
        // 학생: 강사 수락
        case 'accept-teacher': {
            if (!loggedInUser || loggedInUser.type !== 'student') {
                alert('학생으로 로그인해야 강사를 수락할 수 있습니다.');
                window.location.href = 'login.html';
                return;
            }
            const teacherId = e.target.dataset.teacherId;
            const requestId = Number(e.target.dataset.requestId);
            const result = acceptTeacher(requestId, loggedInUser.id, teacherId);
            if (result.success) {
                alert(`${db.users[teacherId].name} 강사님과 매칭되었습니다!`);
                window.location.reload(); // 새로고침하여 UI 업데이트
            } else {
                alert(result.message);
            }
            break;
        }
        // 학생: 강사 거절
        case 'reject-teacher': {
            alert('강사를 거절했습니다. (실제로는 요청 목록에서 제거됨)');
            e.target.closest('.applicant-item').remove(); // UI에서만 제거
            break;
        }
        // 강의실 입장
        case 'go-to-lecture-room': {
             const matchId = Number(e.target.dataset.matchId);
             sessionStorage.setItem('current_match_id', matchId); // 강의실 페이지에서 사용할 수 있도록 저장
             window.location.href = 'lecture_room.html';
             break;
        }
        // 강의실 탭 전환
        case 'change-tab': {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(e.target.dataset.tab).classList.add('active');
            break;
        }
    }
});


// 현재 페이지가 로드될 때 실행될 함수
function initializePage() {
    // 로그인 페이지 전용 로직
    if (window.location.pathname.endsWith('login.html')) {
        updateHeaderUI(); // 로그인 페이지에도 헤더가 있다면 업데이트
    }
    // 회원가입 페이지 전용 로직
    else if (window.location.pathname.endsWith('signup.html')) {
        // 첫 로드 시 강사 필드 숨김
        const userTypeRadios = document.querySelectorAll('input[name="userType"]');
        userTypeRadios.forEach(radio => radio.addEventListener('change', (e) => {
            const teacherFields = document.getElementById('teacher-fields');
            if (e.target.value === 'teacher') {
                teacherFields.style.display = 'block';
            } else {
                teacherFields.style.display = 'none';
            }
        }));
    }
    // 무료 테스트 페이지 전용 로직
    else if (window.location.pathname.endsWith('free_test.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const step = urlParams.get('step');
        renderFreeTestPage(step);
    }
    // 학생 마이페이지 전용 로직
    else if (window.location.pathname.endsWith('student_mypage.html')) {
        if (!loggedInUser || loggedInUser.type !== 'student') {
            alert('학생으로 로그인해야 접근할 수 있습니다.');
            window.location.href = 'login.html';
            return;
        }
        renderStudentMypage();
    }
    // 강사 마이페이지 전용 로직
    else if (window.location.pathname.endsWith('teacher_mypage.html')) {
        if (!loggedInUser || loggedInUser.type !== 'teacher') {
            alert('강사로 로그인해야 접근할 수 있습니다.');
            window.location.href = 'login.html';
            return;
        }
        renderTeacherMypage();
    }
    // 강의실 페이지 전용 로직
    else if (window.location.pathname.endsWith('lecture_room.html')) {
        const matchId = Number(sessionStorage.getItem('current_match_id'));
        if (!matchId) {
            alert('유효하지 않은 강의실 접근입니다.');
            window.location.href = 'index.html';
            return;
        }
        renderLectureRoomContent(matchId);
    }
}

// 무료 테스트 페이지 단계별 렌더링
function renderFreeTestPage(step) {
    const mainContent = document.getElementById('app-content'); // free_test.html에 추가될 id

    if (!mainContent) {
        console.error("app-content 요소를 찾을 수 없습니다.");
        return;
    }

    if (!step || step === 'subject') {
        const subjects = getAllSubjects();
        mainContent.innerHTML = `
            <h2>과목을 선택해주세요</h2>
            <div class="form-group">
                <label for="subject-select">과목:</label>
                <select id="subject-select">
                    <option value="">과목 선택</option>
                    ${subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                </select>
            </div>
            <button class="btn btn-primary" data-action="start-free-test">테스트 시작</button>
        `;
    } else if (step === 'level') {
        const selectedSubjectId = sessionStorage.getItem('temp_test_subject');
        const subjectName = db.subjects.find(s => s.id === selectedSubjectId)?.name || '선택된 과목';
        mainContent.innerHTML = `
            <h2>${subjectName} 과목의 난이도를 선택해주세요</h2>
            <div class="level-selection">
                <button class="btn btn-secondary" data-action="select-level" data-level="초급">초급</button>
                <button class="btn btn-secondary" data-action="select-level" data-level="중급">중급</button>
                <button class="btn btn-secondary" data-action="select-level" data-level="고급">고급</button>
                <button class="btn btn-secondary" data-action="select-level" data-level="최상위급">최상위급</button>
            </div>
        `;
    } else if (step === 'quiz') {
        const selectedSubjectId = sessionStorage.getItem('temp_test_subject');
        const selectedLevel = sessionStorage.getItem('temp_test_level');
        const questions = getTestQuestions(selectedSubjectId, selectedLevel);
        
        if (questions.length === 0) {
            mainContent.innerHTML = `
                <h2>테스트 문제</h2>
                <p>${db.subjects.find(s => s.id === selectedSubjectId)?.name || '선택된 과목'}에 대한 ${selectedLevel} 난이도 문제가 준비되지 않았습니다.</p>
                <button class="btn btn-primary" data-action="submit-test-and-apply">과외 신청하기</button>
            `;
            return;
        }

        const quizHTML = questions.map((q, index) => `
            <div class="card quiz-item">
                <h4>문제 ${index + 1}</h4>
                <p>${q.question}</p>
                <div class="options-group">
                    ${q.options.map((opt, i) => `
                        <div>
                            <input type="radio" id="q${index}-opt${i}" name="q${index}" value="${opt}">
                            <label for="q${index}-opt${i}">${opt}</label>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        mainContent.innerHTML = `
            <h2>테스트 문제</h2>
            ${quizHTML}
            <button class="btn btn-primary btn-large" data-action="submit-test-and-apply">테스트 완료 및 과외 신청</button>
        `;
    }
}


// 학생 마이페이지 렌더링
function renderStudentMypage() {
    const appContent = document.getElementById('app-content');
    if (!loggedInUser || loggedInUser.type !== 'student') {
        appContent.innerHTML = '<p>로그인 후 이용해주세요.</p>';
        return;
    }

    const myRequest = db.requests.find(r => r.studentId === loggedInUser.id && !db.matches.some(m => m.requestId === r.id));
    const myMatch = db.matches.find(m => m.studentId === loggedInUser.id);
    
    let contentHTML = `
        <h3>나의 과외 신청 현황</h3>
    `;

    if (myMatch) {
        const request = db.requests.find(r => r.id === myMatch.requestId);
        const teacher = db.users[myMatch.teacherId];
        contentHTML += `
            <div class="card">
                <h4>매칭된 과외</h4>
                <p><strong>과목:</strong> ${db.subjects.find(s => s.id === request.subject)?.name}</p>
                <p><strong>강사:</strong> ${teacher.name} (${teacher.career})</p>
                <button class="btn btn-primary" data-action="go-to-lecture-room" data-match-id="${myMatch.id}">강의실 입장</button>
            </div>
        `;
    } else if (myRequest) {
        const applicants = myRequest.applicants.map(teacherId => {
            const teacher = db.users[teacherId];
            return `
                <div class="applicant-item">
                    <div>
                        <h4>${teacher.name} 강사</h4>
                        <p><strong>경력:</strong> ${teacher.career}</p>
                        <p><strong>가능 시간:</strong> ${teacher.availableTime}</p>
                    </div>
                    <div class="actions">
                        <button class="accept-btn" data-action="accept-teacher" data-teacher-id="${teacherId}" data-request-id="${myRequest.id}">수락</button>
                        <button class="reject-btn" data-action="reject-teacher" data-teacher-id="${teacherId}">거절</button>
                    </div>
                </div>
            `;
        }).join('');
        
        contentHTML += `
            <div class="card">
                <h4>내 과외 요청</h4>
                <p><strong>과목:</strong> ${db.subjects.find(s => s.id === myRequest.subject)?.name}</p>
                <p><strong>요청일:</strong> ${new Date(myRequest.id).toLocaleDateString()}</p>
                <p><strong>테스트 결과:</strong> ${myRequest.testResult} (${myRequest.level})</p>
                <hr>
                <h5>강사 지원 현황 (${myRequest.applicants.length}명)</h5>
                ${applicants.length > 0 ? applicants : '<p>아직 지원한 강사님이 없습니다.</p>'}
            </div>
        `;
    } else {
        contentHTML += `
            <p>현재 신청한 과외가 없습니다.</p>
            <button class="btn btn-primary" data-action="go-to-free-test">새 과외 신청하기</button>
        `;
    }

    appContent.innerHTML = contentHTML;
}

// 강사 마이페이지 렌더링
function renderTeacherMypage() {
    const appContent = document.getElementById('app-content');
    if (!loggedInUser || loggedInUser.type !== 'teacher') {
        appContent.innerHTML = '<p>로그인 후 이용해주세요.</p>';
        return;
    }

    const mySubjects = loggedInUser.subjects;
    const allSubjects = getAllSubjects();

    // 현재 강사에게 매칭된 강의 목록
    const myLectures = db.matches.filter(m => m.teacherId === loggedInUser.id)
        .map(m => {
            const request = db.requests.find(r => r.id === m.requestId);
            const student = db.users[request.studentId];
            const subjectName = allSubjects.find(s => s.id === request.subject)?.name || request.subject;
            return `
                <div class="card">
                    <h4>${subjectName} (${student.name} 학생)</h4>
                    <button class="btn btn-primary" data-action="go-to-lecture-room" data-match-id="${m.id}">강의실 입장</button>
                </div>
            `;
        }).join('');

    // 강사의 과목과 일치하고, 아직 매칭되지 않았으며, 강사가 아직 지원하지 않은 요청 목록
    const openRequests = db.requests.filter(req => 
        mySubjects.includes(req.subject) && // 강사의 과목에 해당
        !db.matches.some(m => m.requestId === req.id) && // 아직 매칭되지 않음
        !req.applicants.includes(loggedInUser.id) // 이 강사가 아직 지원하지 않음
    ).map(req => {
        const student = db.users[req.studentId];
        const subjectName = allSubjects.find(s => s.id === req.subject)?.name || req.subject;
        return `
            <div class="card">
                <h4>${subjectName} 과외 요청</h4>
                <p><strong>학생:</strong> ${student.name}</p>
                <p><strong>요청일:</strong> ${new Date(req.id).toLocaleDateString()}</p>
                <p><strong>테스트 결과:</strong> ${req.testResult} (${req.level})</p>
                <button class="btn btn-primary" data-action="apply-to-request" data-request-id="${req.id}">지원하기</button>
            </div>
        `;
    }).join('') || '<p>현재 지원 가능한 새로운 과외 요청이 없습니다.</p>';

    appContent.innerHTML = `
        <h3>나의 강의 목록</h3>
        ${myLectures.length > 0 ? myLectures : '<p>현재 진행중인 강의가 없습니다.</p>'}
        <hr>
        <h3>새로운 과외 요청</h3>
        ${openRequests}
    `;
}

// 강의실 내용 렌더링
function renderLectureRoomContent(matchId) {
    const appContent = document.getElementById('app-content');
    const match = db.matches.find(m => m.id === matchId);
    if (!match) {
        appContent.innerHTML = '<p>유효하지 않은 강의실 정보입니다.</p>';
        return;
    }

    const request = db.requests.find(r => r.id === match.requestId);
    const student = db.users[request.studentId];
    const teacher = db.users[match.teacherId];
    const userType = loggedInUser.type; // 현재 사용자 유형

    appContent.innerHTML = `
        <button class="btn btn-secondary" data-action="back-to-dashboard">마이페이지로 돌아가기</button>
        <h2>${db.subjects.find(s => s.id === request.subject)?.name} 강의실 (${student.name} & ${teacher.name})</h2>

        <div class="tabs">
            <button class="tab-btn active" data-action="change-tab" data-tab="curriculum">커리큘럼</button>
            <button class="tab-btn" data-action="change-tab" data-tab="assignment">과제</button>
            <button class="tab-btn" data-action="change-tab" data-tab="chat">채팅방</button>
        </div>

        <div id="curriculum" class="tab-content active">
            <h4>수업 커리큘럼 (예시)</h4>
            <ul>
                <li>1주차: 수열의 극한 - 기본 개념 및 유형 문제 풀이</li>
                <li>2주차: 미분계수와 도함수 - 미분 공식 및 응용</li>
                <li>3주차: 여러 가지 함수의 미분법 - 삼각함수, 지수로그함수 미분</li>
                <li>4주차: 도함수의 활용 - 그래프 개형, 방정식/부등식 활용</li>
            </ul>
        </div>
        <div id="assignment" class="tab-content">
            <h4>과제 현황</h4>
            <p><strong>1주차 과제:</strong> 수열의 극한 기본 문제 20문항 (제출 기한: 2024-10-05) - <span style="color: green;">제출 완료</span></p>
            <p><strong>2주차 과제:</strong> 미분계수 연습 문제 15문항 (제출 기한: 2024-10-12) - <span style="color: blue;">제출 대기</span></p>
            <button class="btn btn-primary">새 과제 등록 (강사만)</button>
        </div>
        <div id="chat" class="tab-content">
            <div class="chat-window">
                ${match.chatMessages.map(msg => `
                    <div class="message ${msg.sender === loggedInUser.id ? 'sent' : 'received'}">
                        ${msg.content}
                    </div>
                `).join('')}
                <div class="message received">안녕하세요, 첫 수업은 언제로 할까요?</div>
                <div class="message sent">네 강사님, 이번 주 토요일 오후 2시 어떠신가요?</div>
            </div>
            <div class="chat-input">
                <textarea placeholder="메시지 입력..." id="chat-message-input"></textarea>
                <button data-action="send-chat-message">전송</button>
            </div>
        </div>
    `;
}

// 강의실 채팅 메시지 전송
document.addEventListener('click', e => {
    if (e.target.dataset.action === 'send-chat-message') {
        const input = document.getElementById('chat-message-input');
        const message = input.value.trim();
        if (message) {
            const matchId = Number(sessionStorage.getItem('current_match_id'));
            const match = db.matches.find(m => m.id === matchId);
            if (match) {
                match.chatMessages.push({
                    sender: loggedInUser.id,
                    content: message,
                    timestamp: Date.now()
                });
                sessionStorage.setItem('current_match_id', matchId); // 변경사항 저장 (db 반영)
                renderLectureRoomContent(matchId); // 채팅창 새로고침
                input.value = ''; // 입력창 비우기
            }
        }
    }
});


// 마이페이지로 돌아가기 액션
document.addEventListener('click', e => {
    if (e.target.dataset.action === 'back-to-dashboard') {
        if (loggedInUser.type === 'student') {
            window.location.href = 'student_mypage.html';
        } else if (loggedInUser.type === 'teacher') {
            window.location.href = 'teacher_mypage.html';
        }
    }
});


// 모든 페이지에서 초기화 함수 실행
initializePage();