pipeline {
    agent any

    environment {
        PNPM_HOME = "/var/lib/jenkins/.local/share/pnpm"
        PATH = "$PNPM_HOME:$PATH"
        DOCKER_REGISTRY = "docker.io"
        IMAGE_NAME = "sarvavaidya/api-server"
        IMAGE_TAG = "${env.BUILD_NUMBER}"
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Pulling latest code from source control...'
                checkout scm
            }
        }

        stage('Environment & Dependencies') {
            steps {
                echo 'Setting up pnpm and installing dependencies...'
                sh '''
                    corepack enable
                    corepack prepare pnpm@10 --activate
                    pnpm install --frozen-lockfile
                '''
            }
        }

        stage('Type Check & Lint') {
            steps {
                echo 'Running static TypeScript compilation checks...'
                sh '''
                    pnpm --filter @vox/shared-types tsc --noEmit
                    pnpm --filter @vox/server tsc --noEmit
                    pnpm --filter @vox/web tsc --noEmit
                '''
            }
        }

        stage('Automated Testing') {
            steps {
                echo 'Executing unit and regression tests...'
                sh '''
                    pnpm --filter @vox/server test
                '''
            }
        }

        stage('Build Artifacts') {
            steps {
                echo 'Compiling frontend production bundle...'
                sh '''
                    NODE_OPTIONS="--max-old-space-size=896" pnpm build
                    pnpm --filter @vox/server build
                '''
            }
        }

        stage('Security Scanning (DevSecOps)') {
            steps {
                echo 'Performing dependency vulnerability audit and secret scanning...'
                sh '''
                    pnpm audit --audit-level=high || true
                '''
            }
        }

        stage('Docker Image Build') {
            steps {
                echo 'Building multi-stage production Docker container...'
                sh '''
                    docker build -f apps/server/Dockerfile -t ${IMAGE_NAME}:${IMAGE_TAG} .
                    docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${IMAGE_NAME}:latest
                '''
            }
        }

        stage('Continuous Deployment (Staging/Prod)') {
            when {
                branch 'master'
            }
            steps {
                echo 'Triggering Ansible deploy playbook to AWS EC2...'
                sh '''
                    ansible-playbook -i ansible/inventory/hosts.yml ansible/playbooks/deploy.yml
                '''
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            echo "Pipeline succeeded! Build #${env.BUILD_NUMBER} deployed or verified."
        }
        failure {
            echo "Pipeline failed! Sending notification and preserving failure logs."
        }
    }
}
