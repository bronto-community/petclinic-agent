# A synthetic visitor: headless Chromium opening the chat page, so Web Analytics and
# Speed Insights record real page views and Web Vitals.
FROM mcr.microsoft.com/playwright:v1.56.1-noble
WORKDIR /app
RUN npm init -y >/dev/null && npm install --no-audit --no-fund playwright@1.56.1
COPY visit.mjs .
CMD ["node", "visit.mjs"]
