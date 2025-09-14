// --- Mock API Mode Switch ---
// true로 바꾸면 백엔드 없이 테스트 가능, false로 바꾸면 실제 백엔드와 통신
const USE_MOCK_API = true; 
const API_BASE_URL = 'http://localhost:3000/api';

let chatInterval = null; // To control the chat refresh

// --- Helper Functions for Session Management ---
function setCurrentUser(user) {
    if (user) {
        sessionStorage.setItem('currentUser', JSON.stringify(user));
    } else {
        sessionStorage.removeItem('currentUser');
    }
}
function getCurrentUser() {
    const user = sessionStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
}

// --- Page Initializer (The App's Main Router) ---
async function initializePage() {
    const loggedInUser = getCurrentUser();
    updateHeaderUI(loggedInUser);
    
    const path = window.location.pathname;
    const appContent = document.getElementById('app-content');

    // index.html or pages without app-content div
    if (!appContent && !(path.endsWith('/') || path.endsWith('index.html'))) {
        return;
    }

    if (path.endsWith('/') || path.endsWith('index.html')) {
        await renderTeacherProfiles();
    } else if (path.endsWith('signup.html')) {
        await initializeSignupPage();
    } else if (path.endsWith('free_test.html')) {
        await initializeFreeTestPage();
    } else if (path.endsWith('student_mypage.html')) {
        if (!loggedInUser || loggedInUser.userType !== 'student') {
            alert('학생으로 로그인해야 접근할 수 있습니다.');
            window.location.href = 'login.html';
            return;
        }
        await renderStudentMypage(appContent, loggedInUser);
    } else if (path.endsWith('teacher_mypage.html')) {
        if (!loggedInUser || loggedInUser.userType !== 'teacher') {
            alert('강사로 로그인해야 접근할 수 있습니다.');
            window.location.href = 'login.html';
            return;
        }
        await renderTeacherMypage(appContent, loggedInUser);
    } else if (path.endsWith('lecture_room.html')) {
        const matchId = sessionStorage.getItem('current_match_id');
        if (!loggedInUser || !matchId) {
            alert('유효하지 않은 강의실 접근입니다.');
            window.location.href = 'index.html';
            return;
        }
        await renderLectureRoomContent(appContent, matchId, loggedInUser);
    }
}

// --- Core UI Rendering ---
function updateHeaderUI(loggedInUser) {
    const authButtons = document.querySelector('.auth-buttons');
    const loggedInMenu = document.querySelector('.logged-in-menu');
    if (!authButtons || !loggedInMenu) return;

    if (loggedInUser) {
        authButtons.style.display = 'none';
        loggedInMenu.style.display = 'flex';
        document.getElementById('welcome-msg').textContent = `${loggedInUser.name}님, 환영합니다!`;
        const mypageLink = loggedInMenu.querySelector('[data-nav="mypage"]');
        if (mypageLink) {
            if (loggedInUser.userType === 'student') mypageLink.href = 'student_mypage.html';
            else if (loggedInUser.userType === 'teacher') mypageLink.href = 'teacher_mypage.html';
        }
    } else {
        authButtons.style.display = 'flex';
        loggedInMenu.style.display = 'none';
    }
}

async function renderTeacherProfiles() {
    const profileCarousel = document.querySelector('.profile-carousel');
    if (!profileCarousel) return;
    try {
        const response = await fetch(`${API_BASE_URL}/teachers`);
        const result = await response.json();
        if (result.success) {
            profileCarousel.innerHTML = result.teachers.map(teacher => `
                <div class="teacher-profile-card">
                    <img src="https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(teacher.name)}" alt="${teacher.name} 강사 프로필">
                    <h3>${teacher.name} 강사</h3>
                    <p>${teacher.career || '경력 정보가 없습니다.'}</p>
                </div>
            `).join('') || '<p>등록된 강사님이 없습니다.</p>';
        }
    } catch (error) {
        console.error('Error fetching teachers:', error);
        profileCarousel.innerHTML = '<p>강사 목록을 불러오는 데 실패했습니다.</p>';
    }
}

