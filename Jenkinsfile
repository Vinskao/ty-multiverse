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
                    image: node:22
                    command: ["cat"]
                    tty: true
                    resources:
                      requests:
                        cpu: "25m"
                        memory: "128Mi"
                      limits:
                        cpu: "100m"
                        memory: "512Mi"
                    volumeMounts:
                    - mountPath: /home/jenkins/agent
                      name: workspace-volume
                    workingDir: /home/jenkins/agent
                  - name: docker
                    image: docker:23-dind
                    privileged: true
                    securityContext:
                      privileged: true
                    resources:
                      requests:
                        cpu: "50m"
                        memory: "256Mi"
                      limits:
                        cpu: "500m"
                        memory: "1Gi"
                    env:
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
                    imagePullPolicy: Always
                    securityContext:
                      runAsUser: 0
                    resources:
                      requests:
                        cpu: "10m"
                        memory: "64Mi"
                      limits:
                        cpu: "100m"
                        memory: "256Mi"
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
                            string(credentialsId: 'PUBLIC_CLIENT_ID', variable: 'PUBLIC_CLIENT_ID'),
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
                        string(credentialsId: 'PUBLIC_CLIENT_ID', variable: 'PUBLIC_CLIENT_ID'),
                        string(credentialsId: 'PUBLIC_REALM', variable: 'PUBLIC_REALM')
                    ]) {
                        sh '''
                            # 清除 npm 快取
                            echo "Cleaning npm cache..."
                            npm cache clean --force
                            
                            # 清除 node_modules 和 package-lock.json
                            echo "Removing node_modules and package-lock.json..."
                            rm -rf node_modules package-lock.json
                            
                            # 重新安裝依賴
                            echo "Installing dependencies..."
                            npm install
                            
                            # 建置專案
                            echo "Building project..."
                            npm run build
                            
                            # 檢查建置結果
                            echo "Checking build output..."
                            ls -la dist/client/_astro/ | grep -E "\\.(css|js)$"
                        '''
                    }
                }
            }
        }

        stage('Build Docker Image with BuildKit') {
            steps {
                container('docker') {
                    script {
                        withCredentials([
                            usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD'),
                            string(credentialsId: 'PUBLIC_DECKOFCARDS_URL', variable: 'PUBLIC_DECKOFCARDS_URL'),
                            string(credentialsId: 'PUBLIC_TYMB_URL', variable: 'PUBLIC_TYMB_URL'),
                            string(credentialsId: 'PUBLIC_SSO_URL', variable: 'PUBLIC_SSO_URL'),
                            string(credentialsId: 'PUBLIC_FRONTEND_URL', variable: 'PUBLIC_FRONTEND_URL'),
                            string(credentialsId: 'PUBLIC_PEOPLE_IMAGE_URL', variable: 'PUBLIC_PEOPLE_IMAGE_URL'),
                            string(credentialsId: 'PUBLIC_CLIENT_ID', variable: 'PUBLIC_CLIENT_ID'),
                            string(credentialsId: 'PUBLIC_REALM', variable: 'PUBLIC_REALM'),
                            string(credentialsId: 'PUBLIC_API_BASE_URL', variable: 'PUBLIC_API_BASE_URL')
                        ]) {
                            sh '''
                                cd "${WORKSPACE}"
                                echo "${DOCKER_PASSWORD}" | docker login -u "${DOCKER_USERNAME}" --password-stdin
                                # 確認 Dockerfile 存在
                                ls -la
                                if [ ! -f "Dockerfile" ]; then
                                    echo "Error: Dockerfile not found!"
                                    exit 1
                                fi
                                # 構建 Docker 鏡像
                                docker build \
                                    --build-arg BUILDKIT_INLINE_CACHE=1 \
                                    --build-arg PUBLIC_DECKOFCARDS_URL="${PUBLIC_DECKOFCARDS_URL}" \
                                    --build-arg PUBLIC_TYMB_URL="${PUBLIC_TYMB_URL}" \
                                    --build-arg PUBLIC_SSO_URL="${PUBLIC_SSO_URL}" \
                                    --build-arg PUBLIC_FRONTEND_URL="${PUBLIC_FRONTEND_URL}" \
                                    --build-arg PUBLIC_PEOPLE_IMAGE_URL="${PUBLIC_PEOPLE_IMAGE_URL}" \
                                    --build-arg PUBLIC_CLIENT_ID="${PUBLIC_CLIENT_ID}" \
                                    --build-arg PUBLIC_REALM="${PUBLIC_REALM}" \
                                    --build-arg PUBLIC_API_BASE_URL="${PUBLIC_API_BASE_URL}" \
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
					script {
                            try {
                                // 測試集群連接
                                sh 'kubectl cluster-info'
                                
                                // 檢查 deployment.yaml 文件
                                sh 'ls -la k8s/'
                                
                                // 檢查 Deployment 是否存在
                                sh '''
                                    if kubectl get deployment ty-multiverse-frontend -n default; then
                                        echo "Deployment exists, updating with Recreate strategy..."
                                        kubectl set image deployment/ty-multiverse-frontend ty-multiverse-frontend=${DOCKER_IMAGE}:${DOCKER_TAG} -n default
                                        echo "Waiting for rollout to complete..."
                                        kubectl rollout status deployment/ty-multiverse-frontend --timeout=300s
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
    post {
        always {
            cleanWs()
        }
    }
}