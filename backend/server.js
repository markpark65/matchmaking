const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Docker 환경 변수를 사용하여 DB 연결 풀 생성
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};
const pool = mysql.createPool(dbConfig);

// --- API Routes ---

// 1. 회원가입
app.post('/api/register', async (req, res) => {
    const { username, email, password, name, userType, phoneNumber, subjects, career, availableTime } = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const [userResult] = await connection.execute(
            'INSERT INTO users (username, email, password, name, userType, phoneNumber, career, availableTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [username, email, hashedPassword, name, userType, phoneNumber, career, availableTime]
        );
        const userId = userResult.insertId;

        if (userType === 'teacher' && subjects && subjects.length > 0) {
            const subjectValues = subjects.map(subjectId => [userId, subjectId]);
            await connection.query('INSERT INTO user_subjects (userId, subjectId) VALUES ?', [subjectValues]);
        }

        await connection.commit();
        res.status(201).json({ success: true, message: '회원가입이 성공적으로 완료되었습니다.' });
    } catch (error) {
        await connection.rollback();
        console.error('Register Error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ success: false, message: '이미 사용 중인 아이디 또는 이메일입니다.' });
        } else {
            res.status(500).json({ success: false, message: '서버 오류로 회원가입에 실패했습니다.' });
        }
    } finally {
        connection.release();
    }
});

// 2. 로그인
app.post('/api/login', async (req, res) => {
    const { username, password, userType } = req.body;
    try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
        }
        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (match && user.userType === userType) {
            const { password, ...userResponse } = user;
            res.json({ success: true, user: userResponse });
        } else {
            res.status(401).json({ success: false, message: '아이디, 비밀번호 또는 사용자 유형이 올바르지 않습니다.' });
        }
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 3. 과목 목록 조회
app.get('/api/subjects', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name FROM subjects ORDER BY name');
        res.json({ success: true, subjects: rows });
    } catch (error) {
        console.error('Subjects fetch Error:', error);
        res.status(500).json({ success: false, message: '과목 목록을 불러오는 데 실패했습니다.' });
    }
});

// 4. 강사 목록 조회
app.get('/api/teachers', async (req, res) => {
    try {
        const [teachers] = await pool.query("SELECT id, name, career FROM users WHERE userType = 'teacher'");
        res.json({ success: true, teachers });
    } catch (error) {
        console.error('Teachers fetch Error:', error);
        res.status(500).json({ success: false, message: '강사 목록을 불러오는 데 실패했습니다.' });
    }
});

// 5. 과외 요청 생성
app.post('/api/requests', async (req, res) => {
    const { studentId, subjectId, level, testResult } = req.body;
    try {
        const [existing] = await pool.execute('SELECT id FROM requests WHERE studentId = ? AND status = ?', [studentId, 'pending']);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: '이미 진행 중인 과외 신청이 있습니다.' });
        }
        await pool.execute(
            'INSERT INTO requests (studentId, subjectId, level, testResult) VALUES (?, ?, ?, ?)',
            [studentId, subjectId, level, testResult]
        );
        res.status(201).json({ success: true, message: '과외 신청이 완료되었습니다.' });
    } catch (error) {
        console.error('Request creation Error:', error);
        res.status(500).json({ success: false, message: '과외 신청 중 오류가 발생했습니다.' });
    }
});

// 6. 학생의 과외 요청 조회 (지원한 강사 포함)
app.get('/api/requests/student/:studentId', async (req, res) => {
    const { studentId } = req.params;
    try {
        const [requestRows] = await pool.execute(
            `SELECT r.id, r.subjectId, r.level, r.testResult, s.name as subjectName 
             FROM requests r JOIN subjects s ON r.subjectId = s.id 
             WHERE r.studentId = ? AND r.status = 'pending'`, [studentId]
        );
        if (requestRows.length === 0) return res.json({ success: true, request: null });

        const request = requestRows[0];
        const [applicants] = await pool.execute(
            `SELECT u.id, u.name, u.career 
             FROM request_applicants ra JOIN users u ON ra.teacherId = u.id 
             WHERE ra.requestId = ?`, [request.id]
        );
        request.applicants = applicants;
        res.json({ success: true, request: request });
    } catch (error) {
        console.error('Fetch student request Error:', error);
        res.status(500).json({ success: false, message: '요청 정보를 불러오는 데 실패했습니다.' });
    }
});

// 7. 강사 대상 과외 요청 목록 조회
app.get('/api/requests/teacher/:teacherId', async (req, res) => {
    const { teacherId } = req.params;
    try {
        const [rows] = await pool.execute(
            `SELECT r.id, r.level, r.testResult, u.name as studentName, s.name as subjectName 
             FROM requests r
             JOIN users u ON r.studentId = u.id
             JOIN subjects s ON r.subjectId = s.id
             WHERE r.status = 'pending' 
               AND r.id NOT IN (SELECT requestId FROM request_applicants WHERE teacherId = ?)
               AND r.subjectId IN (SELECT subjectId FROM user_subjects WHERE userId = ?)`,
            [teacherId, teacherId]
        );
        res.json({ success: true, requests: rows });
    } catch (error) {
        console.error('Fetch teacher requests Error:', error);
        res.status(500).json({ success: false, message: '새로운 과외 요청을 불러오는 데 실패했습니다.' });
    }
});