// --- Specific Page Rendering Functions ---
async function initializeSignupPage() {
    const subjectContainer = document.querySelector('.subject-checkboxes');
    if (!subjectContainer) return;
    try {
        const response = await fetch(`${API_BASE_URL}/subjects`);
        const result = await response.json();
        if (result.success) {
            subjectContainer.innerHTML = result.subjects.map(subject => `
                <div>
                    <input type="checkbox" id="subject-${subject.id}" name="subjects" value="${subject.id}">
                    <label for="subject-${subject.id}">${subject.name}</label>
                </div>
            `).join('');
        } else {
            subjectContainer.innerHTML = `<p style="color: red;">${result.message}</p>`;
        }
    } catch (error) {
        console.error('Error fetching subjects:', error);
        subjectContainer.innerHTML = '<p style="color: red;">서버와 통신 중 오류가 발생했습니다.</p>';
    }
}

async function initializeFreeTestPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const step = urlParams.get('step') || 'subject';
    const appContent = document.getElementById('app-content');
    if (step === 'subject') {
        try {
            const response = await fetch(`${API_BASE_URL}/subjects`);
            const result = await response.json();
            if(result.success) {
                 appContent.innerHTML = `
                    <h2>과목을 선택해주세요</h2>
                    <div class="form-group">
                        <select id="subject-select" style="width: 100%;">
                            <option value="">과목 선택</option>
                            ${result.subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                        </select>
                    </div>
                    <button class="btn btn-primary" data-action="start-free-test">다음 단계</button>
                `;
            }
        } catch(error) { console.error('Error fetching subjects', error); }
    } else if (step === 'level') {
        appContent.innerHTML = `
            <h2>난이도를 선택해주세요</h2>
            <div class="level-selection" style="display: flex; gap: 10px; justify-content: center;">
                <button class="btn btn-secondary" data-action="select-level" data-level="초급">초급</button>
                <button class="btn btn-secondary" data-action="select-level" data-level="중급">중급</button>
                <button class="btn btn-secondary" data-action="select-level" data-level="고급">고급</button>
                <button class="btn btn-secondary" data-action="select-level" data-level="최상위급">최상위급</button>
            </div>`;
    } else if (step === 'quiz') {
        appContent.innerHTML = `
            <h2>실력 테스트</h2>
            <p>선택하신 과목과 난이도에 맞는 테스트가 진행됩니다.</p>
            <div class="card">
                <h4>문제 1. (예시)</h4>
                <p>다음 중 함수의 극한에 대한 설명으로 올바른 것은?</p>
            </div>
            <button class="btn btn-primary btn-large" data-action="submit-test-and-apply">테스트 완료 및 과외 신청</button>`;
    }
}

async function renderStudentMypage(container, loggedInUser) {
    container.innerHTML = ''; 
    let hasContent = false;
    try {
        const matchResponse = await fetch(`${API_BASE_URL}/matches/user/${loggedInUser.id}`);
        const matchResult = await matchResponse.json();
        if (matchResult.success && matchResult.match) {
            const match = matchResult.match;
            container.innerHTML += `
                <h3>진행중인 과외</h3>
                <div class="card">
                    <h4>${match.subjectName}</h4>
                    <p><strong>담당 강사:</strong> ${match.teacherName}</p>
                    <button class="btn btn-primary" data-action="go-to-lecture-room" data-match-id="${match.id}">강의실 입장</button>
                </div>`;
            hasContent = true;
        }

        const reqResponse = await fetch(`${API_BASE_URL}/requests/student/${loggedInUser.id}`);
        const reqResult = await reqResponse.json();
        if (reqResult.success && reqResult.request) {
            const request = reqResult.request;
            const applicantsHTML = request.applicants.map(teacher => `
                <div class="applicant-item">
                    <div>
                        <h4>${teacher.name} 강사</h4>
                        <p><strong>경력:</strong> ${teacher.career}</p>
                    </div>
                    <div class="actions">
                        <button class="accept-btn" data-action="accept-teacher" data-teacher-id="${teacher.id}" data-request-id="${request.id}">수락</button>
                    </div>
                </div>
            `).join('') || '<p>아직 지원한 강사님이 없습니다.</p>';
            container.innerHTML += `
                <h3>나의 과외 신청 현황</h3>
                <div class="card">
                    <h4>${request.subjectName}</h4>
                    <p>테스트 결과: ${request.level} (${request.testResult})</p>
                    <hr>
                    <h5>강사 지원 현황 (${request.applicants.length}명)</h5>
                    ${applicantsHTML}
                </div>`;
            hasContent = true;
        }
        
        if (!hasContent) {
            container.innerHTML = `
                <h3>나의 과외 신청 현황</h3>
                <p>현재 신청한 과외가 없습니다.</p>
                <a href="free_test.html" class="btn btn-primary">새 과외 신청하기</a>`;
        }
    } catch(error) {
        console.error('Error fetching student mypage data:', error);
        container.innerHTML = '<p style="color:red;">마이페이지 정보를 불러오는 중 오류가 발생했습니다.</p>';
    }
}

