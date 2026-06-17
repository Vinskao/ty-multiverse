pipeline {
    agent {
        kubernetes {
            yaml '''
                apiVersion: v1
                kind: Pod
                spec:
                  activeDeadlineSeconds: 7200
                  serviceAccountName: jenkins-admin
                  containers:
                  - name: node
                    image: node:22
                    command: ["cat"]
                    tty: true
                    resources:
                      requests:
                        cpu: "25m"
                        memory: "512Mi"
                      limits:
                        cpu: "100m"
                        memory: "1024Mi"
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
                        memory: "512Mi"
                      limits:
                        cpu: "2000m"
                        memory: "3072Mi"
                    env:
                    - name: DOCKER_TLS_CERTDIR
                      value: ""
                    - name: DOCKER_BUILDKIT
                      value: "1"
                    - name: DOCKER_DRIVER
                      value: "overlay2"
                    volumeMounts:
                    - mountPath: /home/jenkins/agent
                      name: workspace-volume
                  - name: kubectl
                    image: bitnami/kubectl:latest
                    command: ["/bin/sh"]
                    args: ["-c", "while true; do sleep 30; done"]
                    imagePullPolicy: Always
                    securityContext:
                      runAsUser: 0
                    resources:
                      requests:
                        cpu: "10m"
                        memory: "128Mi"
                      limits:
                        cpu: "50m"
                        memory: "256Mi"
                    volumeMounts:
                    - mountPath: /home/jenkins/agent
                      name: workspace-volume
                  - name: jnlp
                    image: jenkins/inbound-agent:3309.v27b_9314fd1a_4-1
                    resources:
                      requests:
                        cpu: "50m"
                        memory: "256Mi"
                      limits:
                        cpu: "100m"
                        memory: "512Mi"
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
                            string(credentialsId: 'PUBLIC_TYMG_URL', variable: 'PUBLIC_TYMG_URL'),
                            string(credentialsId: 'PUBLIC_SSO_URL', variable: 'PUBLIC_SSO_URL'),
                            string(credentialsId: 'PUBLIC_FRONTEND_URL', variable: 'PUBLIC_FRONTEND_URL'),
                            string(credentialsId: 'PUBLIC_PEOPLE_IMAGE_URL', variable: 'PUBLIC_PEOPLE_IMAGE_URL'),
                            string(credentialsId: 'PUBLIC_CLIENT_ID', variable: 'PUBLIC_CLIENT_ID'),
                            string(credentialsId: 'PUBLIC_REALM', variable: 'PUBLIC_REALM'),
                            string(credentialsId: 'PUBLIC_MAYA_SAWA_URL', variable: 'PUBLIC_MAYA_SAWA_URL'),
                            string(credentialsId: 'MARKET_INTERNAL_SECRET', variable: 'MARKET_INTERNAL_SECRET')
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
                            string(credentialsId: 'PUBLIC_TYMG_URL', variable: 'PUBLIC_TYMG_URL'),
                            string(credentialsId: 'PUBLIC_SSO_URL', variable: 'PUBLIC_SSO_URL'),
                            string(credentialsId: 'PUBLIC_FRONTEND_URL', variable: 'PUBLIC_FRONTEND_URL'),
                            string(credentialsId: 'PUBLIC_PEOPLE_IMAGE_URL', variable: 'PUBLIC_PEOPLE_IMAGE_URL'),
                            string(credentialsId: 'PUBLIC_CLIENT_ID', variable: 'PUBLIC_CLIENT_ID'),
                            string(credentialsId: 'PUBLIC_REALM', variable: 'PUBLIC_REALM'),
                            string(credentialsId: 'PUBLIC_API_BASE_URL', variable: 'PUBLIC_API_BASE_URL'),
                            string(credentialsId: 'PUBLIC_MAYA_SAWA_URL', variable: 'PUBLIC_MAYA_SAWA_URL'),
                            string(credentialsId: 'MARKET_INTERNAL_SECRET', variable: 'MARKET_INTERNAL_SECRET')
                        ]) {
                            sh '''
                                echo "${DOCKER_PASSWORD}" | docker login -u "${DOCKER_USERNAME}" --password-stdin
                                docker info
                                
                                # 生產構建：禁用所有快取，確保最新
                                timeout 30m docker build \
                                  --no-cache \
                                  --progress=plain \
                                  --build-arg PUBLIC_DECKOFCARDS_URL="${PUBLIC_DECKOFCARDS_URL}" \
                                  --build-arg PUBLIC_TYMB_URL="${PUBLIC_TYMB_URL}" \
                                  --build-arg PUBLIC_TYMG_URL="${PUBLIC_TYMG_URL}" \
                                  --build-arg PUBLIC_SSO_URL="${PUBLIC_SSO_URL}" \
                                  --build-arg PUBLIC_FRONTEND_URL="${PUBLIC_FRONTEND_URL}" \
                                  --build-arg PUBLIC_PEOPLE_IMAGE_URL="${PUBLIC_PEOPLE_IMAGE_URL}" \
                                  --build-arg PUBLIC_CLIENT_ID="${PUBLIC_CLIENT_ID}" \
                                  --build-arg PUBLIC_REALM="${PUBLIC_REALM}" \
                                  --build-arg PUBLIC_API_BASE_URL="${PUBLIC_API_BASE_URL}" \
                                  --build-arg PUBLIC_MAYA_SAWA_URL="${PUBLIC_MAYA_SAWA_URL}" \
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
                        withCredentials([
                            string(credentialsId: 'MARKET_INTERNAL_SECRET', variable: 'MARKET_INTERNAL_SECRET')
                        ]) {
                            sh '''
                                # 建立或更新 market-internal-secret
                                # 防呆：credential 為空時不要覆寫既有 secret（避免把有效值清成空字串，
                                # 這正是先前 Usage/Portfolio 顯示不出資料的根因）
                                if [ -n "${MARKET_INTERNAL_SECRET}" ]; then
                                    kubectl create secret generic market-internal-secret \
                                        --from-literal=MARKET_INTERNAL_SECRET="${MARKET_INTERNAL_SECRET}" \
                                        --dry-run=client -o yaml | kubectl apply -f - -n default
                                else
                                    echo "WARNING: MARKET_INTERNAL_SECRET credential is empty; keeping existing market-internal-secret unchanged"
                                fi

                                # 將 MARKET_INTERNAL_SECRET 和 MAYA_SAWA_INTERNAL_URL 注入 deployment spec
                                # strategic merge patch 會依 name 合併，已存在則更新，不存在則新增（冪等）
                                kubectl patch deployment ty-multiverse-frontend -n default --type=strategic -p \
                                  '{"spec":{"template":{"spec":{"containers":[{"name":"ty-multiverse-frontend","env":[{"name":"MARKET_INTERNAL_SECRET","valueFrom":{"secretKeyRef":{"name":"market-internal-secret","key":"MARKET_INTERNAL_SECRET"}}},{"name":"MAYA_SAWA_INTERNAL_URL","value":"http://maya-sawa/maya-sawa"}]}]}}}}'

                                # 更新部署
                                kubectl set image deployment/ty-multiverse-frontend ty-multiverse-frontend=${DOCKER_IMAGE}:${DOCKER_TAG} -n default

                                # 強制重啟讓新 env 生效
                                kubectl rollout restart deployment/ty-multiverse-frontend -n default

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
    }
    post {
        always {
            cleanWs()
        }
    }
}
