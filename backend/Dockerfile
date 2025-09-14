# 1. 베이스 이미지 선택 (Node.js 18 버전)
FROM node:18-alpine

# 2. 작업 디렉토리 설정
WORKDIR /usr/src/app

# 3. package.json 파일들을 복사하여 의존성 설치 준비
COPY package*.json ./

# 4. 의존성 패키지 설치
RUN npm install

# 5. [추가] 설치된 패키지에 대한 권한 변경
RUN chown -R node:node /usr/src/app/node_modules

# 6. 소스 코드 전체 복사
COPY . .

# 7. 애플리케이션이 사용할 포트 노출
EXPOSE 3000

# 8. 컨테이너 시작 시 실행할 명령어
CMD [ "node", "server.js" ]