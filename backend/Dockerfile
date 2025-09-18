# 1. 베이스 이미지 선택 (Node.js 18 버전)
FROM node:18-alpine

# 2. 작업 디렉토리 설정
WORKDIR /usr/src/app

# 3. [수정] package.json 파일만 먼저 복사
COPY package*.json ./

# 4. [수정] Docker 컨테이너 내부에서 npm install 실행
# 이렇게 하면 Linux 환경에 맞는 bcrypt가 설치됩니다.
RUN npm install

# 5. 나머지 소스 코드 전체 복사
COPY . .

# 6. 애플리케이션이 사용할 포트 노출
EXPOSE 3000

# 7. 컨테이너 시작 시 실행할 명령어
CMD [ "node", "server.js" ]