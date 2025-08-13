# Define platform as a build argument
ARG PLATFORM=linux/arm64

FROM --platform=${PLATFORM} node:20-alpine AS base
WORKDIR /app

# Add build arguments for environment variables
ARG PUBLIC_DECKOFCARDS_URL
ARG PUBLIC_TYMB_URL
ARG PUBLIC_SSO_URL
ARG PUBLIC_FRONTEND_URL
ARG PUBLIC_PEOPLE_IMAGE_URL
ARG PUBLIC_CLIENT_ID
ARG PUBLIC_REALM
ARG PUBLIC_API_BASE_URL

# Set environment variables
ENV PUBLIC_DECKOFCARDS_URL=${PUBLIC_DECKOFCARDS_URL}
ENV PUBLIC_TYMB_URL=${PUBLIC_TYMB_URL}
ENV PUBLIC_SSO_URL=${PUBLIC_SSO_URL}
ENV PUBLIC_FRONTEND_URL=${PUBLIC_FRONTEND_URL}
ENV PUBLIC_PEOPLE_IMAGE_URL=${PUBLIC_PEOPLE_IMAGE_URL}
ENV PUBLIC_CLIENT_ID=${PUBLIC_CLIENT_ID}
ENV PUBLIC_REALM=${PUBLIC_REALM}
ENV PUBLIC_API_BASE_URL=${PUBLIC_API_BASE_URL}

# By copying only the package.json and package-lock.json here, we ensure that the following `-deps` steps are independent of the source code.
# Therefore, the `-deps` steps will be skipped if only the source code changes.
COPY package.json package-lock.json ./

FROM base AS prod-deps
RUN npm install --omit=dev

FROM base AS build-deps
RUN npm install

FROM build-deps AS build
COPY . .
RUN npm run build

FROM base AS runtime
COPY --from=prod-deps /app/node_modules ./node_modules
# Copy built files
COPY --from=build /app/dist ./dist
# Copy storages JSON for static access
COPY --from=build /app/src/storages ./dist/client/storages
# Copy content directory for API access
COPY --from=build /app/src/content ./src/content

# Bind to all interfaces
ENV HOST=0.0.0.0
# Port to listen on
ENV PORT=4321
# Just convention, not required
EXPOSE 4321

ENTRYPOINT []
CMD ["node", "./dist/server/entry.mjs"]
