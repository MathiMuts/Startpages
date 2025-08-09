# CI/CD
To make the CI/CD pipeline work you will need to add the following secrets:
1. SSH_PORT -> 22
2. SSH_HOST -> intern.google.com
3. SSH_PRIVATE_KEY -> -----BEGIN xxx PRIVATE KEY-----  ...  -----END xxx PRIVATE KEY-----
4. SSH_USER -> deploy_user
5. PROJECT_PATH -> /var/www/project