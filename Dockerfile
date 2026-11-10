# Multi-stage Dockerfile for BalanceVault Backend (Root Level)
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
COPY ledgerline/pom.xml .
COPY ledgerline/src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8085
ENV PORT=8085
ENTRYPOINT ["sh", "-c", "java -XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Xss512k -jar app.jar --server.port=${PORT:-8085}"]