// 8. 강사의 과외 지원
app.post('/api/apply', async (req, res) => {
    const { requestId, teacherId } = req.body;
    try {
        await pool.execute('INSERT INTO request_applicants (requestId, teacherId) VALUES (?, ?)', [requestId, teacherId]);
        res.json({ success: true, message: '지원이 완료되었습니다.' });
    } catch (error) {
        console.error('Apply Error:', error);
        res.status(500).json({ success: false, message: '지원 처리 중 오류가 발생했습니다.' });
    }
});

// 9. 학생의 강사 수락 (매칭)
app.post('/api/match', async (req, res) => {
    const { requestId, studentId, teacherId } = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [matchResult] = await connection.execute(
            'INSERT INTO matches (requestId, studentId, teacherId) VALUES (?, ?, ?)',
            [requestId, studentId, teacherId]
        );
        const matchId = matchResult.insertId;
        await connection.execute("UPDATE requests SET status = 'matched' WHERE id = ?", [requestId]);
        const defaultCurriculum = [
            [matchId, '1주차: 레벨 테스트 결과 분석 및 학습 계획 수립'],
            [matchId, '2주차: 기본 개념 다지기'],
            [matchId, '3주차: 유형별 문제 풀이'],
            [matchId, '4주차: 심화 문제 및 오답 노트']
        ];
        await connection.query('INSERT INTO curriculum (matchId, title) VALUES ?', [defaultCurriculum]);
        await connection.commit();
        res.json({ success: true, message: '매칭이 성공적으로 완료되었습니다!' });
    } catch (error) {
        await connection.rollback();
        console.error('Match Error:', error);
        res.status(500).json({ success: false, message: '매칭 처리 중 오류가 발생했습니다.' });
    } finally {
        connection.release();
    }
});

// 10. 사용자의 현재 매칭 정보 조회
app.get('/api/matches/user/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [rows] = await pool.execute(
            `SELECT m.id, m.requestId, s.name as subjectName, student.name as studentName, teacher.name as teacherName
             FROM matches m
             JOIN requests r ON m.requestId = r.id
             JOIN subjects s ON r.subjectId = s.id
             JOIN users student ON m.studentId = student.id
             JOIN users teacher ON m.teacherId = teacher.id
             WHERE m.studentId = ? OR m.teacherId = ?`, [userId, userId]
        );
        res.json({ success: true, match: rows[0] || null });
    } catch (error) {
        console.error('Fetch match Error:', error);
        res.status(500).json({ success: false, message: '매칭 정보를 불러오는 데 실패했습니다.' });
    }
});

// 11. 강의실 정보 조회
app.get('/api/lecture/:matchId', async (req, res) => {
    const { matchId } = req.params;
    if (isNaN(parseInt(matchId))) return res.status(400).json({ success: false, message: '유효하지 않은 Match ID 입니다.' });
    try {
        const [matchRows] = await pool.execute(
            `SELECT m.id, r.subjectId, s.name as subjectName, student.name as studentName, teacher.name as teacherName
             FROM matches m
             JOIN requests r ON m.requestId = r.id
             JOIN subjects s ON r.subjectId = s.id
             JOIN users student ON m.studentId = student.id
             JOIN users teacher ON m.teacherId = teacher.id
             WHERE m.id = ?`, [matchId]
        );
        if (matchRows.length === 0) return res.status(404).json({ success: false, message: '강의실 정보를 찾을 수 없습니다.' });
        const [curriculum] = await pool.execute('SELECT id, title, completed FROM curriculum WHERE matchId = ? ORDER BY id ASC', [matchId]);
        const [chatMessages] = await pool.execute('SELECT id, senderId, content, createdAt FROM chat_messages WHERE matchId = ? ORDER BY createdAt ASC', [matchId]);
        res.json({
            success: true,
            match: matchRows[0],
            curriculum: curriculum,
            chatMessages: chatMessages
        });
    } catch (error) {
        console.error('Fetch lecture room Error:', error);
        res.status(500).json({ success: false, message: '강의실 정보를 불러오는 중 서버 오류가 발생했습니다.' });
    }
});

// 12. 커리큘럼 상태 업데이트
app.put('/api/lecture/curriculum', async (req, res) => {
    const { itemId, completed } = req.body;
    try {
        await pool.execute('UPDATE curriculum SET completed = ? WHERE id = ?', [completed, itemId]);
        res.json({ success: true, message: '진행 상태가 업데이트되었습니다.' });
    } catch (error) {
        console.error('Update curriculum Error:', error);
        res.status(500).json({ success: false, message: '업데이트에 실패했습니다.' });
    }
});

// 13. 채팅 메시지 전송
app.post('/api/lecture/chat', async (req, res) => {
    const { matchId, senderId, content } = req.body;
    try {
        await pool.execute(
            'INSERT INTO chat_messages (matchId, senderId, content) VALUES (?, ?, ?)',
            [matchId, senderId, content]
        );
        res.status(201).json({ success: true, message: '메시지가 전송되었습니다.' });
    } catch (error) {
        console.error('Send chat Error:', error);
        res.status(500).json({ success: false, message: '메시지 전송에 실패했습니다.' });
    }
});

// 14. 특정 강의실의 채팅 메시지만 조회
app.get('/api/lecture/:matchId/chat', async (req, res) => {
    const { matchId } = req.params;
    try {
        const [chatMessages] = await pool.execute('SELECT id, senderId, content, createdAt FROM chat_messages WHERE matchId = ? ORDER BY createdAt ASC', [matchId]);
        res.json({ success: true, chatMessages });
    } catch (error) {
        res.status(500).json({ success: false, message: '채팅 메시지를 불러오는 데 실패했습니다.' });
    }
});

// 서버 시작
app.listen(port, () => {
    console.log(`Backend server is running at http://localhost:${port}`);
});