# Spring PetClinic REST, unchanged, plus the OpenTelemetry Java agent.
# The agent instruments Spring MVC, JDBC and Hibernate with no code changes,
# continues incoming W3C trace context and exports traces, metrics and logs over OTLP.
FROM springcommunity/spring-petclinic-rest:4.0.2

ARG OTEL_JAVA_AGENT_VERSION=2.32.0
ADD --chmod=644 https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/download/v${OTEL_JAVA_AGENT_VERSION}/opentelemetry-javaagent.jar /otel/opentelemetry-javaagent.jar

ENV JAVA_TOOL_OPTIONS="-javaagent:/otel/opentelemetry-javaagent.jar"
