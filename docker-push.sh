PROJECT_ID="<GCP_PROJECT_ID>"
REGION="europe-north2"
REPO="chess-platform-repo"
BASE_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}"

docker tag backend-users-service $BASE_URL/users-service:latest
docker tag backend-game-service $BASE_URL/game-service:latest
docker tag backend-matchmaker $BASE_URL/matchmaker:latest
docker tag backend-frontend $BASE_URL/frontend:latest

docker push $BASE_URL/users-service:latest
docker push $BASE_URL/game-service:latest
docker push $BASE_URL/matchmaker:latest
docker push $BASE_URL/frontend:latest
