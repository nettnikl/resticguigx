FROM docker.io/electronuserland/builder:wine-mono

ENV VERSION=0.15.0
ENV NODE_ENV=staging

RUN npm install -g pnpm
ADD . /app
RUN mkdir -p /app/bin/linux /app/bin/mac /app/bin/win
ADD "https://github.com/restic/restic/releases/download/v${VERSION}/restic_${VERSION}_linux_amd64.bz2" /app/bin/linux/restic.bz2
ADD "https://github.com/restic/restic/releases/download/v${VERSION}/restic_${VERSION}_darwin_amd64.bz2" /app/bin/mac/restic.bz2
ADD "https://github.com/restic/restic/releases/download/v${VERSION}/restic_${VERSION}_windows_amd64.zip" /app/bin/win/restic.zip

RUN cd /app/bin/linux && \
	bzip2 -d restic.bz2 && \
	chmod u+x restic
RUN cd /app/bin/mac && \
	bzip2 -d restic.bz2 && \
	chmod u+x restic
RUN cd /app/bin/win && \
	unzip -o restic.zip && \
	mv "restic_${VERSION}_windows_amd64.exe" restic.exe
WORKDIR /app
RUN pnpm install
RUN pnpm run build
