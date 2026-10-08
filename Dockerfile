# ==========================================
# 🏛️ BidWatch — GeM Tenders Backend Service
# ==========================================
FROM node:20-alpine

WORKDIR /app

# gem-tenders.js runs on native Node.js standard library (zero external dependencies)
COPY gem-tenders.js ./

# Volume for cache and log files
VOLUME ["/app"]

EXPOSE 7700

ENV PORT=7700 \
    NODE_ENV=production

CMD ["node", "gem-tenders.js"]