async function renderTeacherMypage(container, loggedInUser) {
    try {
        const matchResponse = await fetch(`${API_BASE_URL}/matches/user/${loggedInUser.id}`);
        const matchResult = await matchResponse.json();
        const myLecturesHTML = (matchResult.success && matchResult.match) ? `
            <div class="card">
                <h4>${matchResult.match.subjectName} (${matchResult.match.studentName} 학생)</h4>
                <button class="btn btn-primary" data-action="go-to-lecture-room" data-match-id="${matchResult.match.id}">강의실 입장</button>
            </div>` : '<p>현재 진행중인 강의가 없습니다.</p>';

        const reqResponse = await fetch(`${API_BASE_URL}/requests/teacher/${loggedInUser.id}`);
        const reqResult = await reqResponse.json();
        const openRequestsHTML = (reqResult.success && reqResult.requests.length > 0) ? reqResult.requests.map(req => `
            <div class="card">
                <h4>${req.subjectName} 과외 요청</h4>
                <p><strong>학생:</strong> ${req.studentName}</p>
                <p><strong>테스트 결과:</strong> ${req.level} (${req.testResult})</p>
                <button class="btn btn-primary" data-action="apply-to-request" data-request-id="${req.id}">지원하기</button>
            </div>
        `).join('') : '<p>현재 지원 가능한 새로운 과외 요청이 없습니다.</p>';
        
        container.innerHTML = `
            <h3>나의 강의 목록</h3>
            ${myLecturesHTML}
            <hr>
            <h3>새로운 과외 요청</h3>
            ${openRequestsHTML}`;
    } catch(error) { console.error('Error fetching teacher mypage data:', error); }
}

async function renderLectureRoomContent(container, matchId, loggedInUser) {
    if (chatInterval) clearInterval(chatInterval);
    try {
        const response = await fetch(`${API_BASE_URL}/lecture/${matchId}`);
        const result = await response.json();
        if (!result.success || !result.match) {
            container.innerHTML = `<p>강의실 정보를 불러오는 데 실패했습니다: ${result.message || '알 수 없는 오류'}</p>`;
            return;
        }
        const { match, curriculum, chatMessages } = result;
        const totalItems = curriculum.length;
        const completedItems = curriculum.filter(item => item.completed).length;
        const progressPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
        const curriculumHTML = curriculum.map(item => `
            <li class="curriculum-item ${item.completed ? 'completed' : ''}">
                <input type="checkbox" id="curr-${item.id}" 
                       data-action="toggle-curriculum" data-item-id="${item.id}" 
                       ${loggedInUser.userType === 'student' ? 'disabled' : ''} 
                       ${item.completed ? 'checked' : ''}>
                <label for="curr-${item.id}">${item.title}</label>
            </li>`).join('');
        const chatHTML = chatMessages.map(msg => `
            <div class="message ${msg.senderId === loggedInUser.id ? 'sent' : 'received'}">
                <p>${msg.content}</p>
                <span class="timestamp">${new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>`).join('');
        
        container.innerHTML = `
            <button class="btn btn-secondary" data-action="back-to-dashboard">마이페이지로 돌아가기</button>
            <h2>${match.subjectName} 강의실 (${match.studentName} & ${match.teacherName})</h2>
            <div class="tabs">
                <button class="tab-btn active" data-action="change-tab" data-tab="progress">진행도</button>
                <button class="tab-btn" data-action="change-tab" data-tab="chat">채팅방</button>
            </div>
            <div id="progress" class="tab-content active">
                <h4>수업 진행도: ${completedItems} / ${totalItems}</h4>
                <div class="progress-bar-container"><div class="progress-bar" style="width: ${progressPercentage}%;">${Math.round(progressPercentage)}%</div></div>
                <h4>커리큘럼</h4>
                <ul class="curriculum-list">${curriculumHTML}</ul>
            </div>
            <div id="chat" class="tab-content">
                <div class="chat-window" id="chat-window">${chatHTML}</div>
                <div class="chat-input">
                    <textarea placeholder="메시지 입력..." id="chat-message-input"></textarea>
                    <button data-action="send-chat-message">전송</button>
                </div>
            </div>`;

        const chatWindow = document.getElementById('chat-window');
        if (chatWindow) chatWindow.scrollTop = chatWindow.scrollHeight;
        chatInterval = setInterval(() => { refreshChat(matchId, loggedInUser); }, 3000);
    } catch (error) {
        console.error('Error rendering lecture room:', error);
        container.innerHTML = `<p style="color:red;">강의실을 표시하는 중 오류가 발생했습니다.</p>`;
    }
}

