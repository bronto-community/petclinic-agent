FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY worker.py .

# OpenTelemetry zero-code instrumentation. The backend comes from the project's
# OTEL_EXPORTER_OTLP_ENDPOINT and OTEL_EXPORTER_OTLP_HEADERS environment variables.
# Daemons run only in production deployments; override the environment for local runs.
ENV OTEL_SERVICE_NAME=reminders \
    OTEL_RESOURCE_ATTRIBUTES=service.namespace=petclinic-agent,deployment.environment.name=production \
    OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf \
    OTEL_TRACES_EXPORTER=otlp \
    OTEL_LOGS_EXPORTER=otlp \
    OTEL_METRICS_EXPORTER=none \
    OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED=true \
    PYTHONUNBUFFERED=1

CMD ["opentelemetry-instrument", "python", "worker.py"]
