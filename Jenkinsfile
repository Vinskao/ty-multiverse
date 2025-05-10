pipeline {
    agent {
        kubernetes {
            yaml '''
                apiVersion: v1
                kind: Pod
                spec:
                  serviceAccountName: jenkins-admin
                  containers:
                  - name: node
                    image: node:18
                    command: ["cat"]
                    tty: true
                    volumeMounts:
                    - mountPath: /home/jenkins/agent
                      name: workspace-volume
                    workingDir: /home/jenkins/agent
                  - name: docker
                    image: docker:23-dind
                    privileged: true
                    securityContext:
                      privileged: true
                    env:
                    - name: DOCKER_HOST
                      value: tcp://localhost:2375
                    - name: DOCKER_TLS_CERTDIR
                      value: ""
                    - name: DOCKER_BUILDKIT
                      value: "1"
                    volumeMounts:
                    - mountPath: /home/jenkins/agent
                      name: workspace-volume
                  - name: kubectl
                    image: bitnami/kubectl:1.30.7
                    command: ["/bin/sh"]
                    args: ["-c", "while true; do sleep 30; done"]
                    alwaysPull: true
                    securityContext:
                      runAsUser: 0
                    volumeMounts:
                    - mountPath: /home/jenkins/agent
                      name: workspace-volume
                  volumes:
                  - name: workspace-volume
                    emptyDir: {}
            '''
            defaultContainer 'node'
            inheritFrom 'default'
        }
    }
    options {
        timestamps()
        disableConcurrentBuilds()
    }
    environment {
        DOCKER_IMAGE = 'papakao/ty-multiverse-frontend'
        DOCKER_TAG = "${BUILD_NUMBER}"
    }
    stages {
        stage('Clone and Setup') {
            steps {
                container('node') {
                    script {
                        withCredentials([
                            string(credentialsId: 'PUBLIC_DECKOFCARDS_URL', variable: 'PUBLIC_DECKOFCARDS_URL'),
                            string(credentialsId: 'PUBLIC_TYMB_URL', variable: 'PUBLIC_TYMB_URL'),
                            string(credentialsId: 'PUBLIC_SSO_URL', variable: 'PUBLIC_SSO_URL'),
                            string(credentialsId: 'PUBLIC_FRONTEND_URL', variable: 'PUBLIC_FRONTEND_URL'),
                            string(credentialsId: 'PUBLIC_PEOPLE_IMAGE_URL', variable: 'PUBLIC_PEOPLE_IMAGE_URL'),
                            string(credentialsId: 'PUBLIC_CLIENT', variable: 'PUBLIC_CLIENT'),
                            string(credentialsId: 'PUBLIC_REALM', variable: 'PUBLIC_REALM')
                        ]) {
                            sh '''
                                # 確認 Dockerfile 存在
                                ls -la
                                if [ ! -f "Dockerfile" ]; then
                                    echo "Error: Dockerfile not found!"
                                    exit 1
                                fi
                            '''
                        }
                    }
                }
            }
        }

        stage('Build') {
            steps {
                container('node') {
                    withCredentials([
                        string(credentialsId: 'PUBLIC_DECKOFCARDS_URL', variable: 'PUBLIC_DECKOFCARDS_URL'),
                        string(credentialsId: 'PUBLIC_TYMB_URL', variable: 'PUBLIC_TYMB_URL'),
                        string(credentialsId: 'PUBLIC_SSO_URL', variable: 'PUBLIC_SSO_URL'),
                        string(credentialsId: 'PUBLIC_FRONTEND_URL', variable: 'PUBLIC_FRONTEND_URL'),
                        string(credentialsId: 'PUBLIC_PEOPLE_IMAGE_URL', variable: 'PUBLIC_PEOPLE_IMAGE_URL'),
                        string(credentialsId: 'PUBLIC_CLIENT', variable: 'PUBLIC_CLIENT'),
                        string(credentialsId: 'PUBLIC_REALM', variable: 'PUBLIC_REALM')
                    ]) {
                        sh 'npm install'
                        sh 'npm run build'
                    }
                }
            }
        }

        stage('Build Docker Image with BuildKit') {
            steps {
                container('docker') {
                    script {
                        withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
                            sh '''
                                cd /home/jenkins/agent
                                echo "${DOCKER_PASSWORD}" | docker login -u "${DOCKER_USERNAME}" --password-stdin
                                # 構建 Docker 鏡像
                                docker build \
                                    --build-arg BUILDKIT_INLINE_CACHE=1 \
                                    --cache-from ${DOCKER_IMAGE}:latest \
                                    -t ${DOCKER_IMAGE}:${DOCKER_TAG} \
                                    -t ${DOCKER_IMAGE}:latest \
                                    .
                                docker push ${DOCKER_IMAGE}:${DOCKER_TAG}
                                docker push ${DOCKER_IMAGE}:latest
                            '''
                        }
                    }
                }
            }
        }

        stage('Debug Environment') {
            steps {
                container('kubectl') {
                    script {
                        echo "=== Listing all environment variables ==="
                        sh 'printenv | sort'
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                container('kubectl') {
                    withKubeConfig([credentialsId: 'kubeconfig-secret']) {
                        script {
                            try {
                                // 測試集群連接
                                sh 'kubectl cluster-info'
                                
                                // 檢查 deployment.yaml 文件
                                sh 'ls -la k8s/'
                                
                                // 檢查 Deployment 是否存在
                                sh '''
                                    if kubectl get deployment ty-multiverse-frontend -n default; then
                                        echo "Deployment exists, updating..."
                                        kubectl set image deployment/ty-multiverse-frontend ty-multiverse-frontend=${DOCKER_IMAGE}:${DOCKER_TAG} -n default
                                        kubectl rollout restart deployment ty-multiverse-frontend
                                    else
                                        echo "Deployment does not exist, creating..."
                                        kubectl apply -f k8s/deployment.yaml
                                    fi
                                '''
                                
                                // 檢查部署狀態
                                sh 'kubectl get deployments -n default'
                                sh 'kubectl rollout status deployment/ty-multiverse-frontend'
                            } catch (Exception e) {
                                echo "Error during deployment: ${e.message}"
                                throw e
                            }
                        }
                    }
                }
            }
        }
    }
    post {
        always {
            cleanWs()
        }
    }
}