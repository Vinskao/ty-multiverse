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



        stage('Build Docker Image') {
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
                                echo "${DOCKER_PASSWORD}" | docker login -u "${DOCKER_USERNAME}" --password-stdin
                                
                                # 生產構建：禁用所有快取，確保最新
                                docker build \
                                    --no-cache \
                                    --build-arg PUBLIC_DECKOFCARDS_URL="${PUBLIC_DECKOFCARDS_URL}" \
                                    --build-arg PUBLIC_TYMB_URL="${PUBLIC_TYMB_URL}" \
                                    --build-arg PUBLIC_SSO_URL="${PUBLIC_SSO_URL}" \
                                    --build-arg PUBLIC_FRONTEND_URL="${PUBLIC_FRONTEND_URL}" \
                                    --build-arg PUBLIC_PEOPLE_IMAGE_URL="${PUBLIC_PEOPLE_IMAGE_URL}" \
                                    --build-arg PUBLIC_CLIENT_ID="${PUBLIC_CLIENT_ID}" \
                                    --build-arg PUBLIC_REALM="${PUBLIC_REALM}" \
                                    --build-arg PUBLIC_API_BASE_URL="${PUBLIC_API_BASE_URL}" \
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



				stage('Deploy to Kubernetes') {
			steps {
				container('kubectl') {
					script {
                        sh '''
                            # 更新部署
                            kubectl set image deployment/ty-multiverse-frontend ty-multiverse-frontend=${DOCKER_IMAGE}:${DOCKER_TAG} -n default
                            
                            # 等待部署完成
                            kubectl rollout status deployment/ty-multiverse-frontend --timeout=300s
                            
                            # 驗證部署
                            kubectl get deployments -n default
                        '''
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