async function refreshChat(matchId, loggedInUser) {
    const chatWindow = document.getElementById('chat-window');
    if (!chatWindow) { if (chatInterval) clearInterval(chatInterval); return; }
    try {
        const response = await fetch(`${API_BASE_URL}/lecture/${matchId}/chat`);
        const result = await response.json();
        if (result.success) {
            const currentMessageCount = chatWindow.children.length;
            if (currentMessageCount !== result.chatMessages.length) {
                const chatHTML = result.chatMessages.map(msg => `
                    <div class="message ${msg.senderId === loggedInUser.id ? 'sent' : 'received'}">
                        <p>${msg.content}</p>
                        <span class="timestamp">${new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>`).join('');
                chatWindow.innerHTML = chatHTML;
                chatWindow.scrollTop = chatWindow.scrollHeight;
            }
        }
    } catch (error) { console.error('Chat refresh error:', error); }
}


// --- Main Event Listener ---
document.addEventListener('click', async (e) => {
    const target = e.target;
    const action = target.dataset.action;
    const loggedInUser = getCurrentUser(); // Get user info on every click
    
    const navLink = target.closest('[data-nav]');
    if (navLink) {
        if (chatInterval) clearInterval(chatInterval);
        const navAction = navLink.dataset.nav;
        if (navAction === 'teacher-profile') {
            e.preventDefault();
            const teacherSection = document.querySelector('.teacher-profiles-section');
            if (teacherSection) {
                teacherSection.scrollIntoView({ behavior: 'smooth' });
            } else { window.location.href = 'index.html'; }
        } else if (navAction === 'community') {
            e.preventDefault();
            alert('커뮤니티 기능은 준비 중입니다.');
        }
    }
    
    if (!action) return;

    switch (action) {
        case 'login': {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const userType = document.querySelector('input[name="userType"]:checked').value;
            try {
                const response = await fetch(`${API_BASE_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password, userType })
                });
                const result = await response.json();
                if (result.success) {
                    setCurrentUser(result.user);
                    alert(`로그인 성공! ${result.user.name}님 환영합니다.`);
                    if(result.user.userType === 'student') window.location.href = 'student_mypage.html';
                    else if(result.user.userType === 'teacher') window.location.href = 'teacher_mypage.html';
                    else window.location.href = 'admin.html';
                } else { alert(result.message); }
            } catch (error) { 
                console.error('Login error:', error);
                alert('로그인 중 오류가 발생했습니다.');
            }
            break;
        }
        case 'logout': {
            if (chatInterval) clearInterval(chatInterval);
            setCurrentUser(null);
            alert('로그아웃 되었습니다.');
            window.location.href = 'index.html';
            break;
        }
        case 'go-to-free-test': {
            window.location.href = 'free_test.html';
            break;
        }
        case 'send-phone-auth': {
            alert('인증번호가 전송되었습니다. (테스트: 1234)');
            document.getElementById('auth-step-1').style.display = 'none';
            document.getElementById('auth-step-2').style.display = 'block';
            break;
        }
        case 'next-signup-step': {
            document.getElementById('auth-step-2').style.display = 'none';
            document.getElementById('signup-form-fields').style.display = 'block';
            break;
        }
        case 'complete-signup': {
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const name = document.getElementById('name').value;
            const userType = document.querySelector('input[name="userType"]:checked').value;
            const phoneNumber = document.getElementById('phone-number').value;
            const subjects = Array.from(document.querySelectorAll('input[name="subjects"]:checked')).map(cb => cb.value);
            const career = (userType === 'teacher') ? document.getElementById('career').value : '';
            const availableTime = (userType === 'teacher') ? document.getElementById('available-time').value : '';
            if(!username || !password || !name || !email) return alert('모든 필수 정보를 입력해주세요.');
            
            const userData = { username, email, password, name, userType, phoneNumber, subjects, career, availableTime };
            try {
                const response = await fetch(`${API_BASE_URL}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData),
                });
                const result = await response.json();
                alert(result.message);
                if (result.success) window.location.href = 'login.html';
            } catch (error) { console.error('Signup error:', error); }
            break;
        }
        case 'start-free-test': {
            const subjectId = document.getElementById('subject-select').value;
            if (!subjectId) { alert('과목을 선택해주세요.'); return; }
            sessionStorage.setItem('temp_test_subject', subjectId);
            window.location.href = 'free_test.html?step=level';
            break;
        }
        case 'select-level': {
            sessionStorage.setItem('temp_test_level', target.dataset.level);
            window.location.href = 'free_test.html?step=quiz';
            break;
        }
        case 'submit-test-and-apply': {
            if (!loggedInUser || loggedInUser.userType !== 'student') {
                alert('학생으로 로그인해야 과외를 신청할 수 있습니다.');
                window.location.href = 'login.html';
                return;
            }
            const requestData = {
                studentId: loggedInUser.id,
                subjectId: sessionStorage.getItem('temp_test_subject'),
                level: sessionStorage.getItem('temp_test_level'),
                testResult: '우수' // 임시 결과
            };
            try {
                const response = await fetch(`${API_BASE_URL}/requests`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestData)
                });
                const result = await response.json();
                alert(result.message);
                if(result.success) {
                    sessionStorage.removeItem('temp_test_subject');
                    sessionStorage.removeItem('temp_test_level');
                    window.location.href = 'student_mypage.html';
                }
            } catch(error) { console.error('Request creation error', error); }
            break;
        }
        case 'apply-to-request': {
            if (!loggedInUser) return alert('로그인이 필요합니다.');
            const requestId = target.dataset.requestId;
            try {
                const response = await fetch(`${API_BASE_URL}/apply`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ requestId, teacherId: loggedInUser.id })
                });
                const result = await response.json();
                alert(result.message);
                if(result.success) window.location.reload();
            } catch(error) { console.error('Apply error:', error); }
            break;
        }
        case 'accept-teacher': {
            if (!loggedInUser) return alert('로그인이 필요합니다.');
            const requestId = target.dataset.requestId;
            const teacherId = target.dataset.teacherId;
            try {
                const response = await fetch(`${API_BASE_URL}/match`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ requestId, teacherId, studentId: loggedInUser.id })
                });
                const result = await response.json();
                alert(result.message);
                if(result.success) window.location.reload();
            } catch(error) { console.error('Match error:', error); }
            break;
        }
        case 'go-to-lecture-room': {
            sessionStorage.setItem('current_match_id', target.dataset.matchId);
            window.location.href = 'lecture_room.html';
            break;
        }
        case 'back-to-dashboard': {
            if (chatInterval) clearInterval(chatInterval);
            if(loggedInUser.userType === 'student') window.location.href = 'student_mypage.html';
            else window.location.href = 'teacher_mypage.html';
            break;
        }
        case 'change-tab': {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            target.classList.add('active');
            document.getElementById(target.dataset.tab).classList.add('active');
            break;
        }
        case 'toggle-curriculum': {
            if (!loggedInUser) return alert('로그인이 필요합니다.');
            const itemId = target.dataset.itemId;
            const completed = target.checked;
            try {
                await fetch(`${API_BASE_URL}/lecture/curriculum`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ itemId, completed })
                });
                const matchId = sessionStorage.getItem('current_match_id');
                await renderLectureRoomContent(document.getElementById('app-content'), matchId, loggedInUser);
            } catch(error) { console.error('Curriculum update error:', error); }
            break;
        }
        case 'send-chat-message': {
            if (!loggedInUser) return alert('로그인이 필요합니다.');
            const matchId = sessionStorage.getItem('current_match_id');
            const content = document.getElementById('chat-message-input').value.trim();
            if (content) {
                try {
                    const response = await fetch(`${API_BASE_URL}/lecture/chat`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ matchId, senderId: loggedInUser.id, content })
                    });
                    const result = await response.json();
                    if (result.success) {
                       await refreshChat(matchId, loggedInUser);
                       document.getElementById('chat-message-input').value = '';
                    }
                } catch(error) { console.error('Send chat error:', error); }
            }
            break;
        }
    }
});

// For signup page radio buttons
document.addEventListener('change', e => {
    if (e.target.name === 'userType') {
        const teacherFields = document.getElementById('teacher-fields');
        if (teacherFields) {
            teacherFields.style.display = (e.target.value === 'teacher') ? 'block' : 'none';
        }
    }
});