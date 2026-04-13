FROM atmoz/sftp:latest

RUN mkdir -p /etc/sftp.d \
    && echo '#!/bin/bash\nchown 1000:1000 /home/user/upload\nchmod 755 /home/user/upload' > /etc/sftp.d/fix-permissions.sh \
    && chmod +x /etc/sftp.d/fix-permissions.sh
